'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/rbac';
import { action } from '@/lib/auth/action';
import { logAudit } from '@/lib/audit';
import { ActionError, type Result, err, ok } from '@/lib/result';
import { deletionRequestSchema } from './schema';

export interface DeletionRequestStatus {
  status: 'pending' | 'rejected';
  requestedAt: string;
  reviewNotes: string | null;
}

/**
 * Fetch the current user's most recent deletion request, if any. Used to
 * show "Your request is pending review" / "was declined: <notes>" instead
 * of the request form once one exists.
 */
export async function getMyDeletionRequest(): Promise<DeletionRequestStatus | null> {
  const user = await requireUser();
  const db = await createClient();
  const { data } = await db
    .from('account_deletion_requests')
    .select('status, requested_at, review_notes')
    .eq('user_id', user.id)
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data || data.status === 'approved') return null; // approved = already gone; nothing to show
  return { status: data.status as 'pending' | 'rejected', requestedAt: data.requested_at, reviewNotes: data.review_notes };
}

/**
 * Request account deletion. Does NOT delete anything — creates a request
 * an admin must review and approve from /admin/account-deletions. See the
 * migration (0049_account_deletion_requests.sql) for why it works this way:
 * hard-deleting the account would cascade-delete paid booking/payment
 * history, which the Privacy Policy promises to retain.
 */
export async function requestAccountDeletion(raw: unknown): Promise<Result<{ ok: true }>> {
  return action(deletionRequestSchema, raw, async (input) => {
    const user = await requireUser();
    const db = await createClient();
    const { error } = await db.from('account_deletion_requests').insert({
      user_id: user.id,
      reason: input.reason || null,
    });
    if (error) {
      if (error.code === '23505') throw new ActionError('VALIDATION', 'You already have a pending deletion request.');
      throw new ActionError('INTERNAL', 'Could not submit your request. Try again.');
    }
    await logAudit('account.deletion_requested', 'profile', user.id, { reason: input.reason || null });
    revalidatePath('/account/profile');
    revalidatePath('/owner/settings');
    return { ok: true as const };
  });
}

/** Withdraw a still-pending deletion request. */
export async function cancelAccountDeletionRequest(): Promise<Result<{ ok: true }>> {
  const user = await requireUser();
  const db = await createClient();
  const { error } = await db
    .from('account_deletion_requests')
    .delete()
    .eq('user_id', user.id)
    .eq('status', 'pending');
  if (error) return err('INTERNAL', 'Could not cancel your request. Try again.');
  await logAudit('account.deletion_cancelled', 'profile', user.id);
  revalidatePath('/account/profile');
  revalidatePath('/owner/settings');
  return ok({ ok: true as const });
}
