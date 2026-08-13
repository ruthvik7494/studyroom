-- === 0001_foundation.sql ===
-- ============================================================================
-- 0001_foundation.sql — roles, profiles, RBAC primitives, auth trigger.
-- ============================================================================
create extension if not exists "pgcrypto";

-- ---- roles (RBAC single source of truth) ----
create type user_role as enum ('student', 'owner', 'admin');

create table profiles (
  id         uuid primary key references auth.users on delete cascade,
  full_name  text,
  phone      text unique,
  role       user_role not null default 'student',
  exam       text,
  home_area  text,
  avatar_url text,
  created_at timestamptz not null default now()
);
create index idx_profiles_role on profiles (role);

alter table profiles enable row level security;

-- read/update own profile; admins read all
create policy "profiles self read"   on profiles for select using (auth.uid() = id);
create policy "profiles admin read"  on profiles for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "profiles self update" on profiles for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from profiles where id = auth.uid())); -- cannot self-escalate role

-- SECURITY DEFINER helper so RLS policies can check role without recursion
create or replace function auth_role() returns user_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

-- auto-create a profile on signup
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, phone) values (new.id, new.raw_user_meta_data->>'full_name', new.phone);
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();


-- === 0002_centres.sql ===
-- ============================================================================
-- 0002_centres.sql — centres + resources. Tuned for large-dataset discovery:
-- keyset-pagination indexes, trigram search, geo index, RBAC-aware RLS.
-- ============================================================================
create type space_type    as enum ('study_hall', 'reading_room', 'coworking', 'both');
create type resource_type as enum ('seat', 'meeting_room', 'conference_room', 'cabin');
create type seat_tier     as enum ('open', 'ac', 'premium');

create extension if not exists pg_trgm;      -- fuzzy name/area search
create extension if not exists cube;
create extension if not exists earthdistance; -- radius / "near me" queries

create table centres (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid references profiles(id) on delete set null,
  name                text not null,
  slug                text not null unique,
  space_type          space_type not null default 'study_hall',
  area                text,
  address             text,
  lat                 double precision,
  lng                 double precision,
  capacity            int not null default 0 check (capacity >= 0),
  cover_url           text,
  emoji               text not null default '📖',
  rating              numeric(2,1) not null default 0 check (rating between 0 and 5),
  reviews_count       int not null default 0,
  is_verified         boolean not null default false,
  women_safe_verified boolean not null default false,
  is_published        boolean not null default false,
  created_at          timestamptz not null default now()
);

-- Indexes for scale --------------------------------------------------------
-- Keyset pagination (published discovery feed ordered by rating desc, id):
create index idx_centres_feed on centres (is_published, rating desc, id desc) where is_published;
create index idx_centres_area on centres (area) where is_published;
create index idx_centres_space_type on centres (space_type) where is_published;
create index idx_centres_owner on centres (owner_id);
-- Fuzzy search on name + area:
create index idx_centres_name_trgm on centres using gin (name gin_trgm_ops);
create index idx_centres_area_trgm on centres using gin (area gin_trgm_ops);
-- Geo "near me":
create index idx_centres_geo on centres using gist (ll_to_earth(lat, lng)) where lat is not null;

create table resources (
  id            uuid primary key default gen_random_uuid(),
  centre_id     uuid not null references centres(id) on delete cascade,
  resource_type resource_type not null,
  tier          seat_tier,
  label         text not null,
  unit_count    int not null default 1 check (unit_count >= 0),
  pricing       jsonb not null default '{}'::jsonb,
  is_active     boolean not null default true
);
create index idx_resources_centre on resources (centre_id) where is_active;

-- RLS ----------------------------------------------------------------------
alter table centres   enable row level security;
alter table resources enable row level security;

-- Public reads published centres; owners see their own drafts; admins see all.
create policy "centres public read" on centres for select using (
  is_published or owner_id = auth.uid() or auth_role() = 'admin'
);
-- Only owners (of the row) or admins may write.
create policy "centres owner insert" on centres for insert with check (
  owner_id = auth.uid() and auth_role() in ('owner', 'admin')
);
create policy "centres owner update" on centres for update using (
  owner_id = auth.uid() or auth_role() = 'admin'
);
create policy "centres owner delete" on centres for delete using (
  owner_id = auth.uid() or auth_role() = 'admin'
);

create policy "resources public read" on resources for select using (
  exists (select 1 from centres c where c.id = resources.centre_id and (c.is_published or c.owner_id = auth.uid() or auth_role() = 'admin'))
);
create policy "resources owner write" on resources for all using (
  exists (select 1 from centres c where c.id = resources.centre_id and (c.owner_id = auth.uid() or auth_role() = 'admin'))
) with check (
  exists (select 1 from centres c where c.id = resources.centre_id and (c.owner_id = auth.uid() or auth_role() = 'admin'))
);


-- === 0003_directory.sql ===
-- ============================================================================
-- 0003_directory.sql — production directory layer for StudyNook.
--
-- Adds the listing lifecycle + moderation, taxonomy (categories/locations),
-- enquiries, reviews + reports, claims, saves, featured, notifications,
-- audit logs, onboarding, and email logs. Full RLS with RBAC, indexes for
-- large-dataset access, and sync/audit triggers.
--
-- Depends on 0001 (profiles, user_role, auth_role()) and 0002 (centres, resources).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. LISTING LIFECYCLE + MODERATION on centres
-- ---------------------------------------------------------------------------
create type listing_status as enum
  ('draft', 'pending_review', 'approved', 'rejected', 'suspended', 'archived');

alter table centres
  add column status          listing_status not null default 'draft',
  add column rejection_reason text,
  add column admin_notes      text,
  add column reviewed_by       uuid references profiles(id) on delete set null,
  add column reviewed_at       timestamptz,
  add column updated_at        timestamptz not null default now();

-- Keep the 0002 `is_published` flag (and its RLS/indexes) authoritative and in
-- sync with status: published iff approved. One trigger, single source of truth.
create or replace function sync_centre_published() returns trigger
  language plpgsql as $$
begin
  new.is_published := (new.status = 'approved');
  new.updated_at := now();
  return new;
end; $$;
create trigger trg_centre_published
  before insert or update of status on centres
  for each row execute function sync_centre_published();

create index idx_centres_status on centres (status);
create index idx_centres_pending on centres (created_at) where status = 'pending_review';

-- ---------------------------------------------------------------------------
-- 2. TAXONOMY — categories & locations (SEO landing pages)
-- ---------------------------------------------------------------------------
create table categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  sort_order  int not null default 0
);

create table locations (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,      -- e.g. "Hanamkonda"
  city        text not null default 'Warangal',
  lat         double precision,
  lng         double precision
);

