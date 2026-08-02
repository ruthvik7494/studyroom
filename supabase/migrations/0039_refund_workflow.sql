-- 0039_refund_workflow.sql
--
-- Found while implementing this: refunds table has existed since migration
-- 0011 (status text: pending|processing|succeeded|failed), and
-- cancel_booking() already correctly writes cancelled_at/cancelled_by/
-- cancel_reason — but nothing has ever actually inserted a row into
-- refunds. Cancelling a PAID booking left it stuck at payment='paid'
-- forever, with no record that a refund was ever owed. Also,
-- cancel_booking() only notified the student, never the centre owner.
--
-- This migration:
--   1. cancel_booking() now auto-creates a 'pending' refund request when
--      the cancelled booking was already paid, and notifies the owner too.
--   2. review_refund() — owner/admin approves or rejects a pending refund.
--   3. complete_refund() — owner/admin marks an approved refund as actually
--      paid out (this app doesn't call Razorpay's refund API directly —
--      see the accompanying notes on why), which is what finally updates
--      the booking's payment status to 'refunded'/'partially_refunded',
--      keeping booking and refund records in sync.
--
-- refunds.status keeps its existing values valid (nothing already stored
-- is touched) and simply gains new values going forward: pending, approved,
-- rejected, completed (in addition to the pre-existing processing/succeeded/
-- failed, which — being a plain text column, not an enum — needed no schema
-- change to add).

create or replace function cancel_booking(p_booking_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_role user_role;
  v_bk bookings%rowtype;
  v_cutoff int;
  v_owner uuid;
  v_centre_name text;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  select role into v_role from profiles where id = v_user;
  select * into v_bk from bookings where id = p_booking_id for update;
  if v_bk.id is null then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if v_bk.status in ('cancelled','completed','no_show','expired','refunded') then
    raise exception 'INVALID_STATE' using errcode='P0001';
  end if;

  select owner_id, name into v_owner, v_centre_name from centres where id = v_bk.centre_id;
  select coalesce(cancel_cutoff_hours, 12) into v_cutoff from booking_rules where centre_id = v_bk.centre_id;
  v_cutoff := coalesce(v_cutoff, 12);

  -- Authorization: admin always; owner of the centre; or the booker before cutoff.
  if v_role <> 'admin' and v_user <> v_owner then
    if v_user <> v_bk.user_id then raise exception 'FORBIDDEN' using errcode='42501'; end if;
    if now() > v_bk.starts_at - (v_cutoff || ' hours')::interval then
      raise exception 'PAST_CUTOFF' using errcode='P0001';
    end if;
  end if;

  update bookings set status='cancelled', cancelled_at=now(), cancelled_by=v_user, cancel_reason=p_reason
  where id = p_booking_id;

  perform log_audit('booking.cancelled','booking', p_booking_id::text,
    jsonb_build_object('by', v_user, 'reason', p_reason));

  insert into notifications (user_id, kind, title, body, url)
  values (v_bk.user_id, 'booking_cancelled', 'Booking cancelled',
    'Your booking has been cancelled.', '/account');

  -- Owner notification — previously only the student was ever told.
  if v_owner is not null and v_owner <> v_user then
    insert into notifications (user_id, kind, title, body, url)
    values (v_owner, 'booking_cancelled', 'A booking was cancelled',
      coalesce(v_centre_name, 'Your centre') || ': a booking was just cancelled.', '/owner/bookings');
  end if;

  -- A paid booking being cancelled owes the student a refund decision —
  -- previously nothing ever recorded that this was needed at all.
  if v_bk.payment = 'paid' then
    insert into refunds (booking_id, amount, reason, status, is_partial, requested_by)
    values (p_booking_id, v_bk.amount, p_reason, 'pending', false, v_user);
    update bookings set payment = 'refund_pending' where id = p_booking_id;
  end if;

  -- Free a seat → promote the oldest waiter for this resource, if any.
  perform promote_waitlist(v_bk.resource_id);
end; $$;

-- Owner/admin decides a pending refund request. Rejecting it puts the
-- booking's payment back to 'paid' (the charge stands, unchanged).
create or replace function review_refund(p_refund_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_role user_role;
  v_refund refunds%rowtype;
  v_owner uuid;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  select role into v_role from profiles where id = v_user;

  select r.* into v_refund from refunds r where r.id = p_refund_id for update;
  if v_refund.id is null then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if v_refund.status <> 'pending' then raise exception 'INVALID_STATE' using errcode='P0001'; end if;

  select c.owner_id into v_owner
  from bookings b join centres c on c.id = b.centre_id
  where b.id = v_refund.booking_id;

  if v_role <> 'admin' and v_user <> v_owner then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  if p_approve then
    update refunds set status = 'approved', reason = coalesce(p_note, reason) where id = p_refund_id;
  else
    update refunds set status = 'rejected', reason = coalesce(p_note, reason), processed_at = now() where id = p_refund_id;
    update bookings set payment = 'paid' where id = v_refund.booking_id; -- charge stands
    insert into notifications (user_id, kind, title, body, url)
    select b.user_id, 'refund_rejected', 'Refund request declined',
      coalesce(p_note, 'Your refund request was not approved.'), '/account'
    from bookings b where b.id = v_refund.booking_id;
  end if;

  perform log_audit('refund.reviewed', 'refund', p_refund_id::text,
    jsonb_build_object('by', v_user, 'approved', p_approve, 'note', p_note));
end; $$;

-- Owner/admin marks an approved refund as actually paid out. This app does
-- not call Razorpay's refund API directly here — issuing a real refund
-- needs to be verified against a live Razorpay account, which isn't
-- something to wire up blind. Until that's built, the owner/admin processes
-- the refund via Razorpay's own dashboard, then marks it completed here —
-- which is what keeps the booking's payment status in sync.
create or replace function complete_refund(p_refund_id uuid, p_razorpay_refund_id text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_role user_role;
  v_refund refunds%rowtype;
  v_owner uuid;
  v_full_amount numeric;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  select role into v_role from profiles where id = v_user;

  select r.* into v_refund from refunds r where r.id = p_refund_id for update;
  if v_refund.id is null then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if v_refund.status <> 'approved' then raise exception 'INVALID_STATE' using errcode='P0001'; end if;

  select c.owner_id, b.amount into v_owner, v_full_amount
  from bookings b join centres c on c.id = b.centre_id
  where b.id = v_refund.booking_id;

  if v_role <> 'admin' and v_user <> v_owner then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  update refunds set status = 'completed', processed_at = now(), razorpay_refund_id = p_razorpay_refund_id
  where id = p_refund_id;

  update bookings
  set payment = case when v_refund.amount >= v_full_amount then 'refunded' else 'partially_refunded' end
  where id = v_refund.booking_id;

  insert into notifications (user_id, kind, title, body, url)
  select b.user_id, 'refund_completed', 'Refund processed',
    'Your refund has been processed.', '/account'
  from bookings b where b.id = v_refund.booking_id;

  perform log_audit('refund.completed', 'refund', p_refund_id::text, jsonb_build_object('by', v_user));
end; $$;

grant execute on function review_refund(uuid, boolean, text) to authenticated;
grant execute on function complete_refund(uuid, text) to authenticated;
