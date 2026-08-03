import 'server-only';
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { logAudit } from '@/lib/audit';

/**
 * Shared "what happens right after a session is established" logic, used by
 * both /auth/callback (OAuth / Google) and /auth/confirm (email link
 * verification — signup confirm, magic link, password recovery). Both routes
 * end up in the exact same place once a session exists, so this is the one
 * spot that decides: password-recovery detour, audit log, onboarding gate.
 */
export async function postAuthRedirect(
  db: SupabaseClient<Database>,
  origin: string,
  next: string,
): Promise<NextResponse> {
  if (next === '/auth/update-password') {
    const { data: { user } } = await db.auth.getUser();
    if (user) await logAudit('auth.password_reset_verified', 'profile', user.id);
    return NextResponse.redirect(`${origin}/auth/update-password`);
  }

  const { data: { user } } = await db.auth.getUser();
  if (user) {
    // email_confirmed_at is set at the moment of verification, so if it just
    // happened (within this request's lifetime) this IS the verification
    // click rather than, say, a magic-link/OAuth session that happens to
    // pass through the same route.
    const justVerified =
      user.email_confirmed_at && Date.now() - new Date(user.email_confirmed_at).getTime() < 60_000;
    await logAudit(justVerified ? 'auth.email_verified' : 'auth.login', 'profile', user.id);

    const { data: ob } = await db.from('onboarding_progress').select('completed').eq('user_id', user.id).maybeSingle();
    if (!ob?.completed) return NextResponse.redirect(`${origin}/onboarding?next=${encodeURIComponent(next)}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
