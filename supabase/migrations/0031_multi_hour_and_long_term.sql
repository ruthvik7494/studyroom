-- 0031_multi_hour_and_long_term.sql
-- Two real product requirements bundled here since they share the same
-- capacity-model rework:
--
-- 1. MULTI-HOUR BOOKINGS: a student can now book several hours in one go
--    (e.g. 9, 10, 11 AM = 3 hours). Each hour is still its own independent
--    capacity bucket — exactly the per-exact-hour model from 0028 — booking
--    3 hours creates 3 linked booking rows (booking_group_id), one per hour,
--    so "9 AM has 2 of 3 seats left" stays correct after this booking,
--    independent of 10 AM / 11 AM. All three inserts happen in one function
--    call (book_seat_multi) so it's all-or-nothing, not partial.
--
-- 2. LONG-TERM PERIODS: Daily, Weekly, Fortnightly, Monthly, Quarterly,
--    Half-yearly, Yearly. These aren't walk-in hour bookings — they're
--    multi-day passes, and get an END DATE shown to the student (computed
--    from the period's real length). Capacity for these is checked as a
--    SEPARATE pool from hourly walk-ins: how many other day-or-longer
--    bookings genuinely overlap the requested date range, compared against
--    the same seat count. Two different monthly-pass holders whose 30-day
--    windows overlap correctly compete for seats; a hourly walk-in at 3 PM
--    does not compete with a monthly pass-holder's seat, and vice versa —
--    they're different usage patterns sharing a seat count, not one ledger.
--    (Hourly's own pool, from 0028, is unchanged by this file.)

alter table bookings add column if not exists booking_group_id uuid;
create index if not exists idx_bookings_group on bookings (booking_group_id) where booking_group_id is not null;

/** Real length, in days, of each long-term period. Hourly isn't listed — it never uses this. */
create or replace function period_days(p_period booking_period) returns int
language sql immutable as $$
  select case p_period
    when 'day' then 1
    when 'week' then 7
    when 'fortnight' then 14
    when 'month' then 30
    when 'quarter' then 90
    when 'half_year' then 182
    when 'year' then 365
    else 1
  end;
$$;

-- Preview function, extended: for 'hour', unchanged exact-instant-per-hour
-- logic (0028). For any longer period, each candidate start hour's
-- availability now reflects the long-term overlap pool instead.
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
      coalesce(cnt.n, 0)::int,
      v_units,
      (coalesce(cnt.n, 0) < v_units) and (b.slot_start > now()),
      b.slot_start <= now()
    from bounds b
    left join lateral (
      select count(*) as n from bookings bk
      where bk.resource_id = p_resource_id
        and bk.status in ('pending', 'confirmed')
        and bk.period = 'hour'
        and bk.starts_at = b.slot_start
    ) cnt on true
    order by b.h;
  else
    return query
    with hours as (
      select generate_series(v_open, greatest(v_open, v_close - 1)) as h
    ),
    bounds as (
      select
        hh.h,
        (p_date::text || ' ' || lpad(hh.h::text, 2, '0') || ':00:00+05:30')::timestamptz as slot_start,
        (p_date::text || ' ' || lpad(hh.h::text, 2, '0') || ':00:00+05:30')::timestamptz + (period_days(p_period) || ' days')::interval as slot_end
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
        and bk.period != 'hour'
        and tstzrange(bk.starts_at, bk.ends_at, '[)') && tstzrange(b.slot_start, b.slot_end, '[)')
    ) cnt on true
    order by b.h;
  end if;
end;
$$;
revoke all on function resource_hour_slots(uuid, date, booking_period) from public;
grant execute on function resource_hour_slots(uuid, date, booking_period) to anon, authenticated;

-- Single-slot booking (day/week/fortnight/month/quarter/half_year/year).
-- Same closed-day guard as before; capacity now checks the long-term pool.
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
  v_user   uuid := auth.uid();
  v_units  int;
  v_taken  int;
  v_id     uuid;
  v_open   boolean;
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

  v_open := centre_is_open_on(p_centre_id, (p_starts_at at time zone 'Asia/Kolkata')::date);
  if not v_open then
    raise exception 'CENTRE_CLOSED' using errcode = 'P0003';
  end if;

  if p_period = 'hour' then
    select count(*) into v_taken
    from bookings
    where resource_id = p_resource_id
      and status in ('pending','confirmed')
      and period = 'hour'
      and starts_at = p_starts_at;
  else
    select count(*) into v_taken
    from bookings
    where resource_id = p_resource_id
      and status in ('pending','confirmed')
      and period != 'hour'
      and tstzrange(starts_at, ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)');
  end if;

  if v_taken >= v_units then
    raise exception 'RESOURCE_FULL' using errcode = 'P0001';
  end if;

  insert into bookings (centre_id, resource_id, user_id, period, starts_at, ends_at, amount, status, payment)
  values (p_centre_id, p_resource_id, v_user, p_period, p_starts_at, p_ends_at, p_amount, 'pending', 'unpaid')
  returning id into v_id;

  return v_id;
end;
$$;

-- Multi-hour booking: books several specific hours in ONE call, all-or-
-- nothing. Each hour becomes its own row (same exact-instant capacity check
-- as a single hourly booking), linked by booking_group_id.
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
  v_taken   int;
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

  -- Check EVERY requested hour is available before inserting any of them —
  -- all-or-nothing, so a partially-full set of hours doesn't leave the
  -- student with, say, 9 AM and 11 AM booked but not 10 AM.
  foreach v_hour in array p_hours loop
    v_starts := (p_date::text || ' ' || lpad(v_hour::text, 2, '0') || ':00:00+05:30')::timestamptz;
    v_ends := v_starts + interval '1 hour';

    select count(*) into v_taken
    from bookings
    where resource_id = p_resource_id
      and status in ('pending','confirmed')
      and period = 'hour'
      and starts_at = v_starts;

    if v_taken >= v_units then
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
revoke all on function book_seat_multi(uuid, uuid, date, int[], numeric) from public;
grant execute on function book_seat_multi(uuid, uuid, date, int[], numeric) to authenticated;
