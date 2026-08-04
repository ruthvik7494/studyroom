-- 0049_account_deletion_requests.sql
--
-- Adds a request-and-approve account deletion flow. A student/owner can
-- request deletion from their own dashboard; nothing is deleted until an
-- admin reviews and approves it from theirs.
--
-- IMPORTANT — why "approve" doesn't hard-delete anything:
-- profiles.id cascades from auth.users ("on delete cascade"), and
-- bookings.user_id / reviews.author_id both cascade from profiles.id too
-- ("on delete cascade" — see 0008_bookings.sql, 0003_directory.sql).
-- Deleting the auth user (or the profiles row) would silently wipe every
-- booking, payment and review tied to that account — including PAID
-- bookings other people (centre owners, other students on shared
-- resources) depend on for records, and directly contradicts the Privacy
-- Policy's own retention promise for booking/payment records.
--
-- So "approve" instead: blocks the login for good (account_status =
-- 'deleted', enforced the same way 'suspended' already is — see
-- lib/auth/rbac.ts), scrubs personal info (name/phone/avatar/bio/public
-- email) from the profile, and — for an owner — unpublishes their centres
-- (existing bookings/reviews at those centres are untouched). This is the
-- standard "erasure of personal data, retention of transactional records"
-- split most privacy laws actually call for.

alter table profiles
  drop constraint if exists profiles_account_status_check;
alter table profiles
  add constraint profiles_account_status_check check (account_status in ('active', 'suspended', 'deleted'));

create table if not exists public.account_deletion_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  reason        text,
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at  timestamptz not null default now(),
  reviewed_by   uuid references profiles(id),
  reviewed_at   timestamptz,
  review_notes  text
);

-- Only one open request per user at a time.
create unique index if not exists idx_deletion_request_one_pending
  on account_deletion_requests(user_id) where status = 'pending';
create index if not exists idx_deletion_request_status on account_deletion_requests(status, requested_at desc);

alter table public.account_deletion_requests enable row level security;

drop policy if exists "deletion request self insert" on account_deletion_requests;
create policy "deletion request self insert" on account_deletion_requests
  for insert with check (auth.uid() = user_id);

drop policy if exists "deletion request self select" on account_deletion_requests;
create policy "deletion request self select" on account_deletion_requests
  for select using (auth.uid() = user_id or auth_role() = 'admin');

drop policy if exists "deletion request self cancel" on account_deletion_requests;
create policy "deletion request self cancel" on account_deletion_requests
  for delete using (auth.uid() = user_id and status = 'pending');

-- Reviewing (approve/reject) goes through the security-definer functions
-- below, not a direct RLS update policy — same pattern as
-- admin_set_account_status in 0043, so the role check and audit log can't
-- be bypassed by calling .update() directly.

create or replace function admin_approve_account_deletion(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_admin uuid := auth.uid();
  v_role user_role;
  v_user_id uuid;
  v_status text;
  v_target_role user_role;
begin
  if v_admin is null then raise exception 'UNAUTHENTICATED' using errcode = '28000'; end if;
  select role into v_role from profiles where id = v_admin;
  if v_role <> 'admin' then raise exception 'FORBIDDEN' using errcode = '42501'; end if;

  select user_id, status into v_user_id, v_status from account_deletion_requests where id = p_request_id;
  if v_user_id is null then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if v_status <> 'pending' then raise exception 'ALREADY_REVIEWED' using errcode = 'P0001'; end if;

  select role into v_target_role from profiles where id = v_user_id;
  if v_target_role = 'owner' then
    update centres set is_published = false, status = 'archived' where owner_id = v_user_id;
  end if;

  update profiles set
    full_name = 'Deleted User',
    phone = null,
    avatar_url = null,
    bio = null,
    public_email = null,
    account_status = 'deleted'
  where id = v_user_id;

  update account_deletion_requests set
    status = 'approved', reviewed_by = v_admin, reviewed_at = now()
  where id = p_request_id;

  perform log_audit('account.deletion_approved', 'profile', v_user_id::text,
    jsonb_build_object('by', v_admin, 'request_id', p_request_id));
end; $$;

grant execute on function admin_approve_account_deletion(uuid) to authenticated;

create or replace function admin_reject_account_deletion(p_request_id uuid, p_notes text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_admin uuid := auth.uid();
  v_role user_role;
begin
  if v_admin is null then raise exception 'UNAUTHENTICATED' using errcode = '28000'; end if;
  select role into v_role from profiles where id = v_admin;
  if v_role <> 'admin' then raise exception 'FORBIDDEN' using errcode = '42501'; end if;

  update account_deletion_requests
  set status = 'rejected', reviewed_by = v_admin, reviewed_at = now(), review_notes = p_notes
  where id = p_request_id and status = 'pending';

  perform log_audit('account.deletion_rejected', 'profile', p_request_id::text,
    jsonb_build_object('by', v_admin, 'notes', p_notes));
end; $$;

grant execute on function admin_reject_account_deletion(uuid, text) to authenticated;
