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
