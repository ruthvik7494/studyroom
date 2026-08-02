-- 0042_remove_hardcoded_location_default.sql
--
-- locations.city defaulted to 'Warangal' — meaning any future location
-- row created without explicitly setting a city would silently inherit a
-- hardcoded sample city. Dropping the default doesn't touch any existing
-- row; it just requires city to be specified explicitly going forward.

alter table locations alter column city drop default;
