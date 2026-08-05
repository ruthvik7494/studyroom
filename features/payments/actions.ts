'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/rbac';
import { action } from '@/lib/auth/action';
import { ActionError, type Result } from '@/lib/result';
import { createOrder, verifyPaymentSignature, razorpayConfigured, publishableKey } from '@/lib/razorpay';
import { notifyBooking, notifyOwnerOfBooking } from '@/features/notifications/notify';
import { getUserEmail } from '@/lib/email';
import { z } from 'zod';

const startSchema = z.object({
  bookingId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
}).refine((v) => !!v.bookingId !== !!v.groupId, { message: 'Provide exactly one of bookingId or groupId' });

interface StartResult {
  configured: boolean;
  orderId?: string;
  amount?: number;
  keyId?: string | null;
}

/**
 * Begin payment for a booking, or a whole multi-hour group at once. If
 * Razorpay isn't configured, returns { configured:false } and the UI shows a
 * pay-at-centre confirmation instead.
 *
 * Group payment: sums only the still-unpaid bookings in the group (in case
 * some were already paid individually before this existed, or in a retry),
 * creates ONE order for that total, and stamps that same razorpay_order_id
 * onto every one of those rows. The webhook already updates every booking
 * matching an order id (not just one row), so marking them all paid needs no
 * change there — see app/api/webhooks/razorpay/route.ts.
 */
export async function startPayment(raw: unknown): Promise<Result<StartResult>> {
  return action(startSchema, raw, async (input) => {
    const user = await requireUser();
    const db = await createClient();

    if (input.groupId) {
      const { data: bookings } = await db
        .from('bookings')
        .select('id, amount, user_id, payment, status, expires_at')
        .eq('booking_group_id', input.groupId);
      if (!bookings || bookings.length === 0 || bookings[0]!.user_id !== user.id) {
        throw new ActionError('NOT_FOUND', 'Booking not found.');
      }
      const unpaid = bookings.filter((b) => b.payment !== 'paid');
      if (unpaid.length === 0) throw new ActionError('CONFLICT', 'This booking is already paid.');
      // A hold that's already lapsed (even if not yet swept to 'expired')
      // may have had its seat given to someone else — don't let payment
      // proceed on a reservation that's no longer actually held.
      const lapsed = unpaid.some((b) => b.status === 'expired' || (b.expires_at && new Date(b.expires_at) < new Date()));
      if (lapsed) throw new ActionError('CONFLICT', 'This reservation has expired. Please book again.');

      if (!razorpayConfigured) return { configured: false };

      const total = unpaid.reduce((sum, b) => sum + Number(b.amount), 0);
      const order = await createOrder(total, input.groupId);
      await db.from('bookings').update({ razorpay_order_id: order.id }).in('id', unpaid.map((b) => b.id));
      return { configured: true, orderId: order.id, amount: order.amount, keyId: publishableKey };
    }

    const { data: booking } = await db
      .from('bookings')
      .select('id, amount, user_id, payment, status, expires_at')
      .eq('id', input.bookingId!)
      .maybeSingle();
    if (!booking || booking.user_id !== user.id) throw new ActionError('NOT_FOUND', 'Booking not found.');
    if (booking.payment === 'paid') throw new ActionError('CONFLICT', 'This booking is already paid.');
    if (booking.status === 'expired' || (booking.expires_at && new Date(booking.expires_at) < new Date())) {
      throw new ActionError('CONFLICT', 'This reservation has expired. Please book again.');
    }

    if (!razorpayConfigured) return { configured: false };

    const order = await createOrder(booking.amount, booking.id);
    await db.from('bookings').update({ razorpay_order_id: order.id }).eq('id', booking.id);
    return { configured: true, orderId: order.id, amount: order.amount, keyId: publishableKey };
  });
}

const verifySchema = z.object({
  bookingId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
  orderId: z.string(),
  paymentId: z.string(),
  signature: z.string(),
}).refine((v) => !!v.bookingId !== !!v.groupId, { message: 'Provide exactly one of bookingId or groupId' });

/** Verify the checkout signature and mark the booking(s) paid + confirmed. */
export async function confirmPayment(raw: unknown): Promise<Result<{ ok: true }>> {
  return action(verifySchema, raw, async (input) => {
    const user = await requireUser();
    if (!verifyPaymentSignature(input.orderId, input.paymentId, input.signature)) {
      throw new ActionError('FORBIDDEN', 'Payment could not be verified.');
    }
    const db = await createClient();

    let query = db
      .from('bookings')
      .update({ payment: 'paid', status: 'confirmed', razorpay_payment_id: input.paymentId })
      .eq('user_id', user.id)
      .eq('razorpay_order_id', input.orderId) // bind to the order we created
      .neq('status', 'confirmed');            // exactly-once vs the webhook

    query = input.groupId ? query.eq('booking_group_id', input.groupId) : query.eq('id', input.bookingId!);

    const { data: updated, error } = await query.select('user_id, centre_id, centres(name, owner_id)');
    if (error) throw error;
    if (updated && updated.length > 0) {
      const email = await getUserEmail(user.id);
      await notifyBooking(user.id, 'confirmed', { email });

      // Owner previously got no email when a booking at their centre was
      // paid for — only the student did. Notify the owner too.
      const centre = updated[0]!.centres as unknown as { name: string; owner_id: string | null } | null;
      if (centre?.owner_id) {
        const [ownerEmail, { data: studentProfile }] = await Promise.all([
          getUserEmail(centre.owner_id),
          db.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
        ]);
        await notifyOwnerOfBooking(centre.owner_id, 'confirmed', {
          email: ownerEmail,
          studentName: studentProfile?.full_name ?? 'A student',
          centreName: centre.name,
        });
      }
    }
    revalidatePath('/account');
    return { ok: true as const };
  });
}
