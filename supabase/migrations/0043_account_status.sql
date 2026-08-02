-- 0043_account_status.sql
--
-- profiles had no account-status concept at all — "suspend a user" wasn't
-- possible even in principle. This adds a real, enforced status: a
-- suspended user is actually blocked at the session-check level (see
-- lib/auth/rbac.ts), not just labelled differently in the UI.

alter table profiles add column if not exists account_status text not null default 'active'
  check (account_status in ('active', 'suspended'));
create index if not exists idx_profiles_account_status on profiles (account_status);

create or replace function admin_set_account_status(p_user_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_admin uuid := auth.uid();
  v_role user_role;
begin
  if v_admin is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  select role into v_role from profiles where id = v_admin;
  if v_role <> 'admin' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_status not in ('active', 'suspended') then raise exception 'VALIDATION' using errcode='P0001'; end if;

  update profiles set account_status = p_status where id = p_user_id;
  perform log_audit('user.account_status_changed', 'profile', p_user_id::text,
    jsonb_build_object('by', v_admin, 'status', p_status));
end; $$;

grant execute on function admin_set_account_status(uuid, text) to authenticated;
