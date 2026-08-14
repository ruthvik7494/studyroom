-- Fix review_refund to un-cancel booking when refund request is rejected by owner
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
    -- When refund request is rejected, the booking remains valid & active (charge stands)
    update bookings set payment = 'paid', status = 'confirmed', cancelled_at = null, cancelled_by = null, cancel_reason = null where id = v_refund.booking_id;
    insert into notifications (user_id, kind, title, body, url)
    select b.user_id, 'refund_rejected', 'Refund request declined',
      coalesce(p_note, 'Your refund request was not approved.'), '/account'
    from bookings b where b.id = v_refund.booking_id;
  end if;

  perform log_audit('refund.reviewed', 'refund', p_refund_id::text,
    jsonb_build_object('by', v_user, 'approved', p_approve, 'note', p_note));
end; $$;
