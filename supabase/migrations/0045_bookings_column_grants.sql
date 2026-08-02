-- 0045_bookings_column_grants.sql
--
-- FINDING: the "bookings own update" RLS policy (0008_bookings.sql) lets a
-- student update their own booking row, and an owner update rows at their
-- centres — but RLS's USING clause only controls *row* visibility, not
-- *column* access. Since every state-changing update (confirm, cancel,
-- reschedule, check-in, refund) is meant to go through a SECURITY DEFINER
-- function or the service-role client (both of which bypass this policy
-- entirely), nothing legitimate needed the ability to update arbitrary
-- columns through it — but nothing had ever restricted it either. In
-- practice this meant: any authenticated student could call
--   PATCH /rest/v1/bookings?id=eq.<their_own_booking_id>
--   { "status": "confirmed", "payment": "paid" }
-- directly against Supabase's REST API using their own valid session token,
-- and RLS would allow it, because the row genuinely is theirs.
--
-- FIX: Postgres supports column-level grants alongside row-level RLS. I
-- traced every direct (non-service-role) .update() call on bookings across
-- the codebase — only two columns are ever legitimately set this way:
--   - razorpay_order_id  (student starting a payment attempt on their own booking)
--   - rescheduled_from   (student completing a reschedule, tagging history)
-- Every other mutation (status, payment, amount, cancelled_at, etc.) already
-- goes through cancel_booking(), reschedule_booking_group(), the Razorpay
-- webhook, or the service-role client — none of which are affected by this
-- table-level grant change, since SECURITY DEFINER functions and the
-- service-role key both bypass grants and RLS alike.

revoke update on bookings from authenticated;
grant update (razorpay_order_id, rescheduled_from) on bookings to authenticated;

-- SAME CLASS OF ISSUE ON centres: the "centres owner update" policy lets an
-- owner update any column on their own centre row, including is_verified,
-- is_published, and status — none of which the application code intends an
-- owner to set directly. is_verified is an admin-only attestation (the
-- owner-facing forms deliberately never expose it); is_published and status
-- are meant to move only through set_centre_published()/archive_centre()/
-- admin approval — but nothing had ever stopped a direct
--   PATCH /rest/v1/centres?id=eq.<own_centre_id>
--   { "is_verified": true, "status": "approved" }
-- from succeeding, since RLS only checks row ownership.
--
-- One legitimate exception existed: submitForReview() directly set
-- status='pending_review' via the regular client — moved into a proper
-- SECURITY DEFINER function below (matching the same pattern already used
-- for archive_centre/unarchive_centre/set_centre_published), which validates
-- the transition is only ever draft/rejected -> pending_review.
revoke update (is_verified, is_published, status, owner_id) on centres from authenticated;

create or replace function submit_centre_for_review(p_centre_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_centre centres%rowtype;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  select * into v_centre from centres where id = p_centre_id for update;
  if v_centre.id is null then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if v_centre.owner_id <> v_user then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if v_centre.status not in ('draft', 'rejected') then
    raise exception 'INVALID_STATE' using errcode='P0001'; -- e.g. already approved/pending
  end if;

  update centres set status = 'pending_review' where id = p_centre_id;
  perform log_audit('centre.submitted_for_review', 'centre', p_centre_id::text, jsonb_build_object('by', v_user));
end; $$;

grant execute on function submit_centre_for_review(uuid) to authenticated;
