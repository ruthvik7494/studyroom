-- 0038_reservation_timeout.sql
--
-- REGRESSION FOUND: migration 0011 built a real reservation-hold system —
-- bookings.expires_at, booking_rules.hold_minutes (per-centre, default 15
-- min), and expire_pending_bookings() (a sweep meant to run on a schedule).
-- But every capacity-checking function written since (0028, 0031, 0034)
-- was redefined from scratch and never set expires_at on insert, nor
-- checked it when counting how many seats are taken. The result: every
-- booking's expires_at has been NULL forever, so a pending/unpaid booking
-- has always held its seat indefinitely — no timeout ever actually applied,
-- and expire_pending_bookings() had nothing to find (its WHERE clause
-- requires expires_at is not null).
--
-- THIS MIGRATION:
--   1. Every unified capacity-count function (0034) now excludes a pending
--      booking once its hold has lapsed (status='pending' AND expires_at
--      is not null AND expires_at < now()) — a lapsed hold stops occupying
--      a seat immediately, even before the sweep runs. This is what lets a
--      second user book the same seat the moment a hold expires, without
--      waiting for a cron tick.
--   2. book_seat(), book_seat_multi(), and reschedule_booking_group() (0035)
--      now actually SET expires_at on every new pending/unpaid row, reading
--      the per-centre booking_rules.hold_minutes (falling back to 10
--      minutes if a centre has no booking_rules row configured).
--   3. reschedule_booking_group()'s own inline availability check gets the
--      same expiry exclusion (it has its own query, separate from the
--      shared functions above, since it also excludes the group's own old
--      rows).
--   4. expire_pending_bookings() (already built in 0011) is left as-is —
--      it's correct — but see the accompanying API route + Vercel Cron
--      config that actually invokes it on a schedule, since nothing did.

-- 1. Unified capacity functions — add the expiry exclusion.
create or replace function resource_day_plus_count(p_resource_id uuid, p_date date)
returns int
language sql stable as $$
  select count(*)::int
  from bookings bk
  where bk.resource_id = p_resource_id
    and bk.status in ('pending', 'confirmed')
    and not (bk.status = 'pending' and bk.expires_at is not null and bk.expires_at < now())
    and bk.period != 'hour'
    and tstzrange(bk.starts_at, bk.ends_at, '[)') &&
        tstzrange((p_date::text || ' 00:00:00+05:30')::timestamptz,
                   (p_date::text || ' 00:00:00+05:30')::timestamptz + interval '1 day', '[)');
$$;

create or replace function resource_hour_taken(p_resource_id uuid, p_date date, p_hour int)
returns int
language sql stable as $$
  select resource_day_plus_count(p_resource_id, p_date) + coalesce((
    select count(*)::int
    from bookings bk
    where bk.resource_id = p_resource_id
      and bk.status in ('pending', 'confirmed')
      and not (bk.status = 'pending' and bk.expires_at is not null and bk.expires_at < now())
      and bk.period = 'hour'
      and bk.starts_at = (p_date::text || ' ' || lpad(p_hour::text, 2, '0') || ':00:00+05:30')::timestamptz
  ), 0);
$$;

create or replace function resource_day_worst_hour_taken(p_resource_id uuid, p_date date, p_open_hour int, p_close_hour int)
returns int
language sql stable as $$
  select coalesce(max(cnt), 0)::int
  from (
    select count(*) as cnt
    from bookings bk
    where bk.resource_id = p_resource_id
      and bk.status in ('pending', 'confirmed')
      and not (bk.status = 'pending' and bk.expires_at is not null and bk.expires_at < now())
      and bk.period = 'hour'
      and bk.starts_at >= (p_date::text || ' ' || lpad(p_open_hour::text, 2, '0') || ':00:00+05:30')::timestamptz
      and bk.starts_at <  (p_date::text || ' ' || lpad(greatest(p_open_hour, p_close_hour)::text, 2, '0') || ':00:00+05:30')::timestamptz
    group by bk.starts_at
  ) hourly_counts;
$$;

-- 2. book_seat() — now sets expires_at on the new pending row.
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
  v_hold_min   int;
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

  select coalesce(hold_minutes, 10) into v_hold_min from booking_rules where centre_id = p_centre_id;
  if not found then v_hold_min := 10; end if;

  insert into bookings (centre_id, resource_id, user_id, period, starts_at, ends_at, amount, status, payment, expires_at)
  values (p_centre_id, p_resource_id, v_user, p_period, p_starts_at, p_ends_at, p_amount, 'pending', 'unpaid', now() + (v_hold_min || ' minutes')::interval)
  returning id into v_id;

  return v_id;
