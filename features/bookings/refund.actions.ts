'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth/rbac';
import { action } from '@/lib/auth/action';
import { ActionError, type Result } from '@/lib/result';
import { createRefund } from '@/lib/razorpay';
import { refundSchema } from './schema';
import { notifyBooking, notifyOwnerOfBooking, notifyAdmins } from '@/features/notifications/notify';
import { getUserEmail } from '@/lib/email';

/**
 * Issue a refund for a booking. Admin, or the owner of the centre, may refund.
 * Duplicate-safe: refuses if a non-failed refund already exists. Records a
 * refund row, calls Razorpay (if configured), updates booking payment status,
 * and audits — mirroring the existing payment/webhook patterns.
 */
export async function refundBooking(raw: unknown): Promise<Result<{ refundId: string }>> {
  return action(refundSchema, raw, async (input) => {
    const user = await requireRole('admin', 'owner');
    const db = await createClient();

    const { data: bk } = await db
      .from('bookings')
      .select('id, centre_id, amount, payment, razorpay_payment_id')
      .eq('id', input.bookingId)
      .maybeSingle();
    if (!bk) throw new ActionError('NOT_FOUND', 'Booking not found.');

    // Owner may only refund their own centre's bookings (admin any).
    if (user.role !== 'admin') {
      const { data: centre } = await db.from('centres').select('owner_id').eq('id', bk.centre_id).maybeSingle();
      if (centre?.owner_id !== user.id) throw new ActionError('FORBIDDEN', 'You can’t refund this booking.');
    }

    if (bk.payment === 'unpaid') throw new ActionError('CONFLICT', 'This booking was never paid.');
    if (bk.payment === 'refunded') throw new ActionError('CONFLICT', 'This booking is already fully refunded.');

    // Duplicate prevention: block if a pending/succeeded refund already exists.
    const { data: existing } = await admin
      .from('refunds').select('id, status').eq('booking_id', bk.id)
      .in('status', ['pending', 'processing', 'succeeded']).maybeSingle();
    if (existing) throw new ActionError('CONFLICT', 'A refund is already in progress or completed for this booking.');

    const amount = input.amount ?? Number(bk.amount);
    const isPartial = amount < Number(bk.amount);

    // Call Razorpay (null when not configured → manual/dev mode).
    let providerId: string | null = null;
    try {
      const r = bk.razorpay_payment_id ? await createRefund(bk.razorpay_payment_id, input.amount) : null;
      providerId = r?.id ?? null;
    } catch {
      throw new ActionError('INTERNAL', 'The payment provider rejected the refund. Please retry.');
    }

    const { data: refund, error } = await admin
      .from('refunds')
      .insert({
        booking_id: bk.id, amount, reason: input.reason ?? null, is_partial: isPartial,
        status: providerId ? 'succeeded' : 'pending', razorpay_refund_id: providerId,
        requested_by: user.id, processed_at: providerId ? new Date().toISOString() : null,
      })
      .select('id').single();
    if (error) {
      if (error.code === '23505') throw new ActionError('CONFLICT', 'Duplicate refund blocked.');
      throw error;
    }

    await admin.from('bookings').update({
      payment: isPartial ? 'partially_refunded' : 'refunded',
      status: isPartial ? undefined : 'refunded',
    }).eq('id', bk.id);

    await db.rpc('log_audit', {
      p_action: 'booking.refunded', p_entity_type: 'booking', p_entity_id: bk.id,
      p_metadata: { amount, partial: isPartial, provider_id: providerId },
    });

    // Notify the student (in-app + email).
    const { data: bkUser } = await admin.from('bookings').select('user_id').eq('id', bk.id).maybeSingle();
    let studentName = 'A student';
    if (bkUser?.user_id) {
      const [email, { data: studentProfile }] = await Promise.all([
        getUserEmail(bkUser.user_id),
        admin.from('profiles').select('full_name').eq('id', bkUser.user_id).maybeSingle(),
      ]);
      studentName = studentProfile?.full_name ?? studentName;
      await notifyBooking(bkUser.user_id, 'refunded', { email });
    }

    const { data: centreInfo } = await admin.from('centres').select('name, owner_id').eq('id', bk.centre_id).maybeSingle();

    // Tell the owner too — unless they're the one who just issued this
    // refund themselves, in which case they already know.
    if (centreInfo?.owner_id && user.role === 'admin') {
      const ownerEmail = await getUserEmail(centreInfo.owner_id);
      await notifyOwnerOfBooking(centreInfo.owner_id, 'refunded', {
        email: ownerEmail, studentName, centreName: centreInfo.name,
      });
    }

    // Admin oversight: only when an OWNER initiated the refund — money
    // going out on the owner's own say-so is worth central visibility. An
    // admin-initiated refund doesn't need to notify admins about their own
    // action. Deliberately not sent for every refund (see notifyAdmins).
    if (user.role === 'owner') {
      await notifyAdmins(
        'admin_refund_alert',
        `Refund issued: ₹${amount}${isPartial ? ' (partial)' : ''} — ${centreInfo?.name ?? 'a centre'}`,
        `<p>Owner-initiated refund of <strong>₹${amount}</strong>${isPartial ? ' (partial)' : ''} for ${studentName}'s booking at <strong>${centreInfo?.name ?? 'a centre'}</strong>.</p><p>Reason: ${input.reason ?? '—'}</p>`,
      );
    }

    revalidatePath('/admin');
    return { refundId: refund.id };
  });
}
