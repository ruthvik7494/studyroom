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
