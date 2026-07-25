-- 0028_exact_slot_capacity.sql
-- Real bug found in testing: booking a Daily or Monthly option reserves a
-- 24-hour or 30-day window starting from whichever hour was picked (0010,
-- 0027). Any two such windows on the same day inevitably overlap each other
-- — a 24h window starting 6 AM and one starting 7 AM overlap for 23 of their
-- 24 hours — so with unit_count = 3, three bookings at ANY hours filled
-- every single hour-slot that day, not just the specific hours chosen.
--
-- The actual product model (confirmed): `seats` is a capacity per exact
-- clock time, independent of how long the booking's price period is. 10
-- seats means 10 concurrent bookings AT THE SAME START TIME are allowed —
-- 6 AM and 7 AM are separate, independent buckets of 10, regardless of
-- whether the booking is priced hourly, daily, or monthly. Period is a price
-- label, not a capacity-duration multiplier.
--
-- Fixed in both places that must agree: book_seat() (the real enforcement,
-- at the moment of booking) and resource_hour_slots() (the preview the
-- student sees beforehand) — both now count exact starts_at matches instead
-- of overlapping time ranges.

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
begin
  if v_user is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;

  -- Lock the resource row so concurrent bookings serialize on it.
  select unit_count into v_units
  from resources
  where id = p_resource_id and centre_id = p_centre_id and is_active = true
  for update;

  if v_units is null then
    raise exception 'RESOURCE_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Capacity is per EXACT start time, not "anything overlapping this
  -- booking's full duration" — a 6 AM slot and a 7 AM slot are independent
  -- buckets of `unit_count` seats each, regardless of period length.
  select count(*) into v_taken
  from bookings
  where resource_id = p_resource_id
    and status in ('pending','confirmed')
    and starts_at = p_starts_at;

  if v_taken >= v_units then
    raise exception 'RESOURCE_FULL' using errcode = 'P0001';
  end if;

  insert into bookings (centre_id, resource_id, user_id, period, starts_at, ends_at, amount, status, payment)
  values (p_centre_id, p_resource_id, v_user, p_period, p_starts_at, p_ends_at, p_amount, 'pending', 'unpaid')
  returning id into v_id;

  return v_id;
end;
$$;

-- Preview function: same exact-start-time counting, matching book_seat()
-- exactly so the UI never shows a slot as available that booking would then
-- reject (or vice versa). p_period no longer affects capacity — kept as a
-- parameter only so callers don't need to change their call sites.
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
      (p_date::text || ' ' || lpad(hh.h::text, 2, '0') || ':00:00+05:30')::timestamptz as slot_start
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
      and bk.starts_at = b.slot_start
  ) cnt on true
  order by b.h;
end;
$$;
revoke all on function resource_hour_slots(uuid, date, booking_period) from public;
grant execute on function resource_hour_slots(uuid, date, booking_period) to anon, authenticated;