end;
$$;

-- 3. book_seat_multi() — same hold, applied to every hour in the request.
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
  v_hold_min int;
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

  foreach v_hour in array p_hours loop
    if resource_hour_taken(p_resource_id, p_date, v_hour) >= v_units then
      raise exception 'RESOURCE_FULL' using errcode = 'P0001';
    end if;
  end loop;

  select coalesce(hold_minutes, 10) into v_hold_min from booking_rules where centre_id = p_centre_id;
  if not found then v_hold_min := 10; end if;

  foreach v_hour in array p_hours loop
    v_starts := (p_date::text || ' ' || lpad(v_hour::text, 2, '0') || ':00:00+05:30')::timestamptz;
    v_ends := v_starts + interval '1 hour';
    insert into bookings (centre_id, resource_id, user_id, period, starts_at, ends_at, amount, status, payment, booking_group_id, expires_at)
    values (p_centre_id, p_resource_id, v_user, 'hour', v_starts, v_ends, p_amount_per_hour, 'pending', 'unpaid', v_group, now() + (v_hold_min || ' minutes')::interval);
  end loop;

  return v_group;
end;
$$;

-- 4. reschedule_booking_group() (0035) — same expiry exclusion in its own
--    inline check, and the same hold applied to its new rows.
create or replace function reschedule_booking_group(
  p_booking_group_id uuid,
  p_new_starts_at    timestamptz
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user       uuid := auth.uid();
  v_old_ids    uuid[] := '{}';
  v_count      int := 0;
  v_centre_id  uuid;
  v_resource_id uuid;
  v_amount     numeric;
  v_units      int;
  v_new_start  timestamptz;
  v_new_end    timestamptz;
  v_taken      int;
  v_new_id     uuid;
  v_row        record;
  v_hold_min   int;
  i            int;
begin
  if v_user is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;

  for v_row in
    select id, centre_id, resource_id, amount, user_id
    from bookings
    where booking_group_id = p_booking_group_id
      and status in ('pending', 'confirmed')
      and period = 'hour'
    order by starts_at
  loop
    if v_row.user_id <> v_user then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
    v_old_ids := array_append(v_old_ids, v_row.id);
    v_centre_id := v_row.centre_id;
    v_resource_id := v_row.resource_id;
    v_amount := v_row.amount;
    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  select unit_count into v_units
  from resources
  where id = v_resource_id and is_active = true
  for update;

  if v_units is null then
    raise exception 'RESOURCE_NOT_FOUND' using errcode = 'P0002';
  end if;

  for i in 0 .. (v_count - 1) loop
    v_new_start := p_new_starts_at + (i || ' hours')::interval;
    v_new_end := v_new_start + interval '1 hour';

    if not centre_is_open_on(v_centre_id, (v_new_start at time zone 'Asia/Kolkata')::date) then
      raise exception 'CENTRE_CLOSED' using errcode = 'P0003';
    end if;

    select count(*) into v_taken
    from bookings bk
    where bk.resource_id = v_resource_id
      and bk.status in ('pending', 'confirmed')
      and not (bk.status = 'pending' and bk.expires_at is not null and bk.expires_at < now())
      and not (bk.id = any(v_old_ids))
      and (
        (bk.period = 'hour' and bk.starts_at = v_new_start)
        or (bk.period <> 'hour' and tstzrange(bk.starts_at, bk.ends_at, '[)') && tstzrange(v_new_start, v_new_end, '[)'))
      );

    if v_taken >= v_units then
      raise exception 'RANGE_UNAVAILABLE' using errcode = 'P0001';
    end if;
  end loop;

  select coalesce(hold_minutes, 10) into v_hold_min from booking_rules where centre_id = v_centre_id;
  if not found then v_hold_min := 10; end if;

  for i in 0 .. (v_count - 1) loop
    v_new_start := p_new_starts_at + (i || ' hours')::interval;
    v_new_end := v_new_start + interval '1 hour';
    insert into bookings (
      centre_id, resource_id, user_id, period, starts_at, ends_at,
      amount, status, payment, booking_group_id, rescheduled_from, expires_at
    ) values (
      v_centre_id, v_resource_id, v_user, 'hour', v_new_start, v_new_end,
      v_amount, 'pending', 'unpaid', p_booking_group_id, v_old_ids[i + 1], now() + (v_hold_min || ' minutes')::interval
    )
    returning id into v_new_id;
  end loop;

  for i in 1 .. v_count loop
    perform cancel_booking(v_old_ids[i], 'rescheduled');
  end loop;

  return p_booking_group_id;
end;
$$;
