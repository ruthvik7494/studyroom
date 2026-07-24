-- 0022_centre_description.sql
-- Admin Dashboard milestone: the admin "Create Centre" form needs an
-- "About Centre" free-text field. `centres` had no description/about column
-- at all (categories.description is a different table). Additive only.

alter table centres add column if not exists description text;
