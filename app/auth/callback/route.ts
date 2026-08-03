import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { postAuthRedirect } from '@/lib/auth/post-auth-redirect';

/**
 * OAuth callback (Google, etc). Exchanges the `code` param for a session,
 * then routes the user on. New users (no role chosen yet) land on
 * /onboarding; everyone else on `next`.
 *
 * NOTE: email-link verification (signup confirm, magic link, password
 * reset) does NOT go through this route anymore — see /auth/confirm and the
 * comment there for why. This route is OAuth-only now.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (!code) return NextResponse.redirect(`${origin}/login?error=missing_code`);

  const db = await createClient();
  const { error } = await db.auth.exchangeCodeForSession(code);
  if (error) {
    const reason = /expired/i.test(error.message) ? 'expired' : 'invalid';
    return NextResponse.redirect(`${origin}/login?error=${reason}&next=${encodeURIComponent(next)}`);
  }

  return postAuthRedirect(db, origin, next);
}
