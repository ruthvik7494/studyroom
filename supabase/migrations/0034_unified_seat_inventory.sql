-- 0034_unified_seat_inventory.sql
--
-- ROOT CAUSE OF THE REPORTED BUG: since migration 0028/0031, hourly bookings
-- and day-or-longer bookings (day/week/fortnight/month/quarter/half_year/year)
-- were checked against two SEPARATE pools (`period = 'hour'` vs
-- `period != 'hour'` in every WHERE clause). A weekly booking never reduced
-- how many hourly slots showed as available, and vice versa — exactly the
-- bug reported: "Weekly booking should leave 2 of 3 seats for that week, but
-- hourly bookings that week still saw all 3 seats free."
--
-- THE FIX: one unified per-day inventory count, reused by every capacity
-- check in the system (slot preview AND actual booking creation, for BOTH
-- hourly and day+):
--
--   resource_day_plus_count(resource, date)
--     -> how many day-or-longer bookings (week/month/etc.) cover this date.
--        A day+ booking occupies a seat for the ENTIRE day, at every hour.
--
--   resource_hour_taken(resource, date, hour)
--     -> resource_day_plus_count(date) + hourly bookings at that exact hour.
--        This is "how many seats are occupied right at this hour" — the
--        correct number to compare an HOURLY request against.
--
--   resource_day_worst_hour_taken(resource, date, open_hour, close_hour)
--     -> the busiest single hour that day (max hourly-only count across
--        operating hours), used when checking whether a NEW day+ booking
--        can be added: a day+ pass must have a seat free at every hour of
--        every day in its range, so we check the day's worst moment.
--
-- Nothing about the schema changes — same `bookings` table, same columns,
-- same period enum. This only replaces the PL/pgSQL capacity-checking
-- functions with correct logic, matching the "IMPORTANT: do not redesign
-- the database" instruction.

-- 1) Day+ bookings covering a given date (unchanged concept from 0031, but
--    now given its own reusable name instead of being inlined everywhere).
create or replace function resource_day_plus_count(p_resource_id uuid, p_date date)
returns int
language sql stable as $$
  select count(*)::int
  from bookings bk
  where bk.resource_id = p_resource_id
    and bk.status in ('pending', 'confirmed')
    and bk.period != 'hour'
    and tstzrange(bk.starts_at, bk.ends_at, '[)') &&
        tstzrange((p_date::text || ' 00:00:00+05:30')::timestamptz,
                   (p_date::text || ' 00:00:00+05:30')::timestamptz + interval '1 day', '[)');
$$;

-- 2) Unified occupancy for one exact hour: day+ bookings covering that date
--    (they occupy every hour) PLUS hourly bookings at that specific hour.
--    This is the number an HOURLY booking request must stay under.
create or replace function resource_hour_taken(p_resource_id uuid, p_date date, p_hour int)
returns int
language sql stable as $$
  select resource_day_plus_count(p_resource_id, p_date) + coalesce((
    select count(*)::int
    from bookings bk
    where bk.resource_id = p_resource_id
      and bk.status in ('pending', 'confirmed')
      and bk.period = 'hour'
      and bk.starts_at = (p_date::text || ' ' || lpad(p_hour::text, 2, '0') || ':00:00+05:30')::timestamptz
  ), 0);
$$;

-- 3) The busiest single hour of a day, HOURLY BOOKINGS ONLY (day+ bookings
--    are added on top of this separately, by whoever is asking). Used when
--    validating a NEW day+ booking: it needs a free seat at every hour of
--    every day in its range, so we must check the day's worst moment, not
--    just an average.
create or replace function resource_day_worst_hour_taken(p_resource_id uuid, p_date date, p_open_hour int, p_close_hour int)
returns int
language sql stable as $$
  select coalesce(max(cnt), 0)::int
  from (
    select count(*) as cnt
    from bookings bk
    where bk.resource_id = p_resource_id
      and bk.status in ('pending', 'confirmed')
      and bk.period = 'hour'
      and bk.starts_at >= (p_date::text || ' ' || lpad(p_open_hour::text, 2, '0') || ':00:00+05:30')::timestamptz
      and bk.starts_at <  (p_date::text || ' ' || lpad(greatest(p_open_hour, p_close_hour)::text, 2, '0') || ':00:00+05:30')::timestamptz
    group by bk.starts_at
  ) hourly_counts;
$$;

