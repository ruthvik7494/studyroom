-- 0033_centre_tags.sql
-- Business Tags (Quiet, Premium, Affordable, etc.) from the listing wizard's
-- Step 1 — a simple preset tag list, separate from the Popular Facilities
-- (amenities) concept, which already has its own table. Additive only.

alter table centres add column if not exists tags text[] not null default '{}';
