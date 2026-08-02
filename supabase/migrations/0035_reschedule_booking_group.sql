-- 0035_reschedule_booking_group.sql
--
-- PROBLEM: the existing rescheduleBooking flow calls book_seat() — the
-- single-row day+ booking function — even for HOURLY bookings. But every
-- hourly booking (1 hour or many) is actually created by book_seat_multi(),
-- which stores one row PER HOUR, all sharing one booking_group_id. So
-- rescheduling "one hour" of a 3-hour group only ever touched that one row,
-- silently detaching it from its group and losing the other hours from the
-- student's own view of what they'd booked.
--
-- FIX: a single new function, reschedule_booking_group(), that treats the
-- WHOLE group as the unit of rescheduling — exactly matching how the group
-- was created in the first place:
--   1. Load every ACTIVE (pending/confirmed) booking in the group, ordered
--      by starts_at. Their count IS the original duration (3 rows = 3 hours).
--   2. From the new requested start time, generate that same number of
--      consecutive hours (new_start, new_start+1h, new_start+2h, ...).
--   3. Validate EVERY generated hour against the real, unified seat
--      inventory (the same day+/hourly-combined check from 0034) — but
--      excluding this group's OWN old rows from the "taken" count, so
--      rescheduling into an overlapping time (e.g. 9-12 -> 10-13) doesn't
--      falsely reject against itself.
--   4. If even one hour fails, the function raises immediately and nothing
--      is written — Postgres rolls back automatically inside a single
--      function invocation, so there is no possible partial state.
--   5. If every hour passes, insert all the new rows (same booking_group_id,
--      each linked via rescheduled_from to its corresponding old row), then
--      cancel every old row. New rows are created BEFORE old ones are
--      cancelled, same acquire-then-release ordering as the existing single-
--      booking reschedule, so a late failure never leaves the student with
--      nothing booked.

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
  i            int;
begin
  if v_user is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;

  -- 1. Gather every active booking in the group, ordered by start time.
  --    Their count is the original duration; ownership is checked per row.
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

  -- 2 + 3. Generate the new hour range and validate EVERY hour before
  -- writing anything. Unified check: any OTHER booking (hourly at this
  -- exact hour, or a day+ booking overlapping this hour) counts against
  -- capacity — this group's own old rows are explicitly excluded so an
  -- overlapping reschedule doesn't reject against itself.
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
      and not (bk.id = any(v_old_ids))
      and (
        (bk.period = 'hour' and bk.starts_at = v_new_start)
        or (bk.period <> 'hour' and tstzrange(bk.starts_at, bk.ends_at, '[)') && tstzrange(v_new_start, v_new_end, '[)'))
      );

    if v_taken >= v_units then
      -- Selected time range is not fully available — abort. Nothing has
      -- been inserted or cancelled yet, so there is nothing to roll back;
      -- raising here simply ends the function and the whole transaction.
      raise exception 'RANGE_UNAVAILABLE' using errcode = 'P0001';
    end if;
  end loop;

  -- 4. Every hour is available — commit the whole move as one unit.
  -- New rows first (acquire), old rows cancelled after (release), so a
  -- failure past this point still leaves the original booking intact.
  for i in 0 .. (v_count - 1) loop
    v_new_start := p_new_starts_at + (i || ' hours')::interval;
    v_new_end := v_new_start + interval '1 hour';
    insert into bookings (
      centre_id, resource_id, user_id, period, starts_at, ends_at,
      amount, status, payment, booking_group_id, rescheduled_from
    ) values (
      v_centre_id, v_resource_id, v_user, 'hour', v_new_start, v_new_end,
      v_amount, 'pending', 'unpaid', p_booking_group_id, v_old_ids[i + 1]
    )
    returning id into v_new_id;
  end loop;

  for i in 1 .. v_count loop
    perform cancel_booking(v_old_ids[i], 'rescheduled');
  end loop;

  return p_booking_group_id;
end;
$$;

revoke all on function reschedule_booking_group(uuid, timestamptz) from public;
grant execute on function reschedule_booking_group(uuid, timestamptz) to authenticated;
