'use server';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { action } from '@/lib/auth/action';
import { rateLimit, clientKey } from '@/lib/rate-limit';
import type { Result } from '@/lib/result';
import { err } from '@/lib/result';
import { newsletterSchema } from './schema';

/**
 * Footer newsletter signup. Always returns ok on a duplicate email — same
 * account-enumeration reasoning as password reset (features/auth/actions.ts):
 * don't let the response reveal whether an address is already subscribed.
 */
export async function subscribeNewsletter(raw: unknown): Promise<Result<{ ok: true }>> {
  const h = await headers();
  if (!(await rateLimit(clientKey(h, 'newsletter'), 5, 60_000)).success) {
    return err('RATE_LIMITED', 'Too many attempts. Please try again in a minute.');
  }

  return action(newsletterSchema, raw, async (input) => {
    const db = await createClient();
    const { error } = await db.from('newsletter_subscribers').insert({ email: input.email });
    // 23505 = unique_violation (already subscribed) — treat as success, not an error.
    if (error && error.code !== '23505') throw error;
    return { ok: true as const };
  });
}