create table listing_categories (
  centre_id   uuid not null references centres(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  primary key (centre_id, category_id)
);
create index idx_listing_categories_cat on listing_categories (category_id);

alter table centres add column location_id uuid references locations(id) on delete set null;
create index idx_centres_location on centres (location_id) where is_published;

-- ---------------------------------------------------------------------------
-- 3. LISTING IMAGES (Supabase Storage references)
-- ---------------------------------------------------------------------------
create table listing_images (
  id          uuid primary key default gen_random_uuid(),
  centre_id   uuid not null references centres(id) on delete cascade,
  storage_path text not null,           -- path in the private/public bucket
  alt         text,
  is_cover    boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index idx_listing_images_centre on listing_images (centre_id, sort_order);
-- at most one cover per centre
create unique index uq_listing_cover on listing_images (centre_id) where is_cover;

-- ---------------------------------------------------------------------------
-- 4. ENQUIRIES (contact a centre)
-- ---------------------------------------------------------------------------
create type enquiry_status as enum ('new', 'read', 'responded', 'closed', 'spam');

create table enquiries (
  id          uuid primary key default gen_random_uuid(),
  centre_id   uuid not null references centres(id) on delete cascade,
  sender_id   uuid references profiles(id) on delete set null,  -- null = guest
  name        text not null,
  email       text not null,
  phone       text,
  message     text not null,
  status      enquiry_status not null default 'new',
  created_at  timestamptz not null default now()
);
create index idx_enquiries_centre on enquiries (centre_id, created_at desc);
-- basic duplicate/rate guard: same sender+centre within a short window handled in app;
-- unique guard against exact duplicate spam:
create index idx_enquiries_dedupe on enquiries (centre_id, email, md5(message));

-- ---------------------------------------------------------------------------
-- 5. REVIEWS + REPORTS (moderated)
-- ---------------------------------------------------------------------------
create type review_status as enum ('published', 'pending', 'removed');

create table reviews (
  id          uuid primary key default gen_random_uuid(),
  centre_id   uuid not null references centres(id) on delete cascade,
  author_id   uuid not null references profiles(id) on delete cascade,
  rating      int not null check (rating between 1 and 5),
  body        text,
  is_verified boolean not null default false,   -- true when backed by a check-in
  status      review_status not null default 'published',
  created_at  timestamptz not null default now(),
  unique (centre_id, author_id)                 -- one review per user per centre
);
create index idx_reviews_centre on reviews (centre_id, status, created_at desc);

create table review_reports (
  id          uuid primary key default gen_random_uuid(),
  review_id   uuid not null references reviews(id) on delete cascade,
  reporter_id uuid references profiles(id) on delete set null,
  reason      text not null,
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index idx_review_reports_open on review_reports (created_at) where not resolved;

-- Prevent owners reviewing their own centre (charter rule).
create or replace function block_self_review() returns trigger
  language plpgsql as $$
begin
  if exists (select 1 from centres c where c.id = new.centre_id and c.owner_id = new.author_id) then
    raise exception 'OWNER_CANNOT_REVIEW';
  end if;
  return new;
end; $$;
create trigger trg_block_self_review before insert on reviews
  for each row execute function block_self_review();

-- ---------------------------------------------------------------------------
-- 6. CLAIMS — claim an existing (unowned) listing
-- ---------------------------------------------------------------------------
create type claim_status as enum ('pending', 'approved', 'rejected');

create table listing_claims (
  id          uuid primary key default gen_random_uuid(),
  centre_id   uuid not null references centres(id) on delete cascade,
  claimant_id uuid not null references profiles(id) on delete cascade,
  evidence    text,
  status      claim_status not null default 'pending',
  reviewed_by uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (centre_id, claimant_id)
);
create index idx_claims_open on listing_claims (created_at) where status = 'pending';

-- ---------------------------------------------------------------------------
-- 7. SAVED + FEATURED
-- ---------------------------------------------------------------------------
create table saved_listings (
  user_id    uuid not null references profiles(id) on delete cascade,
  centre_id  uuid not null references centres(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, centre_id)
);

create table featured_listings (
  centre_id  uuid primary key references centres(id) on delete cascade,
  starts_at  timestamptz not null default now(),
  ends_at    timestamptz,
  created_by uuid references profiles(id) on delete set null
);
create index idx_featured_active on featured_listings (ends_at);

-- ---------------------------------------------------------------------------
-- 8. NOTIFICATIONS
-- ---------------------------------------------------------------------------
create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  kind       text not null,
  title      text not null,
  body       text,
  url        text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index idx_notifications_user on notifications (user_id, created_at desc);
create index idx_notifications_unread on notifications (user_id) where read_at is null;

-- ---------------------------------------------------------------------------
-- 9. AUDIT LOGS (admin + security-sensitive actions)
-- ---------------------------------------------------------------------------
create table audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid references profiles(id) on delete set null,
  action      text not null,               -- e.g. 'centre.approve'
  entity_type text not null,
  entity_id   text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index idx_audit_entity on audit_logs (entity_type, entity_id);
create index idx_audit_actor on audit_logs (actor_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 10. ONBOARDING + EMAIL LOGS
-- ---------------------------------------------------------------------------
create table onboarding_progress (
  user_id     uuid primary key references profiles(id) on delete cascade,
  step        text not null default 'role',
  completed   boolean not null default false,
  updated_at  timestamptz not null default now()
);

create table email_logs (
  id          uuid primary key default gen_random_uuid(),
  to_email    text not null,
  template    text not null,
  status      text not null default 'queued',  -- queued / sent / failed
  provider_id text,
  error       text,
  created_at  timestamptz not null default now()
);
create index idx_email_logs_status on email_logs (status, created_at desc);

-- ============================================================================
-- RLS
-- ============================================================================
alter table categories         enable row level security;
alter table locations          enable row level security;
alter table listing_categories enable row level security;
alter table listing_images     enable row level security;
alter table enquiries          enable row level security;
alter table reviews            enable row level security;
alter table review_reports     enable row level security;
alter table listing_claims     enable row level security;
alter table saved_listings     enable row level security;
alter table featured_listings  enable row level security;
alter table notifications      enable row level security;
alter table audit_logs         enable row level security;
alter table onboarding_progress enable row level security;
alter table email_logs         enable row level security;

-- taxonomy: world-readable, admin-writable
create policy "categories read" on categories for select using (true);
create policy "categories admin" on categories for all using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy "locations read" on locations for select using (true);
create policy "locations admin" on locations for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- listing_categories: readable with the centre; writable by owner/admin
create policy "lc read" on listing_categories for select using (true);
create policy "lc write" on listing_categories for all using (
  exists (select 1 from centres c where c.id = listing_categories.centre_id and (c.owner_id = auth.uid() or auth_role() = 'admin'))
) with check (
  exists (select 1 from centres c where c.id = listing_categories.centre_id and (c.owner_id = auth.uid() or auth_role() = 'admin'))
);

-- images: public read for published centres; owner/admin manage
create policy "images read" on listing_images for select using (
  exists (select 1 from centres c where c.id = listing_images.centre_id and (c.is_published or c.owner_id = auth.uid() or auth_role() = 'admin'))
);
create policy "images write" on listing_images for all using (
  exists (select 1 from centres c where c.id = listing_images.centre_id and (c.owner_id = auth.uid() or auth_role() = 'admin'))
) with check (
  exists (select 1 from centres c where c.id = listing_images.centre_id and (c.owner_id = auth.uid() or auth_role() = 'admin'))
);

-- enquiries: sender or centre owner or admin can read; anyone may create (guest allowed)
create policy "enquiries read" on enquiries for select using (
  sender_id = auth.uid()
  or exists (select 1 from centres c where c.id = enquiries.centre_id and c.owner_id = auth.uid())
  or auth_role() = 'admin'
);
create policy "enquiries insert" on enquiries for insert with check (
  sender_id = auth.uid() or sender_id is null
);
create policy "enquiries owner update" on enquiries for update using (
  exists (select 1 from centres c where c.id = enquiries.centre_id and c.owner_id = auth.uid()) or auth_role() = 'admin'
);

-- reviews: published are public; author sees own; owner/admin moderate
create policy "reviews public read" on reviews for select using (
  status = 'published' or author_id = auth.uid() or auth_role() = 'admin'
);
create policy "reviews author insert" on reviews for insert with check (author_id = auth.uid());
create policy "reviews author update" on reviews for update using (author_id = auth.uid());
create policy "reviews admin moderate" on reviews for update using (auth_role() = 'admin');

create policy "reports insert" on review_reports for insert with check (reporter_id = auth.uid() or reporter_id is null);
create policy "reports admin read" on review_reports for select using (auth_role() = 'admin');
create policy "reports admin update" on review_reports for update using (auth_role() = 'admin');

-- claims: claimant sees own; admin sees all; claimant creates
create policy "claims own read" on listing_claims for select using (claimant_id = auth.uid() or auth_role() = 'admin');
create policy "claims insert" on listing_claims for insert with check (claimant_id = auth.uid());
create policy "claims admin update" on listing_claims for update using (auth_role() = 'admin');

-- saved: strictly self
create policy "saved self" on saved_listings for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- featured: public read; admin write
create policy "featured read" on featured_listings for select using (true);
create policy "featured admin" on featured_listings for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- notifications: self read/update
create policy "notif self" on notifications for select using (user_id = auth.uid());
create policy "notif self update" on notifications for update using (user_id = auth.uid());

-- audit: admin-only read (writes go through service role / SECURITY DEFINER)
create policy "audit admin read" on audit_logs for select using (auth_role() = 'admin');

-- onboarding: self
create policy "onboarding self" on onboarding_progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- email_logs: admin-only
create policy "email logs admin" on email_logs for select using (auth_role() = 'admin');

-- ============================================================================
-- Helper: append an audit entry (SECURITY DEFINER so app code can log safely)
-- ============================================================================
create or replace function log_audit(p_action text, p_entity_type text, p_entity_id text, p_metadata jsonb default '{}'::jsonb)
  returns void language sql security definer set search_path = public as $$
  insert into audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
$$;

-- ============================================================================
-- Seed baseline taxonomy for Warangal
-- ============================================================================
insert into categories (slug, name, sort_order) values
  ('study-hall', 'Study Halls', 1),
  ('reading-room', 'Reading Rooms', 2),
  ('coworking', 'Coworking Spaces', 3),
  ('24-7', '24/7 Spaces', 4),
  ('women-safe', 'Women-Safe Spaces', 5)
on conflict (slug) do nothing;

insert into locations (slug, name, city, lat, lng) values
  ('hanamkonda', 'Hanamkonda', 'Warangal', 18.0009, 79.5587),
  ('kazipet', 'Kazipet', 'Warangal', 17.9785, 79.5325),
  ('warangal-city', 'Warangal City', 'Warangal', 17.9689, 79.5941)
on conflict (slug) do nothing;


-- === 0004_occupancy.sql ===
-- ============================================================================
-- 0004_occupancy.sql — real live-occupancy backbone.
--
-- The discovery feed and detail page surface "seats free / status". That must be
-- derived from real check-ins, never mocked. This adds a minimal check_ins table
-- (also the foundation for bookings, streaks and verified reviews later) and a
-- view that computes today's occupancy per centre. With no check-ins yet, a
-- centre truthfully reports all seats free.
-- ============================================================================

create table check_ins (
  id             uuid primary key default gen_random_uuid(),
  centre_id      uuid not null references centres(id) on delete cascade,
  user_id        uuid not null references profiles(id) on delete cascade,
  checked_in_at  timestamptz not null default now(),
  checked_out_at timestamptz
);
-- Fast "who is inside centre X today" — partial index on open check-ins.
create index idx_checkins_open on check_ins (centre_id) where checked_out_at is null;
create index idx_checkins_user on check_ins (user_id, checked_in_at desc);

alter table check_ins enable row level security;
create policy "checkins self"       on check_ins for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "checkins owner read" on check_ins for select using (
  exists (select 1 from centres c where c.id = check_ins.centre_id and (c.owner_id = auth.uid() or auth_role() = 'admin'))
);

-- Live occupancy per centre (today).
--
-- NOTE (reviewed): this view intentionally runs with DEFINER semantics (the
-- default — security_invoker is NOT set) so it can aggregate over check_ins for
-- anonymous discovery users. Only AGGREGATE columns (inside_now, seats_free,
-- status) are exposed; individual check_ins rows stay protected by their own RLS
-- for any direct query. Using security_invoker=on here would make every public
-- visitor see 0 check-ins and mis-report occupancy.
create or replace view centre_live_occupancy as
select
  c.id as centre_id,
  c.capacity,
  count(ci.id) filter (where ci.checked_out_at is null) as inside_now,
  greatest(c.capacity - count(ci.id) filter (where ci.checked_out_at is null), 0) as seats_free,
  case when c.capacity > 0
       then round(100.0 * count(ci.id) filter (where ci.checked_out_at is null) / c.capacity)
       else 0 end as occ_pct,
  case
    when c.capacity = 0 then 'unknown'
    when count(ci.id) filter (where ci.checked_out_at is null) >= c.capacity then 'full'
    when count(ci.id) filter (where ci.checked_out_at is null)::numeric / c.capacity >= 0.7 then 'filling'
    else 'open'
  end as status
from centres c
left join check_ins ci
  on ci.centre_id = c.id
  and ci.checked_in_at::date = current_date
group by c.id, c.capacity;

-- expose the aggregate view to public + signed-in roles
grant select on centre_live_occupancy to anon, authenticated;


-- === 0005_storage.sql ===
-- ============================================================================
-- 0005_storage.sql — Supabase Storage bucket for listing images + policies.
--
-- Public-read bucket (images are shown on public listings) but writes are
-- restricted: a user may only write under a path prefixed with a centre id they
-- own. Path convention: `<centre_id>/<filename>`.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

-- Public read
create policy "listing images public read"
  on storage.objects for select
  using (bucket_id = 'listing-images');

-- Owner (or admin) may upload under a centre folder they control.
-- The first path segment must be a centre id owned by the caller.
create policy "listing images owner write"
  on storage.objects for insert
  with check (
    bucket_id = 'listing-images'
    and exists (
      select 1 from centres c
      where c.id::text = (storage.foldername(name))[1]
        and (c.owner_id = auth.uid() or auth_role() = 'admin')
    )
  );

create policy "listing images owner update"
  on storage.objects for update
  using (
    bucket_id = 'listing-images'
    and exists (
      select 1 from centres c
      where c.id::text = (storage.foldername(name))[1]
        and (c.owner_id = auth.uid() or auth_role() = 'admin')
    )
  );

create policy "listing images owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'listing-images'
    and exists (
      select 1 from centres c
      where c.id::text = (storage.foldername(name))[1]
        and (c.owner_id = auth.uid() or auth_role() = 'admin')
    )
  );


-- === 0006_claims_fn.sql ===
-- ============================================================================
-- 0006_claims_fn.sql — atomic claim approval.
--
-- Approving a claim is a multi-table write (mark the claim approved AND transfer
-- listing ownership). The charter requires transactions for multi-table saves,
-- so this is one SECURITY DEFINER function: both updates commit together or not
-- at all. Admin-gated internally so it can't be called by non-admins even if the
-- RPC is reached directly.
-- ============================================================================
create or replace function approve_claim(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_centre  uuid;
  v_claimant uuid;
begin
  -- authorize: only admins may approve claims
  if auth_role() <> 'admin' then
    raise exception 'FORBIDDEN';
  end if;

  select centre_id, claimant_id into v_centre, v_claimant
  from listing_claims where id = p_claim_id and status = 'pending';

  if v_centre is null then
    raise exception 'CLAIM_NOT_PENDING';
  end if;

  -- both writes in one transaction (the function body)
  update listing_claims
     set status = 'approved', reviewed_by = auth.uid()
   where id = p_claim_id;

  update centres
     set owner_id = v_claimant
   where id = v_centre;

  -- reject any other pending claims on the same centre
  update listing_claims
     set status = 'rejected', reviewed_by = auth.uid()
   where centre_id = v_centre and id <> p_claim_id and status = 'pending';

  insert into audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'claim.approve', 'listing_claim', p_claim_id::text,
          jsonb_build_object('centre_id', v_centre, 'new_owner', v_claimant));
end;
$$;


-- === 0007_onboarding.sql ===
-- ============================================================================
-- 0007_onboarding.sql — safe role selection at onboarding.
--
-- profiles RLS deliberately forbids a user changing their own `role`
-- (anti-escalation). Onboarding still needs the user to pick student vs owner.
-- This SECURITY DEFINER function allows exactly that — student OR owner, never
-- admin — and marks onboarding complete. It refuses to touch an existing admin.
-- ============================================================================
create or replace function choose_role(p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_role not in ('student', 'owner') then
    raise exception 'INVALID_ROLE';
  end if;

  -- never downgrade/alter an admin via this path
  if (select role from profiles where id = auth.uid()) = 'admin' then
    raise exception 'FORBIDDEN';
  end if;

  update profiles set role = p_role::user_role where id = auth.uid();

  insert into onboarding_progress (user_id, step, completed)
  values (auth.uid(), 'done', true)
  on conflict (user_id) do update set step = 'done', completed = true, updated_at = now();
end;
$$;


-- === 0008_bookings.sql ===
-- ============================================================================
-- 0008_bookings.sql — seat/resource bookings.
--
-- A booking reserves a resource at a centre for a period (hour/day/month).
-- Students see/manage their own; centre owners see bookings at their centres;
-- admins see all. Payment status is tracked but capture is out of scope here
-- (Razorpay wiring lives in the payments feature).
-- ============================================================================
create type booking_period as enum ('hour', 'day', 'month');
create type booking_status as enum ('pending', 'confirmed', 'cancelled', 'completed');
create type payment_status as enum ('unpaid', 'paid', 'refunded');

create table bookings (
  id           uuid primary key default gen_random_uuid(),
  centre_id    uuid not null references centres(id) on delete cascade,
  resource_id  uuid not null references resources(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  period       booking_period not null,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  amount       numeric(10,2) not null default 0 check (amount >= 0),
  status       booking_status not null default 'pending',
  payment      payment_status not null default 'unpaid',
  created_at   timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index idx_bookings_user   on bookings (user_id, starts_at desc);
create index idx_bookings_centre on bookings (centre_id, starts_at desc);
create index idx_bookings_active on bookings (resource_id, starts_at) where status in ('pending', 'confirmed');

alter table bookings enable row level security;

-- Student manages own; owner reads bookings at their centres; admin all.
create policy "bookings own read" on bookings for select using (
  user_id = auth.uid()
  or exists (select 1 from centres c where c.id = bookings.centre_id and c.owner_id = auth.uid())
  or auth_role() = 'admin'
);
create policy "bookings own insert" on bookings for insert with check (user_id = auth.uid());
create policy "bookings own update" on bookings for update using (
  user_id = auth.uid()
  or exists (select 1 from centres c where c.id = bookings.centre_id and c.owner_id = auth.uid())
  or auth_role() = 'admin'
);


-- === 0009_payments.sql ===
-- ============================================================================
-- 0009_payments.sql — Razorpay payment references + webhook idempotency.
-- ============================================================================
alter table bookings
  add column razorpay_order_id   text,
  add column razorpay_payment_id text;

create index idx_bookings_rzp_order on bookings (razorpay_order_id) where razorpay_order_id is not null;

-- Idempotency ledger: a Razorpay webhook may be delivered more than once.
-- We record each processed event id so re-deliveries are no-ops.
create table webhook_events (
  id          text primary key,          -- razorpay event id / signature digest
  provider    text not null default 'razorpay',
  processed_at timestamptz not null default now()
);
alter table webhook_events enable row level security;
-- No policies → only the service-role client (webhook handler) can touch it.


-- === 0010_booking_capacity_guard.sql ===
-- 0010_booking_capacity_guard.sql
-- FINDING (audit Phase 4): booking inserts had no capacity/double-booking guard —
-- two concurrent requests could both succeed and oversell a resource.
-- FIX: enforce capacity atomically in the database (the only correct place for
-- concurrency safety). A SECURITY DEFINER function locks the resource row, counts
-- overlapping active bookings, and rejects if the resource is full. The app calls
-- this instead of a raw INSERT.

create or replace function book_seat(
  p_centre_id  uuid,
  p_resource_id uuid,
  p_period     booking_period,
  p_starts_at  timestamptz,
  p_ends_at    timestamptz,
  p_amount     numeric
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_units  int;
  v_taken  int;
  v_id     uuid;
begin
  if v_user is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;

  -- Lock the resource row so concurrent bookings serialize on it.
  select unit_count into v_units
  from resources
  where id = p_resource_id and centre_id = p_centre_id and is_active = true
  for update;

  if v_units is null then
    raise exception 'RESOURCE_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Count overlapping active bookings for this resource.
  select count(*) into v_taken
  from bookings
  where resource_id = p_resource_id
    and status in ('pending','confirmed')
    and tstzrange(starts_at, ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)');

  if v_taken >= v_units then
    raise exception 'RESOURCE_FULL' using errcode = 'P0001';
  end if;

  insert into bookings (centre_id, resource_id, user_id, period, starts_at, ends_at, amount, status, payment)
  values (p_centre_id, p_resource_id, v_user, p_period, p_starts_at, p_ends_at, p_amount, 'pending', 'unpaid')
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function book_seat(uuid,uuid,booking_period,timestamptz,timestamptz,numeric) from public;
grant execute on function book_seat(uuid,uuid,booking_period,timestamptz,timestamptz,numeric) to authenticated;

-- Supporting index for the overlap count.
create index if not exists idx_bookings_overlap
  on bookings (resource_id, starts_at, ends_at) where status in ('pending','confirmed');


-- === 0011_booking_lifecycle.sql ===
-- 0011_booking_lifecycle.sql
-- Extends the booking engine to the full lifecycle. Additive only — no existing
-- table/column/function is removed. Follows existing patterns: enum lookups,
-- SECURITY DEFINER functions for atomic multi-row ops, audit via log_audit,
-- notifications rows, RLS on every new table.

-- 1. LIFECYCLE STATUSES ------------------------------------------------------
-- Extend booking_status with the new lifecycle states (Postgres enums are
-- append-only, which is exactly what we want — no rewrite of existing values).
alter type booking_status add value if not exists 'checked_in';
alter type booking_status add value if not exists 'no_show';
alter type booking_status add value if not exists 'expired';
alter type booking_status add value if not exists 'refunded';

-- payment_status gains partial-refund + processing states.
alter type payment_status add value if not exists 'refund_pending';
alter type payment_status add value if not exists 'partially_refunded';

-- 2. BOOKING COLUMNS ---------------------------------------------------------
alter table bookings add column if not exists cancelled_at    timestamptz;
alter table bookings add column if not exists cancelled_by    uuid references profiles(id);
alter table bookings add column if not exists cancel_reason   text;
alter table bookings add column if not exists checked_in_at   timestamptz;
alter table bookings add column if not exists completed_at    timestamptz;
alter table bookings add column if not exists rescheduled_from uuid references bookings(id);
alter table bookings add column if not exists expires_at      timestamptz; -- pending hold expiry

-- 3. REFUNDS -----------------------------------------------------------------
create table if not exists refunds (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references bookings(id) on delete cascade,
  amount        numeric(12,2) not null check (amount >= 0),
  reason        text,
  status        text not null default 'pending', -- pending|processing|succeeded|failed
  is_partial    boolean not null default false,
  razorpay_refund_id text,
  requested_by  uuid references profiles(id),
  processed_at  timestamptz,
  created_at    timestamptz not null default now(),
  -- Prevent duplicate refunds: at most one non-failed refund per booking.
  constraint uq_refund_active unique (booking_id, razorpay_refund_id)
);
create index if not exists idx_refunds_booking on refunds (booking_id, status);
create index if not exists idx_refunds_status  on refunds (status, created_at desc);

-- 4. WAITLIST ----------------------------------------------------------------
create table if not exists waitlist_entries (
  id           uuid primary key default gen_random_uuid(),
  resource_id  uuid not null references resources(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  period       booking_period not null,
  status       text not null default 'waiting', -- waiting|promoted|expired|cancelled
  promoted_booking_id uuid references bookings(id),
  expires_at   timestamptz,
  created_at   timestamptz not null default now(),
  constraint uq_waitlist_active unique (resource_id, user_id, status)
);
create index if not exists idx_waitlist_queue on waitlist_entries (resource_id, status, created_at);

-- 5. BOOKING RULES (per centre) ---------------------------------------------
create table if not exists booking_rules (
  centre_id        uuid primary key references centres(id) on delete cascade,
  opening_time     time not null default '06:00',
  closing_time     time not null default '23:00',
  blocked_dates    date[] not null default '{}',
  max_advance_days int not null default 30 check (max_advance_days > 0),
  min_duration_min int not null default 60 check (min_duration_min > 0),
  max_duration_min int not null default 43200,
  cancel_cutoff_hours int not null default 12 check (cancel_cutoff_hours >= 0),
  grace_period_min int not null default 30 check (grace_period_min >= 0),
  hold_minutes     int not null default 15 check (hold_minutes > 0), -- pending expiry
  updated_at       timestamptz not null default now()
);

-- 6. ATOMIC LIFECYCLE FUNCTIONS ---------------------------------------------

-- Cancel a booking: authorize (student-before-cutoff | owner | admin), release
-- capacity implicitly (status leaves active set), audit, notify. SECURITY DEFINER.
create or replace function cancel_booking(p_booking_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_role user_role;
  v_bk bookings%rowtype;
  v_cutoff int;
  v_owner uuid;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  select role into v_role from profiles where id = v_user;
  select * into v_bk from bookings where id = p_booking_id for update;
  if v_bk.id is null then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if v_bk.status in ('cancelled','completed','no_show','expired','refunded') then
    raise exception 'INVALID_STATE' using errcode='P0001';
  end if;

  select owner_id into v_owner from centres where id = v_bk.centre_id;
  select coalesce(cancel_cutoff_hours, 12) into v_cutoff from booking_rules where centre_id = v_bk.centre_id;
  v_cutoff := coalesce(v_cutoff, 12);

  -- Authorization: admin always; owner of the centre; or the booker before cutoff.
  if v_role <> 'admin' and v_user <> v_owner then
    if v_user <> v_bk.user_id then raise exception 'FORBIDDEN' using errcode='42501'; end if;
    if now() > v_bk.starts_at - (v_cutoff || ' hours')::interval then
      raise exception 'PAST_CUTOFF' using errcode='P0001';
    end if;
  end if;

  update bookings set status='cancelled', cancelled_at=now(), cancelled_by=v_user, cancel_reason=p_reason
  where id = p_booking_id;

  perform log_audit('booking.cancelled','booking', p_booking_id::text,
    jsonb_build_object('by', v_user, 'reason', p_reason));

  insert into notifications (user_id, kind, title, body, url)
  values (v_bk.user_id, 'booking_cancelled', 'Booking cancelled',
    'Your booking has been cancelled.', '/account');

  -- Free a seat → promote the oldest waiter for this resource, if any.
  perform promote_waitlist(v_bk.resource_id);
end; $$;

-- Promote the next waitlist entry when a seat frees up.
create or replace function promote_waitlist(p_resource_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_entry waitlist_entries%rowtype; v_units int; v_taken int;
begin
  select unit_count into v_units from resources where id = p_resource_id for update;
  select count(*) into v_taken from bookings
    where resource_id = p_resource_id and status in ('pending','confirmed','checked_in');
  if v_taken >= v_units then return; end if; -- still full

  select * into v_entry from waitlist_entries
    where resource_id = p_resource_id and status='waiting'
      and (expires_at is null or expires_at > now())
    order by created_at asc limit 1 for update skip locked;
  if v_entry.id is null then return; end if;

  update waitlist_entries set status='promoted' where id = v_entry.id;
  insert into notifications (user_id, kind, title, body, url)
  values (v_entry.user_id, 'waitlist_promoted', 'A seat opened up!',
    'You can now book your waitlisted study space.', '/centres');
end; $$;

-- Expire stale pending holds (called by a scheduled job / cron).
create or replace function expire_pending_bookings()
returns int language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  with expired as (
    update bookings set status='expired'
    where status='pending' and expires_at is not null and expires_at < now()
    returning resource_id
  )
  select count(*) into v_count from expired;
  return v_count;
end; $$;

grant execute on function cancel_booking(uuid,text)      to authenticated;
grant execute on function promote_waitlist(uuid)         to authenticated;
grant execute on function expire_pending_bookings()      to service_role;

-- 7. RLS on new tables -------------------------------------------------------
alter table refunds          enable row level security;
alter table waitlist_entries enable row level security;
alter table booking_rules    enable row level security;

create policy "refunds read own or staff" on refunds for select using (
  exists (select 1 from bookings b where b.id = booking_id and (
    b.user_id = auth.uid()
    or auth_role() = 'admin'
    or exists (select 1 from centres c where c.id = b.centre_id and c.owner_id = auth.uid())
  ))
);
create policy "waitlist read own or staff" on waitlist_entries for select using (
  user_id = auth.uid() or auth_role() = 'admin'
);
create policy "waitlist insert self" on waitlist_entries for insert with check (user_id = auth.uid());
create policy "booking_rules public read" on booking_rules for select using (true);
create policy "booking_rules owner write" on booking_rules for all using (
  auth_role() = 'admin' or exists (select 1 from centres c where c.id = centre_id and c.owner_id = auth.uid())
) with check (
  auth_role() = 'admin' or exists (select 1 from centres c where c.id = centre_id and c.owner_id = auth.uid())
);


-- === 0012_waitlist_promotion_fix.sql ===
-- 0012_waitlist_promotion_fix.sql
--
-- DEFECT (verified by reproduction on PostgreSQL 16):
--   With ONE free seat, three calls to promote_waitlist() promoted THREE
--   students. Each was told "A seat opened up!"; only one could actually book.
--
-- ROOT CAUSE:
--   promote_waitlist() guarded with `if v_taken >= v_units then return`, but
--   v_taken counted ACTIVE BOOKINGS only. Marking an entry 'promoted' does not
--   create a booking, so the freed seat still looked free on the next call.
--   Real path: cancel_booking() promotes #1 internally, then an admin pressing
--   "Promote next student" promotes #2 against the same seat.
--
-- FIX (minimal, no schema change — uses existing columns):
--   1. An OUTSTANDING promotion (status='promoted', not yet booked, not yet
--      expired) now consumes capacity, so a seat can only be offered once.
--   2. Every promotion gets a hold window (expires_at). If the student doesn't
--      book within it, the offer lapses and the seat returns to the pool.
--
-- Unchanged: signature, SECURITY DEFINER, search_path, queue order (FIFO),
-- skip-locked concurrency behaviour, notification payload shape.

create or replace function promote_waitlist(p_resource_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_entry waitlist_entries%rowtype;
  v_units int;
  v_taken int;
  v_hold  constant interval := interval '30 minutes';
begin
  -- Lock the resource row: serialises concurrent promotions for this resource.
  select unit_count into v_units from resources where id = p_resource_id for update;
  if v_units is null then return; end if;

  -- Seats consumed = active bookings + outstanding promotions still holding a seat.
  select
      (select count(*) from bookings
        where resource_id = p_resource_id
          and status in ('pending','confirmed','checked_in'))
    + (select count(*) from waitlist_entries
        where resource_id = p_resource_id
          and status = 'promoted'
          and promoted_booking_id is null
          and (expires_at is null or expires_at > now()))
    into v_taken;

  if v_taken >= v_units then return; end if;  -- no seat genuinely free

  select * into v_entry from waitlist_entries
    where resource_id = p_resource_id
      and status = 'waiting'
      and (expires_at is null or expires_at > now())
    order by created_at asc
    limit 1
    for update skip locked;
  if v_entry.id is null then return; end if;

  update waitlist_entries
     set status     = 'promoted',
         expires_at = now() + v_hold   -- offer lapses -> seat returns to the pool
   where id = v_entry.id;

  insert into notifications (user_id, kind, title, body, url)
  values (v_entry.user_id, 'waitlist_promoted', 'A seat opened up!',
    'You can now book your waitlisted study space. This offer expires in 30 minutes.', '/centres');
end;
$$;


-- === 0013_refund_race_fix.sql ===
-- 0013_refund_race_fix.sql
--
-- DEFECT (verified by reproduction on PostgreSQL 16):
--   Two refund rows were inserted for the SAME booking, both status='succeeded'.
--   A double refund means real money leaves the account twice.
--
-- ROOT CAUSE:
--   refundBooking() is check-then-act and NOT atomic:
--     1. read: any pending/processing/succeeded refund for this booking?  -> no
--     2. call Razorpay createRefund()                                     -> money out
--     3. insert refunds row
--   Two concurrent callers (two admins, or one double-click) both pass step 1,
--   both reach step 2, and Razorpay issues TWO refunds.
--
--   The existing index was:
--       unique (booking_id, razorpay_refund_id)
--   which cannot stop this, because:
--     a) the two rows carry DIFFERENT razorpay_refund_id values, and
--     b) before the provider responds the column is NULL, and in PostgreSQL
--        NULLs are distinct in a unique index — so many NULL rows are allowed.
--   It only catches a replay of the exact same provider refund id.
--
-- INTENT (already in the code):
--   refundBooking() maps SQLSTATE 23505 to "Duplicate refund blocked.", so the
--   application already expects the database to be the source of truth here.
--   Its read-guard blocks when ANY pending/processing/succeeded refund exists —
--   i.e. at most ONE live refund per booking, partial or full.
--
-- FIX (no schema change — index only):
--   Enforce that rule where it cannot race: a partial unique index over
--   booking_id for live refunds only. Failed/cancelled refunds are excluded so a
--   genuine retry after a provider failure still works.

-- The old index stays: it still de-duplicates provider webhook replays.
-- This adds the guarantee it was missing.
--
-- DEPLOYMENT NOTE: this index CANNOT be created if the table already holds two
-- live refunds for one booking. On a database that has taken real traffic, check
-- first and resolve any offenders before applying:
--
--   select booking_id, count(*) from refunds
--    where status in ('pending','processing','succeeded')
--    group by booking_id having count(*) > 1;
--
-- (Expected to return zero rows on a fresh deployment.)

create unique index if not exists uq_refund_one_live_per_booking
  on refunds (booking_id)
  where status in ('pending', 'processing', 'succeeded');


-- === 0014_fix_profiles_rls_recursion.sql ===
-- 0014_fix_profiles_rls_recursion.sql
-- FIX: infinite recursion in profiles RLS policies.
--
-- Problem: the "profiles admin read" and "profiles self update" policies queried
-- the profiles table from *within* a profiles policy (EXISTS/SELECT ... FROM profiles).
-- Under enforced RLS this recurses infinitely, so even a user reading their OWN
-- profile fails with "infinite recursion detected in policy for relation profiles".
-- Because the app reads the caller's profile on nearly every authenticated request
-- (role/permission checks), this breaks all logged-in pages in production.
--
-- Fix: use the existing SECURITY DEFINER helper auth_role(), which reads the role
-- OUTSIDE RLS (it already backs every other table's admin checks). This removes the
-- self-reference and the recursion. Behaviour is preserved exactly:
--   * admins can read all profiles
--   * users can read their own profile
--   * users can update their own profile but CANNOT change their own role
--
-- Deploy note: safe/idempotent. Drops and recreates the two offending policies only;
-- "profiles self read" is unchanged.

-- 1) Admin read: replace recursive EXISTS(...FROM profiles...) with auth_role()
drop policy if exists "profiles admin read" on public.profiles;
create policy "profiles admin read" on public.profiles
  for select
  using ( auth_role() = 'admin'::user_role );

-- 2) Self update with role-freeze: replace recursive subquery role-check.
--    auth_role() returns the caller's CURRENT persisted role (bypassing RLS),
--    so "new role must equal current role" freezes the column without recursion.
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update
  using ( auth.uid() = id )
  with check ( auth.uid() = id and role = auth_role() );

-- "profiles self read" (using auth.uid() = id) is already correct and non-recursive.


-- === 0015_onboarding_amenities_social_docs.sql ===
-- 0015_onboarding_amenities_social_docs.sql
-- Milestone 3 completion: adds the four onboarding features that were in M3 scope
-- but not yet built — amenities, social links, verification documents, and the
-- Google Places identifier. Additive only; no existing tables/columns changed.

-- ─────────────────────────────────────────────────────────────
-- 1. AMENITIES  (lookup + join, mirroring categories/listing_categories)
-- ─────────────────────────────────────────────────────────────
create table if not exists amenities (
  id     uuid primary key default gen_random_uuid(),
  slug   text not null unique,          -- 'wifi', 'ac', 'lockers'
  label  text not null,                 -- 'High-speed Wi-Fi'
  icon   text,                          -- emoji or icon key
  sort_order int not null default 0
);

create table if not exists centre_amenities (
  centre_id  uuid not null references centres(id) on delete cascade,
  amenity_id uuid not null references amenities(id) on delete cascade,
  primary key (centre_id, amenity_id)
);
create index if not exists idx_centre_amenities_centre on centre_amenities (centre_id);

-- seed the common amenities
insert into amenities (slug,label,icon,sort_order) values
  ('wifi','High-speed Wi-Fi','📶',1),
  ('ac','Air conditioning','❄️',2),
  ('power','Power at every desk','🔌',3),
  ('lockers','Personal lockers','🔒',4),
  ('cctv','CCTV secured','📹',5),
  ('water','RO drinking water','💧',6),
  ('washroom','Separate washrooms','🚻',7),
  ('parking','Two-wheeler parking','🅿️',8),
  ('library','Reference library','📚',9),
  ('silent','Dedicated silent zone','🔇',10),
  ('cafe','Tea & coffee counter','☕',11),
  ('247','24×7 access','🕐',12)
on conflict (slug) do nothing;

-- ─────────────────────────────────────────────────────────────
-- 2. SOCIAL LINKS + GOOGLE PLACES + WEBSITE  (columns on centres)
-- ─────────────────────────────────────────────────────────────
alter table centres add column if not exists website     text;
alter table centres add column if not exists phone       text;
alter table centres add column if not exists social      jsonb not null default '{}'::jsonb;  -- {instagram,facebook,youtube,whatsapp}
alter table centres add column if not exists google_place_id text;  -- from Google Places import

-- ─────────────────────────────────────────────────────────────
-- 3. VERIFICATION DOCUMENTS  (owner-uploaded, admin-reviewed)
-- ─────────────────────────────────────────────────────────────
create table if not exists centre_documents (
  id           uuid primary key default gen_random_uuid(),
  centre_id    uuid not null references centres(id) on delete cascade,
  storage_path text not null,
  doc_type     text not null default 'other',   -- 'license','gst','ownership_proof','other'
  label        text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_centre_documents_centre on centre_documents (centre_id);

-- ─────────────────────────────────────────────────────────────
-- 4. RLS  (consistent with existing policies; uses auth_role() helper)
-- ─────────────────────────────────────────────────────────────
alter table amenities        enable row level security;
alter table centre_amenities enable row level security;
alter table centre_documents enable row level security;

-- amenities: world-readable, admin-writable
drop policy if exists "amenities read" on amenities;
create policy "amenities read" on amenities for select using (true);
drop policy if exists "amenities admin write" on amenities;
create policy "amenities admin write" on amenities for all
  using (auth_role() = 'admin'::user_role) with check (auth_role() = 'admin'::user_role);

-- centre_amenities: readable with the centre; owner of the centre (or admin) manages
drop policy if exists "centre_amenities read" on centre_amenities;
create policy "centre_amenities read" on centre_amenities for select using (true);
drop policy if exists "centre_amenities owner write" on centre_amenities;
create policy "centre_amenities owner write" on centre_amenities for all
  using (
    exists (select 1 from centres c where c.id = centre_id
            and (c.owner_id = auth.uid() or auth_role() = 'admin'::user_role))
  )
  with check (
    exists (select 1 from centres c where c.id = centre_id
            and (c.owner_id = auth.uid() or auth_role() = 'admin'::user_role))
  );

-- centre_documents: PRIVATE — only the owning owner and admins can see/manage
-- (verification docs are sensitive; never world-readable)
drop policy if exists "centre_documents owner read" on centre_documents;
create policy "centre_documents owner read" on centre_documents for select
  using (
    exists (select 1 from centres c where c.id = centre_id
            and (c.owner_id = auth.uid() or auth_role() = 'admin'::user_role))
  );
drop policy if exists "centre_documents owner write" on centre_documents;
create policy "centre_documents owner write" on centre_documents for all
  using (
    exists (select 1 from centres c where c.id = centre_id
            and (c.owner_id = auth.uid() or auth_role() = 'admin'::user_role))
  )
  with check (
    exists (select 1 from centres c where c.id = centre_id
            and (c.owner_id = auth.uid() or auth_role() = 'admin'::user_role))
  );


-- === 0016_geo_search.sql ===
-- 0016_geo_search.sql
-- Milestone 5 completion: nearby / distance / radius search.
-- The DB was already geo-capable (earthdistance + GiST index on ll_to_earth(lat,lng)
-- from 0002); this exposes it as a callable function the search service can use.
--
-- supabase-js cannot express earth_box()/earth_distance() through its query builder,
-- so we provide a SECURITY DEFINER function the service calls via .rpc(), mirroring
-- how book_seat() etc. are already used. Returns published centres within p_radius_km
-- of (p_lat,p_lng), ordered by distance, with the distance in metres included.

create or replace function search_centres_nearby(
  p_lat        double precision,
  p_lng        double precision,
  p_radius_km  double precision default 5,
  p_space_type space_type default null,
  p_women_safe boolean default null,
  p_limit      int default 24
)
returns table (
  id                  uuid,
  slug                text,
  name                text,
  area                text,
  emoji               text,
  cover_url           text,
  rating              numeric,
  reviews_count       int,
  women_safe_verified boolean,
  is_verified         boolean,
  space_type          text,
  lat                 double precision,
  lng                 double precision,
  distance_m          double precision
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    c.id, c.slug, c.name, c.area, c.emoji, c.cover_url,
    c.rating, c.reviews_count, c.women_safe_verified, c.is_verified,
    c.space_type::text, c.lat, c.lng,
    earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(c.lat, c.lng)) as distance_m
  from centres c
  where c.is_published
    and c.lat is not null
    and c.lng is not null
    -- bounding-box prefilter (GiST index-backed) then exact radius
    and earth_box(ll_to_earth(p_lat, p_lng), p_radius_km * 1000) @> ll_to_earth(c.lat, c.lng)
    and earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(c.lat, c.lng)) <= p_radius_km * 1000
    and (p_space_type is null or c.space_type = p_space_type)
    and (p_women_safe is null or c.women_safe_verified = p_women_safe)
  order by distance_m asc
  limit greatest(1, least(p_limit, 48));
$$;

grant execute on function search_centres_nearby(double precision, double precision, double precision, space_type, boolean, int) to anon, authenticated;


-- === 0017_invoices.sql ===
-- 0017_invoices.sql
-- Milestone 8 completion: invoice / receipt generation.
--
-- Adds a stable, sequential, human-readable invoice number to each booking,
-- assigned the moment it becomes paid (via trigger). The invoice document itself
-- is rendered server-side at /account/bookings/[id]/invoice (HTML → print to PDF),
-- so no PDF library is added to the app runtime. GST-ready: the invoice page
-- derives the tax breakdown; here we just persist the number + timestamp.

-- Sequence for invoice numbers (shared, gapless-enough for receipts).
create sequence if not exists invoice_seq start 1000;

alter table bookings add column if not exists invoice_number text;
alter table bookings add column if not exists invoiced_at   timestamptz;

-- Assign an invoice number exactly once, when a booking first becomes paid.
create or replace function assign_invoice_number() returns trigger
language plpgsql as $$
begin
  if new.payment = 'paid' and (old.payment is distinct from 'paid') and new.invoice_number is null then
    -- format: SN-2026-001000  (SN = StudyNook, year, zero-padded seq)
    new.invoice_number := 'SN-' || to_char(now(), 'YYYY') || '-' ||
                          lpad(nextval('invoice_seq')::text, 6, '0');
    new.invoiced_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assign_invoice on bookings;
create trigger trg_assign_invoice
  before update on bookings
  for each row execute function assign_invoice_number();

-- Backfill existing paid bookings that predate this migration.
update bookings
set invoice_number = 'SN-' || to_char(coalesce(created_at, now()), 'YYYY') || '-' ||
                     lpad(nextval('invoice_seq')::text, 6, '0'),
    invoiced_at = coalesce(created_at, now())
where payment = 'paid' and invoice_number is null;

comment on column bookings.invoice_number is 'Human-readable receipt number, assigned once on first payment (trigger).';


-- === 0018_admin_user_management.sql ===
-- 0018_admin_user_management.sql
-- Milestone 11: admin user management. Admins can read all profiles (existing
-- "profiles admin read" policy) but there was NO way for an admin to change a
-- user's role. This adds a SECURITY DEFINER function that does it safely, with
-- guardrails, rather than a broad UPDATE-any-profile RLS policy.

create or replace function admin_set_user_role(p_user uuid, p_role user_role)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_caller_role user_role;
  v_target_current user_role;
  v_admin_count int;
begin
  -- caller must be an admin (auth_role bypasses RLS, no recursion)
  v_caller_role := auth_role();
  if v_caller_role is distinct from 'admin' then
    raise exception 'FORBIDDEN: admin only' using errcode = '42501';
  end if;

  select role into v_target_current from profiles where id = p_user;
  if v_target_current is null then
    raise exception 'NOT_FOUND: user does not exist' using errcode = 'P0002';
  end if;

  -- guardrail: never demote the last remaining admin
  if v_target_current = 'admin' and p_role <> 'admin' then
    select count(*) into v_admin_count from profiles where role = 'admin';
    if v_admin_count <= 1 then
      raise exception 'CONFLICT: cannot demote the last admin' using errcode = 'P0001';
    end if;
  end if;

  update profiles set role = p_role where id = p_user;

  -- audit trail (log_audit already used across the app)
  perform log_audit('admin.user_role_changed', 'profile', p_user::text,
                    jsonb_build_object('from', v_target_current, 'to', p_role));
end;
$$;

revoke all on function admin_set_user_role(uuid, user_role) from public, anon;
grant execute on function admin_set_user_role(uuid, user_role) to authenticated;


-- === 0019_storage_hardening.sql ===
-- 0019_storage_hardening.sql
-- Security (M13): the listing-images bucket had no server-side file-size or
-- MIME restrictions — client-side checks (5 MB, image/*) are trivially bypassed
-- by calling the Storage API directly. This enforces both at the bucket level,
-- so a malicious authenticated owner cannot upload oversized files or non-image
-- content (e.g. an HTML/SVG payload that a public bucket would serve inline).
--
-- Guarded on column existence: real Supabase storage.buckets has these columns;
-- the guard keeps the migration safe across environments/versions.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'storage' and table_name = 'buckets' and column_name = 'file_size_limit'
  ) then
    execute $u$
      update storage.buckets
      set file_size_limit = 5242880,
          allowed_mime_types = array['image/jpeg','image/png','image/webp','image/avif']
      where id = 'listing-images'
    $u$;
  end if;
end $$;

-- SVG is intentionally excluded — SVGs can carry scripts and this is a
-- public-read bucket, so serving user SVGs inline would be an XSS vector.


-- === 0020_fk_indexes.sql ===
-- 0020_fk_indexes.sql
-- M19 database validation: index the remaining foreign-key columns.
-- Rationale: unindexed FKs slow FK constraint validation and cascade deletes,
-- and PostgreSQL does NOT auto-create indexes on the referencing side of a FK.
-- None of these are hot query paths, so they're plain (non-partial) btree indexes;
-- the cost is minimal and the benefit is faster referential integrity checks +
-- headroom if these columns are ever filtered on (e.g. an admin "reports by
-- reviewer" view). Uses IF NOT EXISTS for idempotency.

create index if not exists idx_bookings_cancelled_by       on bookings(cancelled_by)               where cancelled_by is not null;
create index if not exists idx_bookings_rescheduled_from    on bookings(rescheduled_from)            where rescheduled_from is not null;
create index if not exists idx_centres_reviewed_by          on centres(reviewed_by)                  where reviewed_by is not null;
create index if not exists idx_enquiries_sender_id          on enquiries(sender_id);
create index if not exists idx_featured_created_by          on featured_listings(created_by);
create index if not exists idx_claims_reviewed_by           on listing_claims(reviewed_by)           where reviewed_by is not null;
create index if not exists idx_refunds_requested_by         on refunds(requested_by);
create index if not exists idx_review_reports_reporter_id   on review_reports(reporter_id);
create index if not exists idx_review_reports_review_id     on review_reports(review_id);
create index if not exists idx_waitlist_promoted_booking    on waitlist_entries(promoted_booking_id) where promoted_booking_id is not null;


-- === 0021_auth_security_and_audit.sql ===
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


-- === 0022_centre_description.sql ===
-- 0022_centre_description.sql
-- Admin Dashboard milestone: the admin "Create Centre" form needs an
-- "About Centre" free-text field. `centres` had no description/about column
-- at all (categories.description is a different table). Additive only.

alter table centres add column if not exists description text;


-- === 0023_newsletter_subscribers.sql ===
-- 0023_newsletter_subscribers.sql
-- Footer redesign needs a "Subscribe to our newsletter" box. Rather than ship
-- a form that submits nowhere (a fake control that looks functional but
-- isn't), this adds a minimal real capture. Additive only.

create table if not exists newsletter_subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);

alter table newsletter_subscribers enable row level security;

-- Public (including signed-out visitors) can subscribe; nobody can read the
-- list back through the API — there's no admin UI for it yet, and an email
-- list is exactly the kind of data that shouldn't be casually SELECT-able.
create policy "newsletter insert" on newsletter_subscribers for insert
  to anon, authenticated with check (true);


-- === 0024_contact_messages.sql ===
-- 0024_contact_messages.sql
-- Contact page redesign needs a real "Let's Connect" form. The page previously
-- had no form at all (just mailto links) — this adds a minimal real capture,
-- same reasoning as 0023's newsletter table: a form that submits nowhere is
-- worse than no form. Additive only.

create table if not exists contact_messages (
  id         uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name  text not null,
  email      text not null,
  phone      text,
  message    text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_contact_messages_created on contact_messages (created_at desc);

alter table contact_messages enable row level security;

-- Public (including signed-out visitors) can submit; nobody can read it back
-- through the API yet — no admin UI for it, same posture as newsletter signups.
create policy "contact messages insert" on contact_messages for insert
  to anon, authenticated with check (true);


-- === 0025_slot_availability.sql ===
-- 0025_slot_availability.sql
-- Real slot/availability system for bookings (movie-ticket style): a given
-- resource has N units (unit_count); for any specific hour on a given date,
-- "available" means fewer than N overlapping active bookings exist for that
-- hour. This mirrors book_seat()'s exact overlap check (0010) — deliberately
-- the SAME comparison, expressed as a read-only query, so the availability
-- the UI shows can never say "free" for a slot the DB would then reject.
-- Additive only.

/**
 * Hour-by-hour availability for one resource on one date, within the
 * centre's operating hours (booking_rules, falling back to 6:00–23:00 if the
 * centre hasn't configured hours — same default the booking_rules columns
 * themselves use).
 */
create or replace function resource_hour_slots(p_resource_id uuid, p_date date)
returns table(hour int, taken int, capacity int, is_available boolean)
language sql stable security definer set search_path = public as $$
  with r as (
    select unit_count, centre_id from resources where id = p_resource_id and is_active = true
  ),
  hours as (
    select generate_series(
      coalesce((select extract(hour from br.opening_time)::int from booking_rules br join r on br.centre_id = r.centre_id), 6),
      coalesce((select extract(hour from br.closing_time)::int from booking_rules br join r on br.centre_id = r.centre_id), 23) - 1
    ) as hour
  ),
  slot_bounds as (
    select h.hour,
           (p_date::timestamptz + (h.hour || ' hours')::interval) as slot_start,
           (p_date::timestamptz + ((h.hour + 1) || ' hours')::interval) as slot_end
    from hours h
  )
  select
    sb.hour,
    coalesce((
      select count(*) from bookings b
      where b.resource_id = p_resource_id
        and b.status in ('pending', 'confirmed')
        and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(sb.slot_start, sb.slot_end, '[)')
    ), 0)::int as taken,
    coalesce((select r.unit_count from r), 0) as capacity,
    coalesce((
      select count(*) from bookings b
      where b.resource_id = p_resource_id
        and b.status in ('pending', 'confirmed')
        and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(sb.slot_start, sb.slot_end, '[)')
    ), 0) < coalesce((select r.unit_count from r), 0) as is_available
  from slot_bounds sb
  order by sb.hour;
$$;
revoke all on function resource_hour_slots(uuid, date) from public;
grant execute on function resource_hour_slots(uuid, date) to anon, authenticated;

/**
 * Single availability check for a day/month booking starting at p_date (at
 * the centre's opening time, or 00:00 if no booking_rules exist) — same
 * overlap logic, one row instead of an hour grid.
 */
create or replace function resource_day_availability(p_resource_id uuid, p_date date, p_period booking_period)
returns table(taken int, capacity int, is_available boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_start timestamptz;
  v_end   timestamptz;
  v_open  time;
begin
  select coalesce(br.opening_time, '00:00') into v_open
  from resources r left join booking_rules br on br.centre_id = r.centre_id
  where r.id = p_resource_id;

  v_start := p_date::timestamptz + coalesce(v_open, '00:00'::time);
  v_end := case p_period
    when 'day' then v_start + interval '1 day'
    when 'month' then v_start + interval '30 days'
    else v_start + interval '1 hour'
  end;

  return query
  select
    coalesce(cnt.n, 0)::int,
    coalesce(r.unit_count, 0),
    coalesce(cnt.n, 0) < coalesce(r.unit_count, 0)
  from resources r
  left join lateral (
    select count(*) as n from bookings b
    where b.resource_id = p_resource_id
      and b.status in ('pending', 'confirmed')
      and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(v_start, v_end, '[)')
  ) cnt on true
  where r.id = p_resource_id and r.is_active = true;
end;
$$;
revoke all on function resource_day_availability(uuid, date, booking_period) from public;
grant execute on function resource_day_availability(uuid, date, booking_period) to anon, authenticated;


-- === 0026_slot_timing_all_periods.sql ===
-- 0026_slot_timing_all_periods.sql
-- The slot picker only applied to hourly bookings; day/month bookings never
-- showed a start time at all, and the discovery-page occupancy badge showed
-- 0 seats free for every owner-created centre (a real bug: the owner create
-- flow set resources.unit_count but never centres.capacity, which the
-- occupancy view actually reads — fixed in application code alongside this
-- migration). This adds a period-aware version of the slot function: a day
-- or month booking still has a specific start TIME (e.g. "3 PM"), and picking
-- that slot correctly reduces availability for that exact start time only —
-- not the literal 1-hour window — since a day/month booking's true overlap
-- window is the whole day/month starting from that hour.

create or replace function resource_hour_slots(p_resource_id uuid, p_date date, p_period booking_period default 'hour')
returns table(hour int, taken int, capacity int, is_available boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_units int;
  v_open  int;
  v_close int;
begin
  select unit_count into v_units from resources where id = p_resource_id and is_active = true;
  if v_units is null then
    return; -- resource not found / inactive: no rows
  end if;

  select coalesce(extract(hour from br.opening_time)::int, 6),
         coalesce(extract(hour from br.closing_time)::int, 23)
    into v_open, v_close
  from resources r
  left join booking_rules br on br.centre_id = r.centre_id
  where r.id = p_resource_id;

  return query
  with hours as (
    select generate_series(v_open, greatest(v_open, v_close - 1)) as h
  ),
  bounds as (
    select
      hh.h,
      (p_date::timestamptz + (hh.h || ' hours')::interval) as slot_start,
      (p_date::timestamptz + (hh.h || ' hours')::interval) +
        case p_period
          when 'day' then interval '1 day'
          when 'month' then interval '30 days'
          else interval '1 hour'
        end as slot_end
    from hours hh
  )
  select
    b.h,
    coalesce(cnt.n, 0)::int,
    v_units,
    coalesce(cnt.n, 0) < v_units
  from bounds b
  left join lateral (
    select count(*) as n from bookings bk
    where bk.resource_id = p_resource_id
      and bk.status in ('pending', 'confirmed')
      and tstzrange(bk.starts_at, bk.ends_at, '[)') && tstzrange(b.slot_start, b.slot_end, '[)')
  ) cnt on true
  order by b.h;
end;
$$;
revoke all on function resource_hour_slots(uuid, date, booking_period) from public;
grant execute on function resource_hour_slots(uuid, date, booking_period) to anon, authenticated;

-- Old 2-arg signature is now superseded; drop it so callers can't accidentally
-- hit the non-period-aware version.
drop function if exists resource_hour_slots(uuid, date);


-- === 0027_slot_ist_and_past.sql ===
-- 0027_slot_ist_and_past.sql
-- Two real bugs found in testing:
--
-- 1. TIMEZONE: neither this function nor the Node-side booking code anchored
--    time construction to India Standard Time (+05:30) — a bare
--    `date::timestamptz` cast uses the database session's timezone (UTC by
--    default), and Node's `new Date("...T08:00:00")` (no offset) uses the
--    server process's local timezone (UTC on Vercel). Two ambient-timezone
--    guesses that happen to agree with each other are still both wrong
--    relative to what "8 AM" means to a student in Warangal — the slot
--    labelled "8 AM" was actually being stored/compared as 8 AM UTC, i.e.
--    1:30 PM IST. Fixed by building every slot instant with an explicit
--    '+05:30' offset, in both this function and the Node action.
--
-- 2. PAST SLOTS: nothing marked already-passed hours today as unavailable —
--    a student could pick 6 AM at 9:45 PM. Added `is_past`, computed against
--    real current time, and folded into `is_available` so a past slot is
--    correctly disabled without needing separate "is this today" branching —
--    it works for any date because it's just "is this instant before now".

-- Postgres won't let CREATE OR REPLACE change a function's return columns
-- (adding is_past below) — the old signature must be dropped first.
drop function if exists resource_hour_slots(uuid, date, booking_period);

create or replace function resource_hour_slots(p_resource_id uuid, p_date date, p_period booking_period default 'hour')
returns table(hour int, taken int, capacity int, is_available boolean, is_past boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_units int;
  v_open  int;
  v_close int;
begin
  select unit_count into v_units from resources where id = p_resource_id and is_active = true;
  if v_units is null then
    return; -- resource not found / inactive: no rows
  end if;

  select coalesce(extract(hour from br.opening_time)::int, 6),
         coalesce(extract(hour from br.closing_time)::int, 23)
    into v_open, v_close
  from resources r
  left join booking_rules br on br.centre_id = r.centre_id
  where r.id = p_resource_id;

  return query
  with hours as (
    select generate_series(v_open, greatest(v_open, v_close - 1)) as h
  ),
  bounds as (
    select
      hh.h,
      -- Explicit IST offset — never rely on session/server ambient timezone.
      (p_date::text || ' ' || lpad(hh.h::text, 2, '0') || ':00:00+05:30')::timestamptz as slot_start,
      (p_date::text || ' ' || lpad(hh.h::text, 2, '0') || ':00:00+05:30')::timestamptz +
        case p_period
          when 'day' then interval '1 day'
          when 'month' then interval '30 days'
          else interval '1 hour'
        end as slot_end
    from hours hh
  )
  select
    b.h,
    coalesce(cnt.n, 0)::int,
    v_units,
    (coalesce(cnt.n, 0) < v_units) and (b.slot_start > now()),
    b.slot_start <= now()
  from bounds b
  left join lateral (
    select count(*) as n from bookings bk
    where bk.resource_id = p_resource_id
      and bk.status in ('pending', 'confirmed')
      and tstzrange(bk.starts_at, bk.ends_at, '[)') && tstzrange(b.slot_start, b.slot_end, '[)')
  ) cnt on true
  order by b.h;
end;
$$;
revoke all on function resource_hour_slots(uuid, date, booking_period) from public;
grant execute on function resource_hour_slots(uuid, date, booking_period) to anon, authenticated;


-- === 0028_exact_slot_capacity.sql ===
-- 0028_exact_slot_capacity.sql
-- Real bug found in testing: booking a Daily or Monthly option reserves a
-- 24-hour or 30-day window starting from whichever hour was picked (0010,
-- 0027). Any two such windows on the same day inevitably overlap each other
-- — a 24h window starting 6 AM and one starting 7 AM overlap for 23 of their
-- 24 hours — so with unit_count = 3, three bookings at ANY hours filled
-- every single hour-slot that day, not just the specific hours chosen.
--
-- The actual product model (confirmed): `seats` is a capacity per exact
-- clock time, independent of how long the booking's price period is. 10
-- seats means 10 concurrent bookings AT THE SAME START TIME are allowed —
-- 6 AM and 7 AM are separate, independent buckets of 10, regardless of
-- whether the booking is priced hourly, daily, or monthly. Period is a price
-- label, not a capacity-duration multiplier.
--
-- Fixed in both places that must agree: book_seat() (the real enforcement,
-- at the moment of booking) and resource_hour_slots() (the preview the
-- student sees beforehand) — both now count exact starts_at matches instead
-- of overlapping time ranges.

create or replace function book_seat(
  p_centre_id  uuid,
  p_resource_id uuid,
  p_period     booking_period,
  p_starts_at  timestamptz,
  p_ends_at    timestamptz,
  p_amount     numeric
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_units  int;
  v_taken  int;
  v_id     uuid;
begin
  if v_user is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;

  -- Lock the resource row so concurrent bookings serialize on it.
  select unit_count into v_units
  from resources
  where id = p_resource_id and centre_id = p_centre_id and is_active = true
  for update;

  if v_units is null then
    raise exception 'RESOURCE_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Capacity is per EXACT start time, not "anything overlapping this
  -- booking's full duration" — a 6 AM slot and a 7 AM slot are independent
  -- buckets of `unit_count` seats each, regardless of period length.
  select count(*) into v_taken
  from bookings
  where resource_id = p_resource_id
    and status in ('pending','confirmed')
    and starts_at = p_starts_at;

  if v_taken >= v_units then
    raise exception 'RESOURCE_FULL' using errcode = 'P0001';
  end if;

  insert into bookings (centre_id, resource_id, user_id, period, starts_at, ends_at, amount, status, payment)
  values (p_centre_id, p_resource_id, v_user, p_period, p_starts_at, p_ends_at, p_amount, 'pending', 'unpaid')
  returning id into v_id;

  return v_id;
end;
$$;

-- Preview function: same exact-start-time counting, matching book_seat()
-- exactly so the UI never shows a slot as available that booking would then
-- reject (or vice versa). p_period no longer affects capacity — kept as a
-- parameter only so callers don't need to change their call sites.
create or replace function resource_hour_slots(p_resource_id uuid, p_date date, p_period booking_period default 'hour')
returns table(hour int, taken int, capacity int, is_available boolean, is_past boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_units int;
  v_open  int;
  v_close int;
begin
  select unit_count into v_units from resources where id = p_resource_id and is_active = true;
  if v_units is null then
    return; -- resource not found / inactive: no rows
  end if;

  select coalesce(extract(hour from br.opening_time)::int, 6),
         coalesce(extract(hour from br.closing_time)::int, 23)
    into v_open, v_close
  from resources r
  left join booking_rules br on br.centre_id = r.centre_id
  where r.id = p_resource_id;

  return query
  with hours as (
    select generate_series(v_open, greatest(v_open, v_close - 1)) as h
  ),
  bounds as (
    select
      hh.h,
      -- Explicit IST offset — never rely on session/server ambient timezone.
      (p_date::text || ' ' || lpad(hh.h::text, 2, '0') || ':00:00+05:30')::timestamptz as slot_start
    from hours hh
  )
  select
    b.h,
    coalesce(cnt.n, 0)::int,
    v_units,
    (coalesce(cnt.n, 0) < v_units) and (b.slot_start > now()),
    b.slot_start <= now()
  from bounds b
  left join lateral (
    select count(*) as n from bookings bk
    where bk.resource_id = p_resource_id
      and bk.status in ('pending', 'confirmed')
      and bk.starts_at = b.slot_start
  ) cnt on true
  order by b.h;
end;
$$;
revoke all on function resource_hour_slots(uuid, date, booking_period) from public;
grant execute on function resource_hour_slots(uuid, date, booking_period) to anon, authenticated;


-- === 0029_weekly_hours.sql ===
-- 0029_weekly_hours.sql
-- Real feature: owners need Monday-Sunday hours, not one daily window — e.g.
-- open 6 AM-10 PM Mon/Tue, 7 AM-10 PM Wed, closed Sunday. booking_rules only
-- ever had a single opening/closing time applied to every day. This adds a
-- per-day-of-week table and makes resource_hour_slots() respect it,
-- including returning zero bookable slots on a day marked closed.
--
-- day_of_week uses the SAME convention as both JS's Date.getDay() and
-- Postgres's EXTRACT(DOW FROM date) — 0 = Sunday .. 6 = Saturday — so no
-- conversion is needed between the client, this table, and the function
-- below.
--
-- Backward compatible: a centre with no centre_hours rows at all falls back
-- to booking_rules' single daily window (or the 6 AM-11 PM default), exactly
-- as before — existing centres aren't affected until their owner sets real
-- weekly hours.

create table if not exists centre_hours (
  centre_id     uuid not null references centres(id) on delete cascade,
  day_of_week   smallint not null check (day_of_week between 0 and 6),
  is_open       boolean not null default true,
  opening_time  time,
  closing_time  time,
  primary key (centre_id, day_of_week)
);

alter table centre_hours enable row level security;

create policy "centre_hours public read" on centre_hours for select using (true);
create policy "centre_hours owner write" on centre_hours for all using (
  exists (select 1 from centres c where c.id = centre_hours.centre_id and (c.owner_id = auth.uid() or auth_role() = 'admin'))
) with check (
  exists (select 1 from centres c where c.id = centre_hours.centre_id and (c.owner_id = auth.uid() or auth_role() = 'admin'))
);

create or replace function resource_hour_slots(p_resource_id uuid, p_date date, p_period booking_period default 'hour')
returns table(hour int, taken int, capacity int, is_available boolean, is_past boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_units     int;
  v_centre_id uuid;
  v_dow       int;
  v_is_open   boolean;
  v_open_time time;
  v_close_time time;
  v_open      int;
  v_close     int;
begin
  select unit_count, centre_id into v_units, v_centre_id from resources where id = p_resource_id and is_active = true;
  if v_units is null then
    return; -- resource not found / inactive: no rows
  end if;

  v_dow := extract(dow from p_date)::int;

  select is_open, opening_time, closing_time into v_is_open, v_open_time, v_close_time
  from centre_hours where centre_id = v_centre_id and day_of_week = v_dow;

  if found and not v_is_open then
    return; -- closed this day of the week: no bookable slots at all
  end if;

  if found then
    v_open := extract(hour from v_open_time)::int;
    v_close := extract(hour from v_close_time)::int;
  else
    -- No weekly schedule configured for this centre — fall back to the
    -- legacy single-daily-window default, same as before this migration.
    select coalesce(extract(hour from br.opening_time)::int, 6),
           coalesce(extract(hour from br.closing_time)::int, 23)
      into v_open, v_close
    from booking_rules br where br.centre_id = v_centre_id;
    if not found then
      v_open := 6; v_close := 23;
    end if;
  end if;

  return query
  with hours as (
    select generate_series(v_open, greatest(v_open, v_close - 1)) as h
  ),
  bounds as (
    select
      hh.h,
      (p_date::text || ' ' || lpad(hh.h::text, 2, '0') || ':00:00+05:30')::timestamptz as slot_start
    from hours hh
  )
  select
    b.h,
    coalesce(cnt.n, 0)::int,
    v_units,
    (coalesce(cnt.n, 0) < v_units) and (b.slot_start > now()),
    b.slot_start <= now()
  from bounds b
  left join lateral (
    select count(*) as n from bookings bk
    where bk.resource_id = p_resource_id
      and bk.status in ('pending', 'confirmed')
      and bk.starts_at = b.slot_start
  ) cnt on true
  order by b.h;
end;
$$;
revoke all on function resource_hour_slots(uuid, date, booking_period) from public;
grant execute on function resource_hour_slots(uuid, date, booking_period) to anon, authenticated;

-- Read-only helper so the booking UI can show "Closed on Sundays" up front,
-- without waiting on an hourly-slot query returning empty for an ambiguous
-- reason (closed vs. simply nothing configured yet).
create or replace function centre_is_open_on(p_centre_id uuid, p_date date)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select is_open from centre_hours where centre_id = p_centre_id and day_of_week = extract(dow from p_date)::int),
    true -- no weekly schedule configured: assume open, matching the legacy fallback above
  );
$$;
revoke all on function centre_is_open_on(uuid, date) from public;
grant execute on function centre_is_open_on(uuid, date) to anon, authenticated;

-- The preview (resource_hour_slots) is not the real gate — a direct call to
-- book_seat() bypassing the UI must be blocked too, or a closed day is only
-- a suggestion, not an actual rule. Re-defined with one added check up front.
create or replace function book_seat(
  p_centre_id  uuid,
  p_resource_id uuid,
  p_period     booking_period,
  p_starts_at  timestamptz,
  p_ends_at    timestamptz,
  p_amount     numeric
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_units  int;
  v_taken  int;
  v_id     uuid;
  v_open   boolean;
begin
  if v_user is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;

  -- Lock the resource row so concurrent bookings serialize on it.
  select unit_count into v_units
  from resources
  where id = p_resource_id and centre_id = p_centre_id and is_active = true
  for update;

  if v_units is null then
    raise exception 'RESOURCE_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_open := centre_is_open_on(p_centre_id, (p_starts_at at time zone 'Asia/Kolkata')::date);
  if not v_open then
    raise exception 'CENTRE_CLOSED' using errcode = 'P0003';
  end if;

  -- Capacity is per EXACT start time, not "anything overlapping this
  -- booking's full duration" — a 6 AM slot and a 7 AM slot are independent
  -- buckets of `unit_count` seats each, regardless of period length.
  select count(*) into v_taken
  from bookings
  where resource_id = p_resource_id
    and status in ('pending','confirmed')
    and starts_at = p_starts_at;

  if v_taken >= v_units then
    raise exception 'RESOURCE_FULL' using errcode = 'P0001';
  end if;

  insert into bookings (centre_id, resource_id, user_id, period, starts_at, ends_at, amount, status, payment)
  values (p_centre_id, p_resource_id, v_user, p_period, p_starts_at, p_ends_at, p_amount, 'pending', 'unpaid')
  returning id into v_id;

  return v_id;
end;
$$;


-- === 0030_period_enum.sql ===
-- 0030_period_enum.sql
-- New booking durations requested: Hourly, Daily, Weekly, Fortnightly,
-- Monthly, Quarterly, Half-yearly, Yearly. This migration only adds the enum
-- values — the function that uses them lives in the next migration, since
-- Postgres requires ALTER TYPE ... ADD VALUE to be committed before the new
-- value can be referenced.

alter type booking_period add value if not exists 'week';
alter type booking_period add value if not exists 'fortnight';
alter type booking_period add value if not exists 'quarter';
alter type booking_period add value if not exists 'half_year';
alter type booking_period add value if not exists 'year';


-- === 0031_multi_hour_and_long_term.sql ===
-- 0031_multi_hour_and_long_term.sql
-- Two real product requirements bundled here since they share the same
-- capacity-model rework:
--
-- 1. MULTI-HOUR BOOKINGS: a student can now book several hours in one go
--    (e.g. 9, 10, 11 AM = 3 hours). Each hour is still its own independent
--    capacity bucket — exactly the per-exact-hour model from 0028 — booking
--    3 hours creates 3 linked booking rows (booking_group_id), one per hour,
--    so "9 AM has 2 of 3 seats left" stays correct after this booking,
--    independent of 10 AM / 11 AM. All three inserts happen in one function
--    call (book_seat_multi) so it's all-or-nothing, not partial.
--
-- 2. LONG-TERM PERIODS: Daily, Weekly, Fortnightly, Monthly, Quarterly,
--    Half-yearly, Yearly. These aren't walk-in hour bookings — they're
--    multi-day passes, and get an END DATE shown to the student (computed
--    from the period's real length). Capacity for these is checked as a
--    SEPARATE pool from hourly walk-ins: how many other day-or-longer
--    bookings genuinely overlap the requested date range, compared against
--    the same seat count. Two different monthly-pass holders whose 30-day
--    windows overlap correctly compete for seats; a hourly walk-in at 3 PM
--    does not compete with a monthly pass-holder's seat, and vice versa —
--    they're different usage patterns sharing a seat count, not one ledger.
--    (Hourly's own pool, from 0028, is unchanged by this file.)

alter table bookings add column if not exists booking_group_id uuid;
create index if not exists idx_bookings_group on bookings (booking_group_id) where booking_group_id is not null;

/** Real length, in days, of each long-term period. Hourly isn't listed — it never uses this. */
create or replace function period_days(p_period booking_period) returns int
language sql immutable as $$
  select case p_period
    when 'day' then 1
    when 'week' then 7
    when 'fortnight' then 14
    when 'month' then 30
    when 'quarter' then 90
    when 'half_year' then 182
    when 'year' then 365
    else 1
  end;
$$;

-- Preview function, extended: for 'hour', unchanged exact-instant-per-hour
-- logic (0028). For any longer period, each candidate start hour's
-- availability now reflects the long-term overlap pool instead.
create or replace function resource_hour_slots(p_resource_id uuid, p_date date, p_period booking_period default 'hour')
returns table(hour int, taken int, capacity int, is_available boolean, is_past boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_units     int;
  v_centre_id uuid;
  v_dow       int;
  v_is_open   boolean;
  v_open_time time;
  v_close_time time;
  v_open      int;
  v_close     int;
begin
  select unit_count, centre_id into v_units, v_centre_id from resources where id = p_resource_id and is_active = true;
  if v_units is null then
    return;
  end if;

  v_dow := extract(dow from p_date)::int;

  select is_open, opening_time, closing_time into v_is_open, v_open_time, v_close_time
  from centre_hours where centre_id = v_centre_id and day_of_week = v_dow;

  if found and not v_is_open then
    return; -- closed this day of the week: no bookable slots at all
  end if;

  if found then
    v_open := extract(hour from v_open_time)::int;
    v_close := extract(hour from v_close_time)::int;
  else
    select coalesce(extract(hour from br.opening_time)::int, 6),
           coalesce(extract(hour from br.closing_time)::int, 23)
      into v_open, v_close
    from booking_rules br where br.centre_id = v_centre_id;
    if not found then
      v_open := 6; v_close := 23;
    end if;
  end if;

  if p_period = 'hour' then
    return query
    with hours as (
      select generate_series(v_open, greatest(v_open, v_close - 1)) as h
    ),
    bounds as (
      select hh.h, (p_date::text || ' ' || lpad(hh.h::text, 2, '0') || ':00:00+05:30')::timestamptz as slot_start
      from hours hh
    )
    select
      b.h,
      coalesce(cnt.n, 0)::int,
      v_units,
      (coalesce(cnt.n, 0) < v_units) and (b.slot_start > now()),
      b.slot_start <= now()
    from bounds b
    left join lateral (
      select count(*) as n from bookings bk
      where bk.resource_id = p_resource_id
        and bk.status in ('pending', 'confirmed')
        and bk.period = 'hour'
        and bk.starts_at = b.slot_start
    ) cnt on true
    order by b.h;
  else
    return query
    with hours as (
      select generate_series(v_open, greatest(v_open, v_close - 1)) as h
    ),
    bounds as (
      select
        hh.h,
        (p_date::text || ' ' || lpad(hh.h::text, 2, '0') || ':00:00+05:30')::timestamptz as slot_start,
        (p_date::text || ' ' || lpad(hh.h::text, 2, '0') || ':00:00+05:30')::timestamptz + (period_days(p_period) || ' days')::interval as slot_end
      from hours hh
    )
    select
      b.h,
      coalesce(cnt.n, 0)::int,
      v_units,
      (coalesce(cnt.n, 0) < v_units) and (b.slot_start > now()),
      b.slot_start <= now()
    from bounds b
    left join lateral (
      select count(*) as n from bookings bk
      where bk.resource_id = p_resource_id
        and bk.status in ('pending', 'confirmed')
        and bk.period != 'hour'
        and tstzrange(bk.starts_at, bk.ends_at, '[)') && tstzrange(b.slot_start, b.slot_end, '[)')
    ) cnt on true
    order by b.h;
  end if;
end;
$$;
revoke all on function resource_hour_slots(uuid, date, booking_period) from public;
grant execute on function resource_hour_slots(uuid, date, booking_period) to anon, authenticated;

-- Single-slot booking (day/week/fortnight/month/quarter/half_year/year).
-- Same closed-day guard as before; capacity now checks the long-term pool.
create or replace function book_seat(
  p_centre_id  uuid,
  p_resource_id uuid,
  p_period     booking_period,
  p_starts_at  timestamptz,
  p_ends_at    timestamptz,
  p_amount     numeric
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_units  int;
  v_taken  int;
  v_id     uuid;
  v_open   boolean;
begin
  if v_user is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;

  select unit_count into v_units
  from resources
  where id = p_resource_id and centre_id = p_centre_id and is_active = true
  for update;

  if v_units is null then
    raise exception 'RESOURCE_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_open := centre_is_open_on(p_centre_id, (p_starts_at at time zone 'Asia/Kolkata')::date);
  if not v_open then
    raise exception 'CENTRE_CLOSED' using errcode = 'P0003';
  end if;

  if p_period = 'hour' then
    select count(*) into v_taken
    from bookings
    where resource_id = p_resource_id
      and status in ('pending','confirmed')
      and period = 'hour'
      and starts_at = p_starts_at;
  else
    select count(*) into v_taken
    from bookings
    where resource_id = p_resource_id
      and status in ('pending','confirmed')
      and period != 'hour'
      and tstzrange(starts_at, ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)');
  end if;

  if v_taken >= v_units then
    raise exception 'RESOURCE_FULL' using errcode = 'P0001';
  end if;

  insert into bookings (centre_id, resource_id, user_id, period, starts_at, ends_at, amount, status, payment)
  values (p_centre_id, p_resource_id, v_user, p_period, p_starts_at, p_ends_at, p_amount, 'pending', 'unpaid')
  returning id into v_id;

  return v_id;
end;
$$;

-- Multi-hour booking: books several specific hours in ONE call, all-or-
-- nothing. Each hour becomes its own row (same exact-instant capacity check
-- as a single hourly booking), linked by booking_group_id.
create or replace function book_seat_multi(
  p_centre_id   uuid,
  p_resource_id uuid,
  p_date        date,
  p_hours       int[],
  p_amount_per_hour numeric
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_units   int;
  v_taken   int;
  v_group   uuid := gen_random_uuid();
  v_hour    int;
  v_starts  timestamptz;
  v_ends    timestamptz;
  v_open    boolean;
begin
  if v_user is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;
  if p_hours is null or array_length(p_hours, 1) is null then
    raise exception 'NO_HOURS_SELECTED' using errcode = 'P0004';
  end if;

  select unit_count into v_units
  from resources
  where id = p_resource_id and centre_id = p_centre_id and is_active = true
  for update;

  if v_units is null then
    raise exception 'RESOURCE_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_open := centre_is_open_on(p_centre_id, p_date);
  if not v_open then
    raise exception 'CENTRE_CLOSED' using errcode = 'P0003';
  end if;

  -- Check EVERY requested hour is available before inserting any of them —
  -- all-or-nothing, so a partially-full set of hours doesn't leave the
  -- student with, say, 9 AM and 11 AM booked but not 10 AM.
  foreach v_hour in array p_hours loop
    v_starts := (p_date::text || ' ' || lpad(v_hour::text, 2, '0') || ':00:00+05:30')::timestamptz;
    v_ends := v_starts + interval '1 hour';

    select count(*) into v_taken
    from bookings
    where resource_id = p_resource_id
      and status in ('pending','confirmed')
      and period = 'hour'
      and starts_at = v_starts;

    if v_taken >= v_units then
      raise exception 'RESOURCE_FULL' using errcode = 'P0001';
    end if;
  end loop;

  foreach v_hour in array p_hours loop
    v_starts := (p_date::text || ' ' || lpad(v_hour::text, 2, '0') || ':00:00+05:30')::timestamptz;
    v_ends := v_starts + interval '1 hour';
    insert into bookings (centre_id, resource_id, user_id, period, starts_at, ends_at, amount, status, payment, booking_group_id)
    values (p_centre_id, p_resource_id, v_user, 'hour', v_starts, v_ends, p_amount_per_hour, 'pending', 'unpaid', v_group);
  end loop;

  return v_group;
end;
$$;
revoke all on function book_seat_multi(uuid, uuid, date, int[], numeric) from public;
grant execute on function book_seat_multi(uuid, uuid, date, int[], numeric) to authenticated;


-- === 0032_wizard_fields.sql ===
-- 0032_wizard_fields.sql
-- New multi-step listing wizard needs a few fields that didn't exist before:
-- a business logo (separate from the cover photo), a broken-out address
-- (city/state/postcode/country, not just one address line), a second phone
-- number and a business email, and a category label on gallery photos so
-- the wizard's 8 named slots (Exterior View, Reception, etc.) can remember
-- which slot each photo was uploaded into. Additive only.

alter table centres add column if not exists logo_url text;
alter table centres add column if not exists city text;
alter table centres add column if not exists state text;
alter table centres add column if not exists country text not null default 'India';
alter table centres add column if not exists postcode text;
alter table centres add column if not exists alt_phone text;
alter table centres add column if not exists business_email text;

alter table listing_images add column if not exists category text;


-- === 0033_centre_tags.sql ===
-- 0033_centre_tags.sql
-- Business Tags (Quiet, Premium, Affordable, etc.) from the listing wizard's
-- Step 1 — a simple preset tag list, separate from the Popular Facilities
-- (amenities) concept, which already has its own table. Additive only.

alter table centres add column if not exists tags text[] not null default '{}';


-- === 0034_unified_seat_inventory.sql ===
-- 0034_unified_seat_inventory.sql
--
-- ROOT CAUSE OF THE REPORTED BUG: since migration 0028/0031, hourly bookings
-- and day-or-longer bookings (day/week/fortnight/month/quarter/half_year/year)
-- were checked against two SEPARATE pools (`period = 'hour'` vs
-- `period != 'hour'` in every WHERE clause). A weekly booking never reduced
-- how many hourly slots showed as available, and vice versa — exactly the
-- bug reported: "Weekly booking should leave 2 of 3 seats for that week, but
-- hourly bookings that week still saw all 3 seats free."
--
-- THE FIX: one unified per-day inventory count, reused by every capacity
-- check in the system (slot preview AND actual booking creation, for BOTH
-- hourly and day+):
--
--   resource_day_plus_count(resource, date)
--     -> how many day-or-longer bookings (week/month/etc.) cover this date.
--        A day+ booking occupies a seat for the ENTIRE day, at every hour.
--
--   resource_hour_taken(resource, date, hour)
--     -> resource_day_plus_count(date) + hourly bookings at that exact hour.
--        This is "how many seats are occupied right at this hour" — the
--        correct number to compare an HOURLY request against.
--
--   resource_day_worst_hour_taken(resource, date, open_hour, close_hour)
--     -> the busiest single hour that day (max hourly-only count across
--        operating hours), used when checking whether a NEW day+ booking
--        can be added: a day+ pass must have a seat free at every hour of
--        every day in its range, so we check the day's worst moment.
--
-- Nothing about the schema changes — same `bookings` table, same columns,
-- same period enum. This only replaces the PL/pgSQL capacity-checking
-- functions with correct logic, matching the "IMPORTANT: do not redesign
-- the database" instruction.

-- 1) Day+ bookings covering a given date (unchanged concept from 0031, but
--    now given its own reusable name instead of being inlined everywhere).
create or replace function resource_day_plus_count(p_resource_id uuid, p_date date)
returns int
language sql stable as $$
  select count(*)::int
  from bookings bk
  where bk.resource_id = p_resource_id
    and bk.status in ('pending', 'confirmed')
    and bk.period != 'hour'
    and tstzrange(bk.starts_at, bk.ends_at, '[)') &&
        tstzrange((p_date::text || ' 00:00:00+05:30')::timestamptz,
                   (p_date::text || ' 00:00:00+05:30')::timestamptz + interval '1 day', '[)');
$$;

-- 2) Unified occupancy for one exact hour: day+ bookings covering that date
--    (they occupy every hour) PLUS hourly bookings at that specific hour.
--    This is the number an HOURLY booking request must stay under.
create or replace function resource_hour_taken(p_resource_id uuid, p_date date, p_hour int)
returns int
language sql stable as $$
  select resource_day_plus_count(p_resource_id, p_date) + coalesce((
    select count(*)::int
    from bookings bk
    where bk.resource_id = p_resource_id
      and bk.status in ('pending', 'confirmed')
      and bk.period = 'hour'
      and bk.starts_at = (p_date::text || ' ' || lpad(p_hour::text, 2, '0') || ':00:00+05:30')::timestamptz
  ), 0);
$$;

-- 3) The busiest single hour of a day, HOURLY BOOKINGS ONLY (day+ bookings
--    are added on top of this separately, by whoever is asking). Used when
--    validating a NEW day+ booking: it needs a free seat at every hour of
--    every day in its range, so we must check the day's worst moment, not
--    just an average.
create or replace function resource_day_worst_hour_taken(p_resource_id uuid, p_date date, p_open_hour int, p_close_hour int)
returns int
language sql stable as $$
  select coalesce(max(cnt), 0)::int
  from (
    select count(*) as cnt
    from bookings bk
    where bk.resource_id = p_resource_id
      and bk.status in ('pending', 'confirmed')
      and bk.period = 'hour'
      and bk.starts_at >= (p_date::text || ' ' || lpad(p_open_hour::text, 2, '0') || ':00:00+05:30')::timestamptz
      and bk.starts_at <  (p_date::text || ' ' || lpad(greatest(p_open_hour, p_close_hour)::text, 2, '0') || ':00:00+05:30')::timestamptz
    group by bk.starts_at
  ) hourly_counts;
$$;

revoke all on function resource_day_plus_count(uuid, date) from public;
revoke all on function resource_hour_taken(uuid, date, int) from public;
revoke all on function resource_day_worst_hour_taken(uuid, date, int, int) from public;
grant execute on function resource_day_plus_count(uuid, date) to anon, authenticated;
grant execute on function resource_hour_taken(uuid, date, int) to anon, authenticated;
grant execute on function resource_day_worst_hour_taken(uuid, date, int, int) to anon, authenticated;

-- 4) Preview function (drives the booking page's slot picker) — now uses
--    the unified counts above instead of the old period-scoped pools.
create or replace function resource_hour_slots(p_resource_id uuid, p_date date, p_period booking_period default 'hour')
returns table(hour int, taken int, capacity int, is_available boolean, is_past boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_units     int;
  v_centre_id uuid;
  v_dow       int;
  v_is_open   boolean;
  v_open_time time;
  v_close_time time;
  v_open      int;
  v_close     int;
begin
  select unit_count, centre_id into v_units, v_centre_id from resources where id = p_resource_id and is_active = true;
  if v_units is null then
    return;
  end if;

  v_dow := extract(dow from p_date)::int;

  select is_open, opening_time, closing_time into v_is_open, v_open_time, v_close_time
  from centre_hours where centre_id = v_centre_id and day_of_week = v_dow;

  if found and not v_is_open then
    return; -- closed this day of the week: no bookable slots at all
  end if;

  if found then
    v_open := extract(hour from v_open_time)::int;
    v_close := extract(hour from v_close_time)::int;
  else
    select coalesce(extract(hour from br.opening_time)::int, 6),
           coalesce(extract(hour from br.closing_time)::int, 23)
      into v_open, v_close
    from booking_rules br where br.centre_id = v_centre_id;
    if not found then
      v_open := 6; v_close := 23;
    end if;
  end if;

  if p_period = 'hour' then
    return query
    with hours as (
      select generate_series(v_open, greatest(v_open, v_close - 1)) as h
    ),
    bounds as (
      select hh.h, (p_date::text || ' ' || lpad(hh.h::text, 2, '0') || ':00:00+05:30')::timestamptz as slot_start
      from hours hh
    )
    select
      b.h,
      resource_hour_taken(p_resource_id, p_date, b.h),
      v_units,
      (resource_hour_taken(p_resource_id, p_date, b.h) < v_units) and (b.slot_start > now()),
      b.slot_start <= now()
    from bounds b
    order by b.h;
  else
    -- Day-or-longer preview: every "start hour" for this period shares the
    -- SAME real constraint — every day in the resulting range must have a
    -- seat free at its busiest hour. There's no meaningful per-hour
    -- distinction for a multi-day pass, but the function's shape (one row
    -- per operating hour) is kept so the frontend doesn't need special-
    -- casing — every row for a given date now reports the same number.
    declare
      v_end_date date := p_date + (period_days(p_period) || ' days')::interval;
      v_max_taken int := 0;
      v_day date;
      v_day_taken int;
    begin
      v_day := p_date;
      while v_day < v_end_date loop
        v_day_taken := resource_day_plus_count(p_resource_id, v_day)
                     + resource_day_worst_hour_taken(p_resource_id, v_day, v_open, v_close);
        if v_day_taken > v_max_taken then
          v_max_taken := v_day_taken;
        end if;
        v_day := v_day + 1;
      end loop;

      return query
      with hours as (
        select generate_series(v_open, greatest(v_open, v_close - 1)) as h
      ),
      bounds as (
        select hh.h, (p_date::text || ' ' || lpad(hh.h::text, 2, '0') || ':00:00+05:30')::timestamptz as slot_start
        from hours hh
      )
      select
        b.h,
        v_max_taken,
        v_units,
        (v_max_taken < v_units) and (b.slot_start > now()),
        b.slot_start <= now()
      from bounds b
      order by b.h;
    end;
  end if;
end;
$$;
revoke all on function resource_hour_slots(uuid, date, booking_period) from public;
grant execute on function resource_hour_slots(uuid, date, booking_period) to anon, authenticated;

-- 5) Single-slot booking (day/week/fortnight/month/quarter/half_year/year) —
--    now validates EVERY day in the range against the unified count instead
--    of only checking overlap against other day+ bookings.
create or replace function book_seat(
  p_centre_id  uuid,
  p_resource_id uuid,
  p_period     booking_period,
  p_starts_at  timestamptz,
  p_ends_at    timestamptz,
  p_amount     numeric
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user       uuid := auth.uid();
  v_units      int;
  v_id         uuid;
  v_open_flag  boolean;
  v_day        date;
  v_end_date   date;
  v_day_taken  int;
  v_open_hour  int;
  v_close_hour int;
  v_centre_hours_row record;
begin
  if v_user is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;

  select unit_count into v_units
  from resources
  where id = p_resource_id and centre_id = p_centre_id and is_active = true
  for update;

  if v_units is null then
    raise exception 'RESOURCE_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_open_flag := centre_is_open_on(p_centre_id, (p_starts_at at time zone 'Asia/Kolkata')::date);
  if not v_open_flag then
    raise exception 'CENTRE_CLOSED' using errcode = 'P0003';
  end if;

  if p_period = 'hour' then
    if resource_hour_taken(p_resource_id, (p_starts_at at time zone 'Asia/Kolkata')::date,
                            extract(hour from p_starts_at at time zone 'Asia/Kolkata')::int) >= v_units then
      raise exception 'RESOURCE_FULL' using errcode = 'P0001';
    end if;
  else
    -- Every day in the requested range must have a seat free at its
    -- busiest hour — this is what actually guarantees a day+ pass-holder
    -- can always find a seat, any time they show up.
    v_day := (p_starts_at at time zone 'Asia/Kolkata')::date;
    v_end_date := (p_ends_at at time zone 'Asia/Kolkata')::date;
    while v_day < v_end_date loop
      select coalesce(extract(hour from opening_time)::int, 6), coalesce(extract(hour from closing_time)::int, 23)
        into v_open_hour, v_close_hour
      from centre_hours where centre_id = p_centre_id and day_of_week = extract(dow from v_day)::int and is_open;
      if not found then
        v_open_hour := 6; v_close_hour := 23;
      end if;

      v_day_taken := resource_day_plus_count(p_resource_id, v_day)
                   + resource_day_worst_hour_taken(p_resource_id, v_day, v_open_hour, v_close_hour);
      if v_day_taken >= v_units then
        raise exception 'RESOURCE_FULL' using errcode = 'P0001';
      end if;
      v_day := v_day + 1;
    end loop;
  end if;

  insert into bookings (centre_id, resource_id, user_id, period, starts_at, ends_at, amount, status, payment)
  values (p_centre_id, p_resource_id, v_user, p_period, p_starts_at, p_ends_at, p_amount, 'pending', 'unpaid')
  returning id into v_id;

  return v_id;
end;
$$;

-- 6) Multi-hour booking — same unified check per requested hour.
create or replace function book_seat_multi(
  p_centre_id   uuid,
  p_resource_id uuid,
  p_date        date,
  p_hours       int[],
  p_amount_per_hour numeric
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_units   int;
  v_group   uuid := gen_random_uuid();
  v_hour    int;
  v_starts  timestamptz;
  v_ends    timestamptz;
  v_open    boolean;
begin
  if v_user is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;
  if p_hours is null or array_length(p_hours, 1) is null then
    raise exception 'NO_HOURS_SELECTED' using errcode = 'P0004';
  end if;

  select unit_count into v_units
  from resources
  where id = p_resource_id and centre_id = p_centre_id and is_active = true
  for update;

  if v_units is null then
    raise exception 'RESOURCE_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_open := centre_is_open_on(p_centre_id, p_date);
  if not v_open then
    raise exception 'CENTRE_CLOSED' using errcode = 'P0003';
  end if;

  -- Check EVERY requested hour against the unified count before inserting
  -- any of them — all-or-nothing, and now correctly aware of any day+
  -- booking occupying a seat that day.
  foreach v_hour in array p_hours loop
    if resource_hour_taken(p_resource_id, p_date, v_hour) >= v_units then
      raise exception 'RESOURCE_FULL' using errcode = 'P0001';
    end if;
  end loop;

  foreach v_hour in array p_hours loop
    v_starts := (p_date::text || ' ' || lpad(v_hour::text, 2, '0') || ':00:00+05:30')::timestamptz;
    v_ends := v_starts + interval '1 hour';
    insert into bookings (centre_id, resource_id, user_id, period, starts_at, ends_at, amount, status, payment, booking_group_id)
    values (p_centre_id, p_resource_id, v_user, 'hour', v_starts, v_ends, p_amount_per_hour, 'pending', 'unpaid', v_group);
  end loop;

  return v_group;
end;
$$;


-- === 0035_reschedule_booking_group.sql ===
-- 0035_reschedule_booking_group.sql
--
-- PROBLEM: the existing rescheduleBooking flow calls book_seat() — the
-- single-row day+ booking function — even for HOURLY bookings. But every
-- hourly booking (1 hour or many) is actually created by book_seat_multi(),
-- which stores one row PER HOUR, all sharing one booking_group_id. So
-- rescheduling "one hour" of a 3-hour group only ever touched that one row,
-- silently detaching it from its group and losing the other hours from the
-- student's own view of what they'd booked.
--
-- FIX: a single new function, reschedule_booking_group(), that treats the
-- WHOLE group as the unit of rescheduling — exactly matching how the group
-- was created in the first place:
--   1. Load every ACTIVE (pending/confirmed) booking in the group, ordered
--      by starts_at. Their count IS the original duration (3 rows = 3 hours).
--   2. From the new requested start time, generate that same number of
--      consecutive hours (new_start, new_start+1h, new_start+2h, ...).
--   3. Validate EVERY generated hour against the real, unified seat
--      inventory (the same day+/hourly-combined check from 0034) — but
--      excluding this group's OWN old rows from the "taken" count, so
--      rescheduling into an overlapping time (e.g. 9-12 -> 10-13) doesn't
--      falsely reject against itself.
--   4. If even one hour fails, the function raises immediately and nothing
--      is written — Postgres rolls back automatically inside a single
--      function invocation, so there is no possible partial state.
--   5. If every hour passes, insert all the new rows (same booking_group_id,
--      each linked via rescheduled_from to its corresponding old row), then
--      cancel every old row. New rows are created BEFORE old ones are
--      cancelled, same acquire-then-release ordering as the existing single-
--      booking reschedule, so a late failure never leaves the student with
--      nothing booked.

create or replace function reschedule_booking_group(
  p_booking_group_id uuid,
  p_new_starts_at    timestamptz
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user       uuid := auth.uid();
  v_old_ids    uuid[] := '{}';
  v_count      int := 0;
  v_centre_id  uuid;
  v_resource_id uuid;
  v_amount     numeric;
  v_units      int;
  v_new_start  timestamptz;
  v_new_end    timestamptz;
  v_taken      int;
  v_new_id     uuid;
  v_row        record;
  i            int;
begin
  if v_user is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;

  -- 1. Gather every active booking in the group, ordered by start time.
  --    Their count is the original duration; ownership is checked per row.
  for v_row in
    select id, centre_id, resource_id, amount, user_id
    from bookings
    where booking_group_id = p_booking_group_id
      and status in ('pending', 'confirmed')
      and period = 'hour'
    order by starts_at
  loop
    if v_row.user_id <> v_user then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
    v_old_ids := array_append(v_old_ids, v_row.id);
    v_centre_id := v_row.centre_id;
    v_resource_id := v_row.resource_id;
    v_amount := v_row.amount;
    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  select unit_count into v_units
  from resources
  where id = v_resource_id and is_active = true
  for update;

  if v_units is null then
    raise exception 'RESOURCE_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- 2 + 3. Generate the new hour range and validate EVERY hour before
  -- writing anything. Unified check: any OTHER booking (hourly at this
  -- exact hour, or a day+ booking overlapping this hour) counts against
  -- capacity — this group's own old rows are explicitly excluded so an
  -- overlapping reschedule doesn't reject against itself.
  for i in 0 .. (v_count - 1) loop
    v_new_start := p_new_starts_at + (i || ' hours')::interval;
    v_new_end := v_new_start + interval '1 hour';

    if not centre_is_open_on(v_centre_id, (v_new_start at time zone 'Asia/Kolkata')::date) then
      raise exception 'CENTRE_CLOSED' using errcode = 'P0003';
    end if;

    select count(*) into v_taken
    from bookings bk
    where bk.resource_id = v_resource_id
      and bk.status in ('pending', 'confirmed')
      and not (bk.id = any(v_old_ids))
      and (
        (bk.period = 'hour' and bk.starts_at = v_new_start)
        or (bk.period <> 'hour' and tstzrange(bk.starts_at, bk.ends_at, '[)') && tstzrange(v_new_start, v_new_end, '[)'))
      );

    if v_taken >= v_units then
      -- Selected time range is not fully available — abort. Nothing has
      -- been inserted or cancelled yet, so there is nothing to roll back;
      -- raising here simply ends the function and the whole transaction.
      raise exception 'RANGE_UNAVAILABLE' using errcode = 'P0001';
    end if;
  end loop;

  -- 4. Every hour is available — commit the whole move as one unit.
  -- New rows first (acquire), old rows cancelled after (release), so a
  -- failure past this point still leaves the original booking intact.
  for i in 0 .. (v_count - 1) loop
    v_new_start := p_new_starts_at + (i || ' hours')::interval;
    v_new_end := v_new_start + interval '1 hour';
    insert into bookings (
      centre_id, resource_id, user_id, period, starts_at, ends_at,
      amount, status, payment, booking_group_id, rescheduled_from
    ) values (
      v_centre_id, v_resource_id, v_user, 'hour', v_new_start, v_new_end,
      v_amount, 'pending', 'unpaid', p_booking_group_id, v_old_ids[i + 1]
    )
    returning id into v_new_id;
  end loop;

  for i in 1 .. v_count loop
    perform cancel_booking(v_old_ids[i], 'rescheduled');
  end loop;

  return p_booking_group_id;
end;
$$;

revoke all on function reschedule_booking_group(uuid, timestamptz) from public;
grant execute on function reschedule_booking_group(uuid, timestamptz) to authenticated;


-- === 0036_payment_failed_status.sql ===
-- 0036_payment_failed_status.sql
--
-- The booking confirmation page needs to distinguish "payment hasn't been
-- attempted yet" from "a payment attempt genuinely failed" — but the
-- payment_status enum had no value for the latter, and the Razorpay webhook
-- never handled payment.failed events at all. A failed charge was
-- indistinguishable from a booking nobody had tried to pay for yet.

alter type payment_status add value if not exists 'failed';


-- === 0037_full_text_search.sql ===
-- 0037_full_text_search.sql
--
-- The existing centre search only matched name/area/address via PostgREST's
-- .or() filter. Facilities (amenities, a joined table) and tags (a text[]
-- array column) can't be expressed in that same .or() string at all, and
-- city/description weren't included either — so a search for e.g. "WiFi",
-- "Quiet", or a centre's city never found anything, even when the centre
-- genuinely had that facility/tag.
--
-- This function centralises the full match logic in one place so every
-- caller (the /centres page search, the public /api/centres route, and any
-- future caller) searches the same fields the same way.

create or replace function search_centres_by_text(p_query text)
returns table (id uuid)
language sql
stable
as $$
  select distinct c.id
  from centres c
  where c.is_published = true
    and (
      c.name ilike '%' || p_query || '%'
      or c.area ilike '%' || p_query || '%'
      or c.city ilike '%' || p_query || '%'
      or c.address ilike '%' || p_query || '%'
      or c.description ilike '%' || p_query || '%'
      or exists (
        select 1 from unnest(c.tags) as t(tag)
        where t.tag ilike '%' || p_query || '%'
      )
      or exists (
        select 1
        from centre_amenities ca
        join amenities a on a.id = ca.amenity_id
        where ca.centre_id = c.id
          and a.label ilike '%' || p_query || '%'
      )
    );
$$;

revoke all on function search_centres_by_text(text) from public;
grant execute on function search_centres_by_text(text) to authenticated, anon;


-- === 0038_reservation_timeout.sql ===
-- 0038_reservation_timeout.sql
--
-- REGRESSION FOUND: migration 0011 built a real reservation-hold system —
-- bookings.expires_at, booking_rules.hold_minutes (per-centre, default 15
-- min), and expire_pending_bookings() (a sweep meant to run on a schedule).
-- But every capacity-checking function written since (0028, 0031, 0034)
-- was redefined from scratch and never set expires_at on insert, nor
-- checked it when counting how many seats are taken. The result: every
-- booking's expires_at has been NULL forever, so a pending/unpaid booking
-- has always held its seat indefinitely — no timeout ever actually applied,
-- and expire_pending_bookings() had nothing to find (its WHERE clause
-- requires expires_at is not null).
--
-- THIS MIGRATION:
--   1. Every unified capacity-count function (0034) now excludes a pending
--      booking once its hold has lapsed (status='pending' AND expires_at
--      is not null AND expires_at < now()) — a lapsed hold stops occupying
--      a seat immediately, even before the sweep runs. This is what lets a
--      second user book the same seat the moment a hold expires, without
--      waiting for a cron tick.
--   2. book_seat(), book_seat_multi(), and reschedule_booking_group() (0035)
--      now actually SET expires_at on every new pending/unpaid row, reading
--      the per-centre booking_rules.hold_minutes (falling back to 10
--      minutes if a centre has no booking_rules row configured).
--   3. reschedule_booking_group()'s own inline availability check gets the
--      same expiry exclusion (it has its own query, separate from the
--      shared functions above, since it also excludes the group's own old
--      rows).
--   4. expire_pending_bookings() (already built in 0011) is left as-is —
--      it's correct — but see the accompanying API route + Vercel Cron
--      config that actually invokes it on a schedule, since nothing did.

-- 1. Unified capacity functions — add the expiry exclusion.
create or replace function resource_day_plus_count(p_resource_id uuid, p_date date)
returns int
language sql stable as $$
  select count(*)::int
  from bookings bk
  where bk.resource_id = p_resource_id
    and bk.status in ('pending', 'confirmed')
    and not (bk.status = 'pending' and bk.expires_at is not null and bk.expires_at < now())
    and bk.period != 'hour'
    and tstzrange(bk.starts_at, bk.ends_at, '[)') &&
        tstzrange((p_date::text || ' 00:00:00+05:30')::timestamptz,
                   (p_date::text || ' 00:00:00+05:30')::timestamptz + interval '1 day', '[)');
$$;

create or replace function resource_hour_taken(p_resource_id uuid, p_date date, p_hour int)
returns int
language sql stable as $$
  select resource_day_plus_count(p_resource_id, p_date) + coalesce((
    select count(*)::int
    from bookings bk
    where bk.resource_id = p_resource_id
      and bk.status in ('pending', 'confirmed')
      and not (bk.status = 'pending' and bk.expires_at is not null and bk.expires_at < now())
      and bk.period = 'hour'
      and bk.starts_at = (p_date::text || ' ' || lpad(p_hour::text, 2, '0') || ':00:00+05:30')::timestamptz
  ), 0);
$$;

create or replace function resource_day_worst_hour_taken(p_resource_id uuid, p_date date, p_open_hour int, p_close_hour int)
returns int
language sql stable as $$
  select coalesce(max(cnt), 0)::int
  from (
    select count(*) as cnt
    from bookings bk
    where bk.resource_id = p_resource_id
      and bk.status in ('pending', 'confirmed')
      and not (bk.status = 'pending' and bk.expires_at is not null and bk.expires_at < now())
      and bk.period = 'hour'
      and bk.starts_at >= (p_date::text || ' ' || lpad(p_open_hour::text, 2, '0') || ':00:00+05:30')::timestamptz
      and bk.starts_at <  (p_date::text || ' ' || lpad(greatest(p_open_hour, p_close_hour)::text, 2, '0') || ':00:00+05:30')::timestamptz
    group by bk.starts_at
  ) hourly_counts;
$$;

-- 2. book_seat() — now sets expires_at on the new pending row.
create or replace function book_seat(
  p_centre_id  uuid,
  p_resource_id uuid,
  p_period     booking_period,
  p_starts_at  timestamptz,
  p_ends_at    timestamptz,
  p_amount     numeric
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user       uuid := auth.uid();
  v_units      int;
  v_id         uuid;
  v_open_flag  boolean;
  v_day        date;
  v_end_date   date;
  v_day_taken  int;
  v_open_hour  int;
  v_close_hour int;
  v_hold_min   int;
begin
  if v_user is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;

  select unit_count into v_units
  from resources
  where id = p_resource_id and centre_id = p_centre_id and is_active = true
  for update;

  if v_units is null then
    raise exception 'RESOURCE_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_open_flag := centre_is_open_on(p_centre_id, (p_starts_at at time zone 'Asia/Kolkata')::date);
  if not v_open_flag then
    raise exception 'CENTRE_CLOSED' using errcode = 'P0003';
  end if;

  if p_period = 'hour' then
    if resource_hour_taken(p_resource_id, (p_starts_at at time zone 'Asia/Kolkata')::date,
                            extract(hour from p_starts_at at time zone 'Asia/Kolkata')::int) >= v_units then
      raise exception 'RESOURCE_FULL' using errcode = 'P0001';
    end if;
  else
    v_day := (p_starts_at at time zone 'Asia/Kolkata')::date;
    v_end_date := (p_ends_at at time zone 'Asia/Kolkata')::date;
    while v_day < v_end_date loop
      select coalesce(extract(hour from opening_time)::int, 6), coalesce(extract(hour from closing_time)::int, 23)
        into v_open_hour, v_close_hour
      from centre_hours where centre_id = p_centre_id and day_of_week = extract(dow from v_day)::int and is_open;
      if not found then
        v_open_hour := 6; v_close_hour := 23;
      end if;

      v_day_taken := resource_day_plus_count(p_resource_id, v_day)
                   + resource_day_worst_hour_taken(p_resource_id, v_day, v_open_hour, v_close_hour);
      if v_day_taken >= v_units then
        raise exception 'RESOURCE_FULL' using errcode = 'P0001';
      end if;
      v_day := v_day + 1;
    end loop;
  end if;

  select coalesce(hold_minutes, 10) into v_hold_min from booking_rules where centre_id = p_centre_id;
  if not found then v_hold_min := 10; end if;

  insert into bookings (centre_id, resource_id, user_id, period, starts_at, ends_at, amount, status, payment, expires_at)
  values (p_centre_id, p_resource_id, v_user, p_period, p_starts_at, p_ends_at, p_amount, 'pending', 'unpaid', now() + (v_hold_min || ' minutes')::interval)
  returning id into v_id;

  return v_id;
end;
$$;

-- 3. book_seat_multi() — same hold, applied to every hour in the request.
create or replace function book_seat_multi(
  p_centre_id   uuid,
  p_resource_id uuid,
  p_date        date,
  p_hours       int[],
  p_amount_per_hour numeric
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_units   int;
  v_group   uuid := gen_random_uuid();
  v_hour    int;
  v_starts  timestamptz;
  v_ends    timestamptz;
  v_open    boolean;
  v_hold_min int;
begin
  if v_user is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;
  if p_hours is null or array_length(p_hours, 1) is null then
    raise exception 'NO_HOURS_SELECTED' using errcode = 'P0004';
  end if;

  select unit_count into v_units
  from resources
  where id = p_resource_id and centre_id = p_centre_id and is_active = true
  for update;

  if v_units is null then
    raise exception 'RESOURCE_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_open := centre_is_open_on(p_centre_id, p_date);
  if not v_open then
    raise exception 'CENTRE_CLOSED' using errcode = 'P0003';
  end if;

  foreach v_hour in array p_hours loop
    if resource_hour_taken(p_resource_id, p_date, v_hour) >= v_units then
      raise exception 'RESOURCE_FULL' using errcode = 'P0001';
    end if;
  end loop;

  select coalesce(hold_minutes, 10) into v_hold_min from booking_rules where centre_id = p_centre_id;
  if not found then v_hold_min := 10; end if;

  foreach v_hour in array p_hours loop
    v_starts := (p_date::text || ' ' || lpad(v_hour::text, 2, '0') || ':00:00+05:30')::timestamptz;
    v_ends := v_starts + interval '1 hour';
    insert into bookings (centre_id, resource_id, user_id, period, starts_at, ends_at, amount, status, payment, booking_group_id, expires_at)
    values (p_centre_id, p_resource_id, v_user, 'hour', v_starts, v_ends, p_amount_per_hour, 'pending', 'unpaid', v_group, now() + (v_hold_min || ' minutes')::interval);
  end loop;

  return v_group;
end;
$$;

-- 4. reschedule_booking_group() (0035) — same expiry exclusion in its own
--    inline check, and the same hold applied to its new rows.
create or replace function reschedule_booking_group(
  p_booking_group_id uuid,
  p_new_starts_at    timestamptz
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user       uuid := auth.uid();
  v_old_ids    uuid[] := '{}';
  v_count      int := 0;
  v_centre_id  uuid;
  v_resource_id uuid;
  v_amount     numeric;
  v_units      int;
  v_new_start  timestamptz;
  v_new_end    timestamptz;
  v_taken      int;
  v_new_id     uuid;
  v_row        record;
  v_hold_min   int;
  i            int;
begin
  if v_user is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;

  for v_row in
    select id, centre_id, resource_id, amount, user_id
    from bookings
    where booking_group_id = p_booking_group_id
      and status in ('pending', 'confirmed')
      and period = 'hour'
    order by starts_at
  loop
    if v_row.user_id <> v_user then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
    v_old_ids := array_append(v_old_ids, v_row.id);
    v_centre_id := v_row.centre_id;
    v_resource_id := v_row.resource_id;
    v_amount := v_row.amount;
    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  select unit_count into v_units
  from resources
  where id = v_resource_id and is_active = true
  for update;

  if v_units is null then
    raise exception 'RESOURCE_NOT_FOUND' using errcode = 'P0002';
  end if;

  for i in 0 .. (v_count - 1) loop
    v_new_start := p_new_starts_at + (i || ' hours')::interval;
    v_new_end := v_new_start + interval '1 hour';

    if not centre_is_open_on(v_centre_id, (v_new_start at time zone 'Asia/Kolkata')::date) then
      raise exception 'CENTRE_CLOSED' using errcode = 'P0003';
    end if;

    select count(*) into v_taken
    from bookings bk
    where bk.resource_id = v_resource_id
      and bk.status in ('pending', 'confirmed')
      and not (bk.status = 'pending' and bk.expires_at is not null and bk.expires_at < now())
      and not (bk.id = any(v_old_ids))
      and (
        (bk.period = 'hour' and bk.starts_at = v_new_start)
        or (bk.period <> 'hour' and tstzrange(bk.starts_at, bk.ends_at, '[)') && tstzrange(v_new_start, v_new_end, '[)'))
      );

    if v_taken >= v_units then
      raise exception 'RANGE_UNAVAILABLE' using errcode = 'P0001';
    end if;
  end loop;

  select coalesce(hold_minutes, 10) into v_hold_min from booking_rules where centre_id = v_centre_id;
  if not found then v_hold_min := 10; end if;

  for i in 0 .. (v_count - 1) loop
    v_new_start := p_new_starts_at + (i || ' hours')::interval;
    v_new_end := v_new_start + interval '1 hour';
    insert into bookings (
      centre_id, resource_id, user_id, period, starts_at, ends_at,
      amount, status, payment, booking_group_id, rescheduled_from, expires_at
    ) values (
      v_centre_id, v_resource_id, v_user, 'hour', v_new_start, v_new_end,
      v_amount, 'pending', 'unpaid', p_booking_group_id, v_old_ids[i + 1], now() + (v_hold_min || ' minutes')::interval
    )
    returning id into v_new_id;
  end loop;

  for i in 1 .. v_count loop
    perform cancel_booking(v_old_ids[i], 'rescheduled');
  end loop;

  return p_booking_group_id;
end;
$$;


-- === 0039_refund_workflow.sql ===
-- 0039_refund_workflow.sql
--
-- Found while implementing this: refunds table has existed since migration
-- 0011 (status text: pending|processing|succeeded|failed), and
-- cancel_booking() already correctly writes cancelled_at/cancelled_by/
-- cancel_reason — but nothing has ever actually inserted a row into
-- refunds. Cancelling a PAID booking left it stuck at payment='paid'
-- forever, with no record that a refund was ever owed. Also,
-- cancel_booking() only notified the student, never the centre owner.
--
-- This migration:
--   1. cancel_booking() now auto-creates a 'pending' refund request when
--      the cancelled booking was already paid, and notifies the owner too.
--   2. review_refund() — owner/admin approves or rejects a pending refund.
--   3. complete_refund() — owner/admin marks an approved refund as actually
--      paid out (this app doesn't call Razorpay's refund API directly —
--      see the accompanying notes on why), which is what finally updates
--      the booking's payment status to 'refunded'/'partially_refunded',
--      keeping booking and refund records in sync.
--
-- refunds.status keeps its existing values valid (nothing already stored
-- is touched) and simply gains new values going forward: pending, approved,
-- rejected, completed (in addition to the pre-existing processing/succeeded/
-- failed, which — being a plain text column, not an enum — needed no schema
-- change to add).

create or replace function cancel_booking(p_booking_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_role user_role;
  v_bk bookings%rowtype;
  v_cutoff int;
  v_owner uuid;
  v_centre_name text;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  select role into v_role from profiles where id = v_user;
  select * into v_bk from bookings where id = p_booking_id for update;
  if v_bk.id is null then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if v_bk.status in ('cancelled','completed','no_show','expired','refunded') then
    raise exception 'INVALID_STATE' using errcode='P0001';
  end if;

  select owner_id, name into v_owner, v_centre_name from centres where id = v_bk.centre_id;
  select coalesce(cancel_cutoff_hours, 12) into v_cutoff from booking_rules where centre_id = v_bk.centre_id;
  v_cutoff := coalesce(v_cutoff, 12);

  -- Authorization: admin always; owner of the centre; or the booker before cutoff.
  if v_role <> 'admin' and v_user <> v_owner then
    if v_user <> v_bk.user_id then raise exception 'FORBIDDEN' using errcode='42501'; end if;
    if now() > v_bk.starts_at - (v_cutoff || ' hours')::interval then
      raise exception 'PAST_CUTOFF' using errcode='P0001';
    end if;
  end if;

  update bookings set status='cancelled', cancelled_at=now(), cancelled_by=v_user, cancel_reason=p_reason
  where id = p_booking_id;

  perform log_audit('booking.cancelled','booking', p_booking_id::text,
    jsonb_build_object('by', v_user, 'reason', p_reason));

  insert into notifications (user_id, kind, title, body, url)
  values (v_bk.user_id, 'booking_cancelled', 'Booking cancelled',
    'Your booking has been cancelled.', '/account');

  -- Owner notification — previously only the student was ever told.
  if v_owner is not null and v_owner <> v_user then
    insert into notifications (user_id, kind, title, body, url)
    values (v_owner, 'booking_cancelled', 'A booking was cancelled',
      coalesce(v_centre_name, 'Your centre') || ': a booking was just cancelled.', '/owner/bookings');
  end if;

  -- A paid booking being cancelled owes the student a refund decision —
  -- previously nothing ever recorded that this was needed at all.
  if v_bk.payment = 'paid' then
    insert into refunds (booking_id, amount, reason, status, is_partial, requested_by)
    values (p_booking_id, v_bk.amount, p_reason, 'pending', false, v_user);
    update bookings set payment = 'refund_pending' where id = p_booking_id;
  end if;

  -- Free a seat → promote the oldest waiter for this resource, if any.
  perform promote_waitlist(v_bk.resource_id);
end; $$;

-- Owner/admin decides a pending refund request. Rejecting it puts the
-- booking's payment back to 'paid' (the charge stands, unchanged).
create or replace function review_refund(p_refund_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_role user_role;
  v_refund refunds%rowtype;
  v_owner uuid;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  select role into v_role from profiles where id = v_user;

  select r.* into v_refund from refunds r where r.id = p_refund_id for update;
  if v_refund.id is null then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if v_refund.status <> 'pending' then raise exception 'INVALID_STATE' using errcode='P0001'; end if;

  select c.owner_id into v_owner
  from bookings b join centres c on c.id = b.centre_id
  where b.id = v_refund.booking_id;

  if v_role <> 'admin' and v_user <> v_owner then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  if p_approve then
    update refunds set status = 'approved', reason = coalesce(p_note, reason) where id = p_refund_id;
  else
    update refunds set status = 'rejected', reason = coalesce(p_note, reason), processed_at = now() where id = p_refund_id;
    update bookings set payment = 'paid' where id = v_refund.booking_id; -- charge stands
    insert into notifications (user_id, kind, title, body, url)
    select b.user_id, 'refund_rejected', 'Refund request declined',
      coalesce(p_note, 'Your refund request was not approved.'), '/account'
    from bookings b where b.id = v_refund.booking_id;
  end if;

  perform log_audit('refund.reviewed', 'refund', p_refund_id::text,
    jsonb_build_object('by', v_user, 'approved', p_approve, 'note', p_note));
end; $$;

-- Owner/admin marks an approved refund as actually paid out. This app does
-- not call Razorpay's refund API directly here — issuing a real refund
-- needs to be verified against a live Razorpay account, which isn't
-- something to wire up blind. Until that's built, the owner/admin processes
-- the refund via Razorpay's own dashboard, then marks it completed here —
-- which is what keeps the booking's payment status in sync.
create or replace function complete_refund(p_refund_id uuid, p_razorpay_refund_id text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_role user_role;
  v_refund refunds%rowtype;
  v_owner uuid;
  v_full_amount numeric;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  select role into v_role from profiles where id = v_user;

  select r.* into v_refund from refunds r where r.id = p_refund_id for update;
  if v_refund.id is null then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if v_refund.status <> 'approved' then raise exception 'INVALID_STATE' using errcode='P0001'; end if;

  select c.owner_id, b.amount into v_owner, v_full_amount
  from bookings b join centres c on c.id = b.centre_id
  where b.id = v_refund.booking_id;

  if v_role <> 'admin' and v_user <> v_owner then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  update refunds set status = 'completed', processed_at = now(), razorpay_refund_id = p_razorpay_refund_id
  where id = p_refund_id;

  update bookings
  set payment = case when v_refund.amount >= v_full_amount then 'refunded' else 'partially_refunded' end
  where id = v_refund.booking_id;

  insert into notifications (user_id, kind, title, body, url)
  select b.user_id, 'refund_completed', 'Refund processed',
    'Your refund has been processed.', '/account'
  from bookings b where b.id = v_refund.booking_id;

  perform log_audit('refund.completed', 'refund', p_refund_id::text, jsonb_build_object('by', v_user));
end; $$;

grant execute on function review_refund(uuid, boolean, text) to authenticated;
grant execute on function complete_refund(uuid, text) to authenticated;


-- === 0041_centre_lifecycle_actions.sql ===
-- 0041_centre_lifecycle_actions.sql
--
-- centres.status already supports 'archived' as a value, and is_published
-- already exists as a column, but there was no owner-facing action to reach
-- either — is_published only ever got set at admin-approval time, and
-- nothing ever set status='archived'. This adds the two missing actions.

-- Owner toggles visibility of an already-approved listing without losing
-- its approved status or needing re-review — e.g. taking a centre
-- temporarily offline for renovation.
create or replace function set_centre_published(p_centre_id uuid, p_published boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_role user_role;
  v_centre centres%rowtype;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  select role into v_role from profiles where id = v_user;
  select * into v_centre from centres where id = p_centre_id for update;
  if v_centre.id is null then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if v_role <> 'admin' and v_user <> v_centre.owner_id then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if v_centre.status <> 'approved' then
    raise exception 'INVALID_STATE' using errcode='P0001'; -- only approved listings can be toggled
  end if;

  update centres set is_published = p_published where id = p_centre_id;
  perform log_audit('centre.publish_toggled', 'centre', p_centre_id::text,
    jsonb_build_object('by', v_user, 'published', p_published));
end; $$;

-- Archive a listing — removes it from public view and marks it archived,
-- distinct from draft (never published) or a temporary unpublish above.
-- Reversible: archiving doesn't delete anything, matching "soft delete".
create or replace function archive_centre(p_centre_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_role user_role;
  v_centre centres%rowtype;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  select role into v_role from profiles where id = v_user;
  select * into v_centre from centres where id = p_centre_id for update;
  if v_centre.id is null then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if v_role <> 'admin' and v_user <> v_centre.owner_id then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if v_centre.status = 'archived' then
    raise exception 'INVALID_STATE' using errcode='P0001';
  end if;

  update centres set status = 'archived', is_published = false where id = p_centre_id;
  perform log_audit('centre.archived', 'centre', p_centre_id::text, jsonb_build_object('by', v_user));
end; $$;

-- Restore an archived listing back to draft (owner reviews/re-submits from
-- there, same as any new listing) — never straight back to approved,
-- since whatever made it worth archiving deserves a fresh look first.
create or replace function unarchive_centre(p_centre_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_role user_role;
  v_centre centres%rowtype;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  select role into v_role from profiles where id = v_user;
  select * into v_centre from centres where id = p_centre_id for update;
  if v_centre.id is null then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if v_role <> 'admin' and v_user <> v_centre.owner_id then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if v_centre.status <> 'archived' then
    raise exception 'INVALID_STATE' using errcode='P0001';
  end if;

  update centres set status = 'draft' where id = p_centre_id;
  perform log_audit('centre.unarchived', 'centre', p_centre_id::text, jsonb_build_object('by', v_user));
end; $$;

grant execute on function set_centre_published(uuid, boolean) to authenticated;
grant execute on function archive_centre(uuid) to authenticated;
grant execute on function unarchive_centre(uuid) to authenticated;


-- === 0042_remove_hardcoded_location_default.sql ===
-- 0042_remove_hardcoded_location_default.sql
--
-- locations.city defaulted to 'Warangal' — meaning any future location
-- row created without explicitly setting a city would silently inherit a
-- hardcoded sample city. Dropping the default doesn't touch any existing
-- row; it just requires city to be specified explicitly going forward.

alter table locations alter column city drop default;


-- === 0043_account_status.sql ===
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


-- === 0044_review_edit_and_owner_response.sql ===
-- 0044_review_edit_and_owner_response.sql
--
-- Reviews had no way for a student to edit or delete their own review, and
-- no column at all for an owner to respond to one. Adding both — owner
-- responses as new columns (nothing existing is touched), and edit/delete
-- enforced via RLS so only the review's own author (or admin) can act on it.

alter table reviews add column if not exists owner_response text;
alter table reviews add column if not exists owner_responded_at timestamptz;
alter table reviews add column if not exists updated_at timestamptz not null default now();

-- Author can update their own review's rating/body.
drop policy if exists "reviews author update" on reviews;
create policy "reviews author update" on reviews
  for update using (auth.uid() = author_id) with check (auth.uid() = author_id);

-- Author (or admin) can delete their own review.
drop policy if exists "reviews author delete" on reviews;
create policy "reviews author delete" on reviews
  for delete using (auth.uid() = author_id or auth_role() = 'admin');

-- Centre owner can set/update just the response fields — enforced by the
-- function below rather than a column-level RLS policy (Postgres RLS can't
-- restrict which columns an UPDATE touches on its own).
create or replace function respond_to_review(p_review_id uuid, p_response text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_role user_role;
  v_owner uuid;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  select role into v_role from profiles where id = v_user;

  select c.owner_id into v_owner
  from reviews r join centres c on c.id = r.centre_id
  where r.id = p_review_id;
  if v_owner is null then raise exception 'NOT_FOUND' using errcode='P0002'; end if;

  if v_role <> 'admin' and v_user <> v_owner then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  update reviews set owner_response = p_response, owner_responded_at = now() where id = p_review_id;
  perform log_audit('review.responded', 'review', p_review_id::text, jsonb_build_object('by', v_user));
end; $$;

grant execute on function respond_to_review(uuid, text) to authenticated;


-- === 0045_bookings_column_grants.sql ===
-- 0045_bookings_column_grants.sql
--
-- FINDING: the "bookings own update" RLS policy (0008_bookings.sql) lets a
-- student update their own booking row, and an owner update rows at their
-- centres — but RLS's USING clause only controls *row* visibility, not
-- *column* access. Since every state-changing update (confirm, cancel,
-- reschedule, check-in, refund) is meant to go through a SECURITY DEFINER
-- function or the service-role client (both of which bypass this policy
-- entirely), nothing legitimate needed the ability to update arbitrary
-- columns through it — but nothing had ever restricted it either. In
-- practice this meant: any authenticated student could call
--   PATCH /rest/v1/bookings?id=eq.<their_own_booking_id>
--   { "status": "confirmed", "payment": "paid" }
-- directly against Supabase's REST API using their own valid session token,
-- and RLS would allow it, because the row genuinely is theirs.
--
-- FIX: Postgres supports column-level grants alongside row-level RLS. I
-- traced every direct (non-service-role) .update() call on bookings across
-- the codebase — only two columns are ever legitimately set this way:
--   - razorpay_order_id  (student starting a payment attempt on their own booking)
--   - rescheduled_from   (student completing a reschedule, tagging history)
-- Every other mutation (status, payment, amount, cancelled_at, etc.) already
-- goes through cancel_booking(), reschedule_booking_group(), the Razorpay
-- webhook, or the service-role client — none of which are affected by this
-- table-level grant change, since SECURITY DEFINER functions and the
-- service-role key both bypass grants and RLS alike.

revoke update on bookings from authenticated;
grant update (razorpay_order_id, rescheduled_from) on bookings to authenticated;

-- SAME CLASS OF ISSUE ON centres: the "centres owner update" policy lets an
-- owner update any column on their own centre row, including is_verified,
-- is_published, and status — none of which the application code intends an
-- owner to set directly. is_verified is an admin-only attestation (the
-- owner-facing forms deliberately never expose it); is_published and status
-- are meant to move only through set_centre_published()/archive_centre()/
-- admin approval — but nothing had ever stopped a direct
--   PATCH /rest/v1/centres?id=eq.<own_centre_id>
--   { "is_verified": true, "status": "approved" }
-- from succeeding, since RLS only checks row ownership.
--
-- One legitimate exception existed: submitForReview() directly set
-- status='pending_review' via the regular client — moved into a proper
-- SECURITY DEFINER function below (matching the same pattern already used
-- for archive_centre/unarchive_centre/set_centre_published), which validates
-- the transition is only ever draft/rejected -> pending_review.
revoke update (is_verified, is_published, status, owner_id) on centres from authenticated;

create or replace function submit_centre_for_review(p_centre_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_centre centres%rowtype;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  select * into v_centre from centres where id = p_centre_id for update;
  if v_centre.id is null then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if v_centre.owner_id <> v_user then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if v_centre.status not in ('draft', 'rejected') then
    raise exception 'INVALID_STATE' using errcode='P0001'; -- e.g. already approved/pending
  end if;

  update centres set status = 'pending_review' where id = p_centre_id;
  perform log_audit('centre.submitted_for_review', 'centre', p_centre_id::text, jsonb_build_object('by', v_user));
end; $$;

grant execute on function submit_centre_for_review(uuid) to authenticated;


-- === 0046_audit_fixes.sql ===
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


-- === 0047_owner_public_profile.sql ===
-- 0047_owner_public_profile.sql
-- Adds the fields needed to show "who runs this centre" on a listing's
-- detail page: a short bio and an explicit public contact email.
--
-- full_name, avatar_url and phone already exist on profiles and are reused
-- (they're already collected via the shared Personal Details form on
-- /owner/settings) — only bio and public_email are new.
--
-- public_email is deliberately separate from the account's login email:
-- an owner may not want their login email shown to students, so this is an
-- explicit opt-in field they fill in themselves, left blank by default.
--
-- No RLS/grant changes needed: the existing "profiles self update" policy
-- (0014_fix_profiles_rls_recursion.sql) already lets a user update any of
-- their own non-role columns, which covers these two new ones. The centre
-- detail page reads these via the service-role client (server-only), same
-- as it already does for full_name/avatar_url there — so no public SELECT
-- policy on profiles is needed either.

alter table public.profiles
  add column if not exists bio text,
  add column if not exists public_email text;

alter table public.profiles
  drop constraint if exists profiles_bio_length;
alter table public.profiles
  add constraint profiles_bio_length check (bio is null or char_length(bio) <= 600);

comment on column public.profiles.bio is 'Owner-facing "about" text shown publicly on their centre listing pages.';
comment on column public.profiles.public_email is 'Owner-facing public contact email shown on centre listing pages — separate from the login email; blank hides it.';


-- === 0048_review_rating_sync.sql ===
-- 0048_review_rating_sync.sql
-- centres.rating / centres.reviews_count are plain columns (default 0) with
-- nothing that ever recalculated them after a review was submitted, edited,
-- deleted, or moderated — every centre showed "★0.0 (0 reviews)" regardless
-- of how many real reviews it had. This adds a trigger that keeps both in
-- sync with the `reviews` table (published reviews only — pending/removed
-- reviews don't count), and backfills every existing centre once so
-- current data is correct immediately after this migration runs.

create or replace function sync_centre_rating() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  v_ids uuid[];
begin
  -- INSERT: only NEW exists. DELETE: only OLD exists. UPDATE: both — e.g. a
  -- moderation status change or an edited rating. array_remove + a single
  -- `id = any(...)` update naturally de-dupes when they're the same centre.
  v_ids := array_remove(array[old.centre_id, new.centre_id], null);

  update centres c set
    rating = coalesce((
      select round(avg(r.rating)::numeric, 1)
      from reviews r
      where r.centre_id = c.id and r.status = 'published'
    ), 0),
    reviews_count = (
      select count(*) from reviews r
      where r.centre_id = c.id and r.status = 'published'
    )
  where c.id = any(v_ids);

  return null; -- AFTER trigger — return value is ignored either way
end; $$;

drop trigger if exists trg_reviews_sync_rating on reviews;
create trigger trg_reviews_sync_rating
  after insert or delete or update of rating, status, centre_id on reviews
  for each row execute function sync_centre_rating();

-- Backfill: recompute every centre once so existing reviews (submitted
-- before this migration, while nothing was syncing) show up immediately.
update centres c set
  rating = coalesce((
    select round(avg(r.rating)::numeric, 1) from reviews r
    where r.centre_id = c.id and r.status = 'published'
  ), 0),
  reviews_count = (
    select count(*) from reviews r
    where r.centre_id = c.id and r.status = 'published'
  );


-- === 0049_account_deletion_requests.sql ===
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


-- === 0050_log_retention_cleanup.sql ===
-- 0050_log_retention_cleanup.sql
-- email_logs and audit_logs had no retention policy — rows accumulated
-- forever. Adds a function that deletes rows older than 60 days from both,
-- called daily by a Vercel Cron job (see app/api/cron/cleanup-logs/route.ts
-- and vercel.json). security definer since neither table grants regular
-- users delete access (email_logs: admin-read-only; audit_logs: same) —
-- this function is only ever invoked by the cron route, which authenticates
-- via CRON_SECRET and calls it through the service-role client.

create or replace function cleanup_old_logs(p_days int default 60)
returns table(deleted_email_logs bigint, deleted_audit_logs bigint)
language plpgsql security definer set search_path = public as $$
declare
  v_cutoff timestamptz := now() - (p_days || ' days')::interval;
  v_email_count bigint;
  v_audit_count bigint;
begin
  delete from email_logs where created_at < v_cutoff;
  get diagnostics v_email_count = row_count;

  delete from audit_logs where created_at < v_cutoff;
  get diagnostics v_audit_count = row_count;

  return query select v_email_count, v_audit_count;
end; $$;

grant execute on function cleanup_old_logs(int) to service_role;


