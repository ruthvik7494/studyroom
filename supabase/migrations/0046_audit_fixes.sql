-- 0046_audit_fixes.sql
-- See accompanying audit report for full findings/reasoning. This migration
-- contains only the fixes that are unambiguous and carry no risk to existing
-- data or behavior: adding columns/indexes/triggers, and loosening two
-- overly-strict FK delete behaviors. Nothing here changes what any existing
-- row means or how any current feature works.

-- ---------------------------------------------------------------------------
-- 1. Missing updated_at on high-churn tables (bookings/centres/profiles/
--    resources/refunds/notifications never had one; reviews already got one
--    in 0044). Booking status changes multiple times over its lifecycle
--    (pending -> confirmed -> checked_in -> completed, or -> cancelled/
--    refunded) with no single "when did this last change" column — the
--    per-purpose timestamps (cancelled_at, checked_in_at, completed_at)
--    cover *some* transitions but not all (e.g. a plain status flip has no
--    timestamp at all currently).
-- ---------------------------------------------------------------------------
alter table bookings      add column if not exists updated_at timestamptz not null default now();
alter table centres       add column if not exists updated_at timestamptz not null default now();
alter table profiles      add column if not exists updated_at timestamptz not null default now();
alter table resources     add column if not exists updated_at timestamptz not null default now();
alter table refunds       add column if not exists updated_at timestamptz not null default now();
alter table notifications add column if not exists updated_at timestamptz not null default now();

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_bookings_updated_at on bookings;
create trigger trg_bookings_updated_at before update on bookings
  for each row execute function set_updated_at();

drop trigger if exists trg_centres_updated_at on centres;
create trigger trg_centres_updated_at before update on centres
  for each row execute function set_updated_at();

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

drop trigger if exists trg_resources_updated_at on resources;
create trigger trg_resources_updated_at before update on resources
  for each row execute function set_updated_at();

drop trigger if exists trg_refunds_updated_at on refunds;
create trigger trg_refunds_updated_at before update on refunds
  for each row execute function set_updated_at();

drop trigger if exists trg_notifications_updated_at on notifications;
create trigger trg_notifications_updated_at before update on notifications
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Two foreign keys had no ON DELETE behavior at all, defaulting to
--    NO ACTION (equivalent to RESTRICT). refunds.requested_by references
--    profiles(id) with no clause — if a user account is ever deleted (e.g.
--    a GDPR-style deletion request), that delete would fail outright if the
--    user had ever requested a refund, with a confusing FK-violation error
--    instead of a clean deletion. Same issue for
--    waitlist_entries.promoted_booking_id against bookings(id).
--    Fix: SET NULL — the refund/waitlist record (needed for financial and
--    operational history) survives; only the dangling reference is cleared.
-- ---------------------------------------------------------------------------
alter table refunds drop constraint if exists refunds_requested_by_fkey;
alter table refunds add constraint refunds_requested_by_fkey
  foreign key (requested_by) references profiles(id) on delete set null;

alter table waitlist_entries drop constraint if exists waitlist_entries_promoted_booking_id_fkey;
alter table waitlist_entries add constraint waitlist_entries_promoted_booking_id_fkey
  foreign key (promoted_booking_id) references bookings(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 3. Missing indexes on frequently-filtered user_id columns. saved_listings
--    and waitlist_entries are both queried by user_id on every "my saved
--    centres" / "am I on this waitlist" check, with no supporting index —
--    small tables today, but a sequential scan that grows linearly with
--    total users rather than that one user's rows.
-- ---------------------------------------------------------------------------
create index if not exists idx_saved_listings_user on saved_listings (user_id, created_at desc);
create index if not exists idx_waitlist_entries_user on waitlist_entries (user_id, status);
