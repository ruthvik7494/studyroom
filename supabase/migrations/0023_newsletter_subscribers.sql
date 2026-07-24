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
