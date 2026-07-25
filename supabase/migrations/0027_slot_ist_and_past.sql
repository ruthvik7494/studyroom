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
