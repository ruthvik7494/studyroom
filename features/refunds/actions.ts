'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/rbac';
import { action } from '@/lib/auth/action';
import { reviewRefundSchema, completeRefundSchema } from './schema';
import type { Result } from '@/lib/result';

/** Owner (of the centre) or admin approves/rejects a pending refund request. */
export async function reviewRefund(raw: unknown): Promise<Result<{ ok: true }>> {
  return action(reviewRefundSchema, raw, async (input) => {
    await requireRole('owner', 'admin');
    const db = await createClient();

    // Fetch refund record to get associated booking ID
    const { data: refund } = await db.from('refunds').select('booking_id').eq('id', input.refundId).single();

    const { error } = await db.rpc('review_refund', {
      p_refund_id: input.refundId,
      p_approve: input.approve,
      p_note: input.note ?? undefined,
    });
    if (error) throw error;

    // If refund was rejected, update booking state back to active & confirmed (charge stands)
    if (!input.approve && refund?.booking_id) {
      const { admin } = await import('@/lib/supabase/admin');
      await admin
        .from('bookings')
        .update({
          status: 'confirmed',
          payment: 'paid',
          cancelled_at: null,
          cancelled_by: null,
          cancel_reason: null,
        })
        .eq('id', refund.booking_id);
    }

    revalidatePath('/owner/refunds');
    revalidatePath('/account');
    return { ok: true };
  });
}

/** Owner/admin marks an already-approved refund as actually paid out
 * (processed via Razorpay's own dashboard — see the migration's notes on
 * why this isn't an automated Razorpay API call yet). */
export async function completeRefund(raw: unknown): Promise<Result<{ ok: true }>> {
  return action(completeRefundSchema, raw, async (input) => {
    await requireRole('owner', 'admin');
    const db = await createClient();
    const { error } = await db.rpc('complete_refund', {
      p_refund_id: input.refundId,
      p_razorpay_refund_id: input.razorpayRefundId ?? undefined,
    });
    if (error) throw error;
    revalidatePath('/owner/refunds');
    revalidatePath('/account');
    return { ok: true };
  });
}
