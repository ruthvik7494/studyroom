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
