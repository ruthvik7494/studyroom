'use server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { requireUser, getSessionUser } from '@/lib/auth/rbac';
import { action } from '@/lib/auth/action';
import { rateLimit, clientKey } from '@/lib/rate-limit';
import type { Result } from '@/lib/result';
import { ActionError, err } from '@/lib/result';
import { reviewSchema, reportSchema, updateReviewSchema, deleteReviewSchema, respondToReviewSchema } from './schema';

/**
 * Submit a review for a centre.
 *
 * Data flow: validate (client) → validate (server) → insert into `reviews`.
 * Rules enforced in the DB (defense in depth): unique (centre_id, author_id)
 * blocks a second review; the `block_self_review` trigger stops owners reviewing
 * their own centre; RLS requires author_id = auth.uid().
 *
 * `is_verified` is deliberately NOT set here — it is only ever set true by the
 * check-in pipeline, so "verified visit" badges can't be faked (charter/trust).
 */
export async function submitReview(raw: unknown): Promise<Result<{ id: string }>> {
  return action(reviewSchema, raw, async (input) => {
    const user = await requireUser();
    const db = await createClient();

    const { data, error } = await db
      .from('reviews')
      .insert({
        centre_id: input.centreId,
        author_id: user.id,
        rating: input.rating,
        body: input.body || null,
      })
      .select('id')
      .single();

    if (error) {
      // surface friendly messages for the two expected DB guards
      if (error.code === '23505') throw new ActionError('CONFLICT', 'You’ve already reviewed this centre.');
      if (error.message.includes('OWNER_CANNOT_REVIEW')) throw new ActionError('FORBIDDEN', 'Owners can’t review their own centre.');
      throw error;
    }

    revalidatePath(`/centres`);
    return { id: data.id };
  });
}

/** Report a review for moderation (guests allowed). Rate-limited: guests + no
 * uniqueness constraint means this is otherwise floodable. */
export async function reportReview(raw: unknown): Promise<Result<{ ok: true }>> {
  const h = await headers();
  if (!(await rateLimit(clientKey(h, 'report'), 10, 60_000)).success)
    return err('RATE_LIMITED', 'Too many reports. Please wait a minute.');

  return action(reportSchema, raw, async (input) => {
    const db = await createClient();
    const user = await getSessionUser();

    const { error } = await db.from('review_reports').insert({
      review_id: input.reviewId,
      reporter_id: user?.id ?? null,
      reason: input.reason,
    });
    if (error) throw error;

    return { ok: true as const };
  });
}

/** Edit your own review — RLS ("reviews author update") restricts this to
 * the review's own author regardless of what centreId is passed in. */
export async function updateReview(raw: unknown): Promise<Result<{ ok: true }>> {
  return action(updateReviewSchema, raw, async (input) => {
    const user = await requireUser();
    const db = await createClient();
    const { error, count } = await db
      .from('reviews')
      .update({ rating: input.rating, body: input.body || null, updated_at: new Date().toISOString() }, { count: 'exact' })
      .eq('id', input.reviewId)
      .eq('author_id', user.id);
    if (error) throw error;
    if (!count) throw new ActionError('NOT_FOUND', 'Review not found.');
    revalidatePath('/account');
    revalidatePath('/centres');
    return { ok: true as const };
  });
}

/** Delete your own review — RLS ("reviews author delete") restricts this to
 * the review's own author (or admin) regardless of what's passed in. */
export async function deleteReview(raw: unknown): Promise<Result<{ ok: true }>> {
  return action(deleteReviewSchema, raw, async (input) => {
    const user = await requireUser();
    const db = await createClient();
    const { error, count } = await db
      .from('reviews')
      .delete({ count: 'exact' })
      .eq('id', input.reviewId)
      .eq('author_id', user.id);
    if (error) throw error;
    if (!count) throw new ActionError('NOT_FOUND', 'Review not found.');
    revalidatePath('/account');
    revalidatePath('/centres');
    return { ok: true as const };
  });
}

/** Centre owner responds to a review on their own centre. */
export async function respondToReview(raw: unknown): Promise<Result<{ ok: true }>> {
  return action(respondToReviewSchema, raw, async (input) => {
    await requireUser();
    const db = await createClient();
    const { error } = await db.rpc('respond_to_review', { p_review_id: input.reviewId, p_response: input.response });
    if (error) {
      if (error.message.includes('FORBIDDEN')) throw new ActionError('FORBIDDEN', 'You can only respond to reviews on your own centre.');
      if (error.message.includes('NOT_FOUND')) throw new ActionError('NOT_FOUND', 'Review not found.');
      throw error;
    }
    revalidatePath('/centres');
    revalidatePath('/owner');
    return { ok: true as const };
  });
}
