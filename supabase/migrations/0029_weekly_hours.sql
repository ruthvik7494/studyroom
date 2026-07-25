-- 0029_weekly_hours.sql
-- Real feature: owners need Monday-Sunday hours, not one daily window — e.g.
-- open 6 AM-10 PM Mon/Tue, 7 AM-10 PM Wed, closed Sunday. booking_rules only
-- ever had a single opening/closing time applied to every day. This adds a
-- per-day-of-week table and makes resource_hour_slots() respect it,
-- including returning zero bookable slots on a day marked closed.
--
-- day_of_week uses the SAME convention as both JS's Date.getDay() and
-- Postgres's EXTRACT(DOW FROM date) — 0 = Sunday .. 6 = Saturday — so no
-- conversion is needed between the client, this table, and the function
-- below.
--
-- Backward compatible: a centre with no centre_hours rows at all falls back
-- to booking_rules' single daily window (or the 6 AM-11 PM default), exactly
-- as before — existing centres aren't affected until their owner sets real
-- weekly hours.

create table if not exists centre_hours (
  centre_id     uuid not null references centres(id) on delete cascade,
  day_of_week   smallint not null check (day_of_week between 0 and 6),
  is_open       boolean not null default true,
  opening_time  time,
  closing_time  time,
  primary key (centre_id, day_of_week)
);

alter table centre_hours enable row level security;

create policy "centre_hours public read" on centre_hours for select using (true);
create policy "centre_hours owner write" on centre_hours for all using (
  exists (select 1 from centres c where c.id = centre_hours.centre_id and (c.owner_id = auth.uid() or auth_role() = 'admin'))
) with check (
  exists (select 1 from centres c where c.id = centre_hours.centre_id and (c.owner_id = auth.uid() or auth_role() = 'admin'))
);

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
    return; -- resource not found / inactive: no rows
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
    -- No weekly schedule configured for this centre — fall back to the
    -- legacy single-daily-window default, same as before this migration.
    select coalesce(extract(hour from br.opening_time)::int, 6),
           coalesce(extract(hour from br.closing_time)::int, 23)
      into v_open, v_close
    from booking_rules br where br.centre_id = v_centre_id;
    if not found then
      v_open := 6; v_close := 23;
    end if;
  end if;

  return query
  with hours as (
    select generate_series(v_open, greatest(v_open, v_close - 1)) as h
  ),
  bounds as (
    select
      hh.h,
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

-- Read-only helper so the booking UI can show "Closed on Sundays" up front,
-- without waiting on an hourly-slot query returning empty for an ambiguous
-- reason (closed vs. simply nothing configured yet).
create or replace function centre_is_open_on(p_centre_id uuid, p_date date)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select is_open from centre_hours where centre_id = p_centre_id and day_of_week = extract(dow from p_date)::int),
    true -- no weekly schedule configured: assume open, matching the legacy fallback above
  );
$$;
revoke all on function centre_is_open_on(uuid, date) from public;
grant execute on function centre_is_open_on(uuid, date) to anon, authenticated;

-- The preview (resource_hour_slots) is not the real gate — a direct call to
-- book_seat() bypassing the UI must be blocked too, or a closed day is only
-- a suggestion, not an actual rule. Re-defined with one added check up front.
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

  -- Lock the resource row so concurrent bookings serialize on it.
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
