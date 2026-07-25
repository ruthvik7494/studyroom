-- 0025_slot_availability.sql
-- Real slot/availability system for bookings (movie-ticket style): a given
-- resource has N units (unit_count); for any specific hour on a given date,
-- "available" means fewer than N overlapping active bookings exist for that
-- hour. This mirrors book_seat()'s exact overlap check (0010) — deliberately
-- the SAME comparison, expressed as a read-only query, so the availability
-- the UI shows can never say "free" for a slot the DB would then reject.
-- Additive only.

/**
 * Hour-by-hour availability for one resource on one date, within the
 * centre's operating hours (booking_rules, falling back to 6:00–23:00 if the
 * centre hasn't configured hours — same default the booking_rules columns
 * themselves use).
 */
create or replace function resource_hour_slots(p_resource_id uuid, p_date date)
returns table(hour int, taken int, capacity int, is_available boolean)
language sql stable security definer set search_path = public as $$
  with r as (
    select unit_count, centre_id from resources where id = p_resource_id and is_active = true
  ),
  hours as (
    select generate_series(
      coalesce((select extract(hour from br.opening_time)::int from booking_rules br join r on br.centre_id = r.centre_id), 6),
      coalesce((select extract(hour from br.closing_time)::int from booking_rules br join r on br.centre_id = r.centre_id), 23) - 1
    ) as hour
  ),
  slot_bounds as (
    select h.hour,
           (p_date::timestamptz + (h.hour || ' hours')::interval) as slot_start,
           (p_date::timestamptz + ((h.hour + 1) || ' hours')::interval) as slot_end
    from hours h
  )
  select
    sb.hour,
    coalesce((
      select count(*) from bookings b
      where b.resource_id = p_resource_id
        and b.status in ('pending', 'confirmed')
        and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(sb.slot_start, sb.slot_end, '[)')
    ), 0)::int as taken,
    coalesce((select r.unit_count from r), 0) as capacity,
    coalesce((
      select count(*) from bookings b
      where b.resource_id = p_resource_id
        and b.status in ('pending', 'confirmed')
        and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(sb.slot_start, sb.slot_end, '[)')
    ), 0) < coalesce((select r.unit_count from r), 0) as is_available
  from slot_bounds sb
  order by sb.hour;
$$;
revoke all on function resource_hour_slots(uuid, date) from public;
grant execute on function resource_hour_slots(uuid, date) to anon, authenticated;

/**
 * Single availability check for a day/month booking starting at p_date (at
 * the centre's opening time, or 00:00 if no booking_rules exist) — same
 * overlap logic, one row instead of an hour grid.
 */
create or replace function resource_day_availability(p_resource_id uuid, p_date date, p_period booking_period)
returns table(taken int, capacity int, is_available boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_start timestamptz;
  v_end   timestamptz;
  v_open  time;
begin
  select coalesce(br.opening_time, '00:00') into v_open
  from resources r left join booking_rules br on br.centre_id = r.centre_id
  where r.id = p_resource_id;

  v_start := p_date::timestamptz + coalesce(v_open, '00:00'::time);
  v_end := case p_period
    when 'day' then v_start + interval '1 day'
    when 'month' then v_start + interval '30 days'
    else v_start + interval '1 hour'
  end;

  return query
  select
    coalesce(cnt.n, 0)::int,
    coalesce(r.unit_count, 0),
    coalesce(cnt.n, 0) < coalesce(r.unit_count, 0)
  from resources r
  left join lateral (
    select count(*) as n from bookings b
    where b.resource_id = p_resource_id
      and b.status in ('pending', 'confirmed')
      and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(v_start, v_end, '[)')
  ) cnt on true
  where r.id = p_resource_id and r.is_active = true;
end;
$$;
revoke all on function resource_day_availability(uuid, date, booking_period) from public;
grant execute on function resource_day_availability(uuid, date, booking_period) to anon, authenticated;
