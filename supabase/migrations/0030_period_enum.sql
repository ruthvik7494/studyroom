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
