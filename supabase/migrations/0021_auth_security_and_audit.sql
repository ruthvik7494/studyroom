-- 0021_auth_security_and_audit.sql
-- Milestone 1 (User Registration & Authentication) gap-fill. Additive only —
-- no existing table/column/function is removed or renamed.
--
-- Covers three checklist items that had no implementation at all:
--   1. Brute-force protection / account lockout (Security Review, Audit
--      Logging "Failed Login" + "Account Locked").
--   2. Auth events reaching the audit log at all — registration, login,
--      logout, password reset, email verification were not calling
--      log_audit() anywhere before this migration.
--   3. log_audit() was callable only via Postgres' implicit default grant to
--      PUBLIC (no explicit grant/revoke existed for it, unlike every other
--      SECURITY DEFINER function in this codebase). Made explicit and
--      intentional below, since auth events like a failed login necessarily
--      happen before a session exists.

-- 1. LOCKOUT COLUMNS ---------------------------------------------------------
alter table profiles add column if not exists failed_login_count int not null default 0;
alter table profiles add column if not exists locked_until timestamptz;

-- 2. EXPLICIT log_audit GRANTS ------------------------------------------------
grant execute on function log_audit(text, text, text, jsonb) to anon, authenticated;

-- 3. LOCKOUT FUNCTIONS --------------------------------------------------------

-- Pre-flight check, callable before a session exists (anon).
create or replace function is_account_locked(p_email text)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select p.locked_until > now()
       from profiles p join auth.users u on u.id = p.id
      where u.email = p_email),
    false
  );
$$;
revoke all on function is_account_locked(text) from public;
grant execute on function is_account_locked(text) to anon, authenticated;

-- Called after Supabase rejects a password sign-in. Locks the account for 15
-- minutes after 5 consecutive failures. Deliberately does not reveal whether
-- the email exists beyond what signInWithPassword's own error already does
-- (account-enumeration protection) — an unknown email is just logged, not
-- distinguished to the caller.
create or replace function record_login_failure(p_email text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_id     uuid;
  v_count  int;
  v_threshold constant int := 5;
  v_lock_minutes constant int := 15;
begin
  select u.id into v_id from auth.users u where u.email = p_email;
  if v_id is null then
    perform log_audit('auth.login_failed', 'auth', p_email, jsonb_build_object('reason', 'unknown_email'));
    return;
  end if;

  update profiles set failed_login_count = failed_login_count + 1
  where id = v_id
  returning failed_login_count into v_count;

  if v_count >= v_threshold then
    update profiles set locked_until = now() + (v_lock_minutes || ' minutes')::interval where id = v_id;
    perform log_audit('auth.account_locked', 'profile', v_id::text,
      jsonb_build_object('failed_attempts', v_count, 'locked_minutes', v_lock_minutes));
  else
    perform log_audit('auth.login_failed', 'profile', v_id::text,
      jsonb_build_object('failed_attempts', v_count));
  end if;
end;
$$;
revoke all on function record_login_failure(text) from public;
grant execute on function record_login_failure(text) to anon, authenticated;

-- Called after a successful sign-in (session now exists) to clear the counter.
create or replace function record_login_success()
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  update profiles set failed_login_count = 0, locked_until = null where id = auth.uid();
  perform log_audit('auth.login_success', 'profile', auth.uid()::text);
end;
$$;
revoke all on function record_login_success() from public;
grant execute on function record_login_success() to authenticated;

-- Support/admin override — a lockout with no unlock path just becomes a
-- 15-minute wait, but staff need to be able to clear it sooner (e.g. a
-- confirmed legitimate user who mistyped their password repeatedly).
create or replace function admin_unlock_account(p_user_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth_role() <> 'admin' then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  update profiles set failed_login_count = 0, locked_until = null where id = p_user_id;
  perform log_audit('admin.account_unlocked', 'profile', p_user_id::text);
end;
$$;
revoke all on function admin_unlock_account(uuid) from public;
grant execute on function admin_unlock_account(uuid) to authenticated;

-- 4. FREEZE THE NEW COLUMNS AGAINST SELF-UPDATE -------------------------------
-- "profiles self update" (fixed for recursion in 0014) lets a user update
-- their own row but freezes `role` via the non-recursive auth_role() helper.
-- RLS is row-level, not column-level: without the same treatment here, a user
-- could call `.from('profiles').update({ locked_until: null })` directly from
-- the browser (bypassing the app's server actions entirely) and clear their
-- own lockout. Two more non-recursive helpers, same pattern as auth_role().
create or replace function auth_failed_login_count() returns int
language sql stable security definer set search_path = public as $$
  select failed_login_count from profiles where id = auth.uid();
$$;

create or replace function auth_locked_until() returns timestamptz
language sql stable security definer set search_path = public as $$
  select locked_until from profiles where id = auth.uid();
$$;

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update
  using ( auth.uid() = id )
  with check (
    auth.uid() = id
    and role = auth_role()
    and failed_login_count = auth_failed_login_count()
    and locked_until is not distinct from auth_locked_until()
  );

-- 5. PROFILE-CREATION AUDIT ---------------------------------------------------
-- handle_new_user() (0001) already creates the profile row; it just never
-- logged the event. Re-defined here with one added line — everything else
-- unchanged.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, phone) values (new.id, new.raw_user_meta_data->>'full_name', new.phone);
  perform log_audit('profile.created', 'profile', new.id::text, jsonb_build_object('email', new.email));
  return new;
end; $$;
