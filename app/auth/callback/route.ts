import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';

/**
 * OAuth / magic-link / email-verification callback.
 * Exchanges the auth code for a session, then routes the user on. New users
 * (no role chosen yet) land on /onboarding; everyone else on `next`.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (!code) return NextResponse.redirect(`${origin}/login?error=missing_code`);

  const db = await createClient();
  const { error } = await db.auth.exchangeCodeForSession(code);
  if (error) {
    // Supabase's error message text distinguishes an expired code from an
    // already-used/invalid one — surface that instead of a single opaque
    // "auth" error, so the login page can show the right explanation and
    // (for signup verification) offer to resend the email.
    const reason = /expired/i.test(error.message) ? 'expired' : 'invalid';
    return NextResponse.redirect(`${origin}/login?error=${reason}&next=${encodeURIComponent(next)}`);
  }

  // New code
  if (next === '/auth/update-password') {
    const { data: { user } } = await db.auth.getUser();
    if (user) await logAudit('auth.password_reset_verified', 'profile', user.id);
    return NextResponse.redirect(`${origin}/auth/update-password`);
  }

  // Send users who haven't finished onboarding to choose a role.
  const { data: { user } } = await db.auth.getUser();
  if (user) {
    // email_confirmed_at is set at the moment of verification, so if it just
    // happened (within this request's lifetime) this callback IS the
    // verification click rather than, say, an OAuth/magic-link session that
    // happens to pass through the same route.
    const justVerified =
      user.email_confirmed_at && Date.now() - new Date(user.email_confirmed_at).getTime() < 60_000;
    await logAudit(justVerified ? 'auth.email_verified' : 'auth.login', 'profile', user.id);

    const { data: ob } = await db.from('onboarding_progress').select('completed').eq('user_id', user.id).maybeSingle();
    if (!ob?.completed) return NextResponse.redirect(`${origin}/onboarding?next=${encodeURIComponent(next)}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
