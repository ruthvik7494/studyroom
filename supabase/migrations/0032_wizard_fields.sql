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
