'use server';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { action } from '@/lib/auth/action';
import { rateLimit, clientKey } from '@/lib/rate-limit';
import type { Result } from '@/lib/result';
import { err } from '@/lib/result';
import { contactSchema } from './schema';

export async function submitContactMessage(raw: unknown): Promise<Result<{ id: string }>> {
  const h = await headers();
  if (!(await rateLimit(clientKey(h, 'contact'), 5, 60_000)).success) {
    return err('RATE_LIMITED', 'Too many messages. Please try again in a minute.');
  }

  return action(contactSchema, raw, async (input) => {
    const db = await createClient();
    const { data, error } = await db
      .from('contact_messages')
      .insert({
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        phone: input.phone || null,
        message: input.message,
      })
      .select('id')
      .single();
    if (error) throw error;
    return { id: data.id };
  });
}