revoke all on function resource_day_plus_count(uuid, date) from public;
revoke all on function resource_hour_taken(uuid, date, int) from public;
revoke all on function resource_day_worst_hour_taken(uuid, date, int, int) from public;
grant execute on function resource_day_plus_count(uuid, date) to anon, authenticated;
grant execute on function resource_hour_taken(uuid, date, int) to anon, authenticated;
grant execute on function resource_day_worst_hour_taken(uuid, date, int, int) to anon, authenticated;

-- 4) Preview function (drives the booking page's slot picker) — now uses
--    the unified counts above instead of the old period-scoped pools.
create or replace function resource_hour_slots(p_resource_id uuid, p_date date, p_period booking_period default 'hour')
returns table(hour int, taken int, capacity int, is_available boolean, is_past boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_units     int;
  v_centre_id uuid;
  v_dow       int;
  v_is_open   boolean;
  v_open_time time;
  v_close_time time;
  v_open      int;
  v_close     int;
begin
  select unit_count, centre_id into v_units, v_centre_id from resources where id = p_resource_id and is_active = true;
  if v_units is null then
    return;
  end if;

  v_dow := extract(dow from p_date)::int;

  select is_open, opening_time, closing_time into v_is_open, v_open_time, v_close_time
  from centre_hours where centre_id = v_centre_id and day_of_week = v_dow;

  if found and not v_is_open then
    return; -- closed this day of the week: no bookable slots at all
  end if;

  if found then
    v_open := extract(hour from v_open_time)::int;
    v_close := extract(hour from v_close_time)::int;
  else
    select coalesce(extract(hour from br.opening_time)::int, 6),
           coalesce(extract(hour from br.closing_time)::int, 23)
      into v_open, v_close
    from booking_rules br where br.centre_id = v_centre_id;
    if not found then
      v_open := 6; v_close := 23;
    end if;
  end if;

  if p_period = 'hour' then
    return query
    with hours as (
      select generate_series(v_open, greatest(v_open, v_close - 1)) as h
    ),
    bounds as (
      select hh.h, (p_date::text || ' ' || lpad(hh.h::text, 2, '0') || ':00:00+05:30')::timestamptz as slot_start
      from hours hh
    )
    select
      b.h,
      resource_hour_taken(p_resource_id, p_date, b.h),
      v_units,
      (resource_hour_taken(p_resource_id, p_date, b.h) < v_units) and (b.slot_start > now()),
      b.slot_start <= now()
    from bounds b
    order by b.h;
  else
    -- Day-or-longer preview: every "start hour" for this period shares the
    -- SAME real constraint — every day in the resulting range must have a
    -- seat free at its busiest hour. There's no meaningful per-hour
    -- distinction for a multi-day pass, but the function's shape (one row
    -- per operating hour) is kept so the frontend doesn't need special-
    -- casing — every row for a given date now reports the same number.
    declare
      v_end_date date := p_date + (period_days(p_period) || ' days')::interval;
      v_max_taken int := 0;
      v_day date;
      v_day_taken int;
    begin
      v_day := p_date;
      while v_day < v_end_date loop
        v_day_taken := resource_day_plus_count(p_resource_id, v_day)
                     + resource_day_worst_hour_taken(p_resource_id, v_day, v_open, v_close);
        if v_day_taken > v_max_taken then
          v_max_taken := v_day_taken;
        end if;
        v_day := v_day + 1;
      end loop;

      return query
      with hours as (
        select generate_series(v_open, greatest(v_open, v_close - 1)) as h
      ),
      bounds as (
        select hh.h, (p_date::text || ' ' || lpad(hh.h::text, 2, '0') || ':00:00+05:30')::timestamptz as slot_start
        from hours hh
      )
      select
        b.h,
        v_max_taken,
        v_units,
        (v_max_taken < v_units) and (b.slot_start > now()),
        b.slot_start <= now()
      from bounds b
      order by b.h;
    end;
  end if;
end;
$$;
revoke all on function resource_hour_slots(uuid, date, booking_period) from public;
grant execute on function resource_hour_slots(uuid, date, booking_period) to anon, authenticated;

-- 5) Single-slot booking (day/week/fortnight/month/quarter/half_year/year) —
--    now validates EVERY day in the range against the unified count instead
--    of only checking overlap against other day+ bookings.
create or replace function book_seat(
  p_centre_id  uuid,
  p_resource_id uuid,
  p_period     booking_period,
  p_starts_at  timestamptz,
  p_ends_at    timestamptz,
  p_amount     numeric
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user       uuid := auth.uid();
  v_units      int;
  v_id         uuid;
  v_open_flag  boolean;
  v_day        date;
  v_end_date   date;
  v_day_taken  int;
  v_open_hour  int;
  v_close_hour int;
  v_centre_hours_row record;
begin
  if v_user is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;

  select unit_count into v_units
  from resources
  where id = p_resource_id and centre_id = p_centre_id and is_active = true
  for update;

  if v_units is null then
    raise exception 'RESOURCE_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_open_flag := centre_is_open_on(p_centre_id, (p_starts_at at time zone 'Asia/Kolkata')::date);
  if not v_open_flag then
    raise exception 'CENTRE_CLOSED' using errcode = 'P0003';
  end if;

  if p_period = 'hour' then
    if resource_hour_taken(p_resource_id, (p_starts_at at time zone 'Asia/Kolkata')::date,
                            extract(hour from p_starts_at at time zone 'Asia/Kolkata')::int) >= v_units then
      raise exception 'RESOURCE_FULL' using errcode = 'P0001';
    end if;
  else
    -- Every day in the requested range must have a seat free at its
    -- busiest hour — this is what actually guarantees a day+ pass-holder
    -- can always find a seat, any time they show up.
    v_day := (p_starts_at at time zone 'Asia/Kolkata')::date;
    v_end_date := (p_ends_at at time zone 'Asia/Kolkata')::date;
    while v_day < v_end_date loop
      select coalesce(extract(hour from opening_time)::int, 6), coalesce(extract(hour from closing_time)::int, 23)
        into v_open_hour, v_close_hour
      from centre_hours where centre_id = p_centre_id and day_of_week = extract(dow from v_day)::int and is_open;
      if not found then
        v_open_hour := 6; v_close_hour := 23;
      end if;

      v_day_taken := resource_day_plus_count(p_resource_id, v_day)
                   + resource_day_worst_hour_taken(p_resource_id, v_day, v_open_hour, v_close_hour);
      if v_day_taken >= v_units then
        raise exception 'RESOURCE_FULL' using errcode = 'P0001';
      end if;
      v_day := v_day + 1;
    end loop;
  end if;

  insert into bookings (centre_id, resource_id, user_id, period, starts_at, ends_at, amount, status, payment)
  values (p_centre_id, p_resource_id, v_user, p_period, p_starts_at, p_ends_at, p_amount, 'pending', 'unpaid')
  returning id into v_id;

  return v_id;
end;
$$;

-- 6) Multi-hour booking — same unified check per requested hour.
create or replace function book_seat_multi(
  p_centre_id   uuid,
  p_resource_id uuid,
  p_date        date,
  p_hours       int[],
  p_amount_per_hour numeric
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_units   int;
  v_group   uuid := gen_random_uuid();
  v_hour    int;
  v_starts  timestamptz;
  v_ends    timestamptz;
  v_open    boolean;
begin
  if v_user is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;
  if p_hours is null or array_length(p_hours, 1) is null then
    raise exception 'NO_HOURS_SELECTED' using errcode = 'P0004';
  end if;

  select unit_count into v_units
  from resources
  where id = p_resource_id and centre_id = p_centre_id and is_active = true
  for update;

  if v_units is null then
    raise exception 'RESOURCE_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_open := centre_is_open_on(p_centre_id, p_date);
  if not v_open then
    raise exception 'CENTRE_CLOSED' using errcode = 'P0003';
  end if;

  -- Check EVERY requested hour against the unified count before inserting
  -- any of them — all-or-nothing, and now correctly aware of any day+
  -- booking occupying a seat that day.
  foreach v_hour in array p_hours loop
    if resource_hour_taken(p_resource_id, p_date, v_hour) >= v_units then
      raise exception 'RESOURCE_FULL' using errcode = 'P0001';
    end if;
  end loop;

  foreach v_hour in array p_hours loop
    v_starts := (p_date::text || ' ' || lpad(v_hour::text, 2, '0') || ':00:00+05:30')::timestamptz;
    v_ends := v_starts + interval '1 hour';
    insert into bookings (centre_id, resource_id, user_id, period, starts_at, ends_at, amount, status, payment, booking_group_id)
    values (p_centre_id, p_resource_id, v_user, 'hour', v_starts, v_ends, p_amount_per_hour, 'pending', 'unpaid', v_group);
  end loop;

  return v_group;
end;
$$;
