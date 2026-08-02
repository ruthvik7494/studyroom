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
    const { error } = await db.rpc('review_refund', {
      p_refund_id: input.refundId,
      p_approve: input.approve,
      p_note: input.note ?? undefined,
    });
    if (error) throw error;
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
