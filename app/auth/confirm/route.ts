import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { postAuthRedirect } from '@/lib/auth/post-auth-redirect';

/**
 * Email-link verification: signup confirmation, magic link, password
 * recovery. Deliberately separate from /auth/callback (OAuth-only).
 *
 * WHY THIS EXISTS — root cause of "That link is missing some information":
 * The old flow sent `{{ .ConfirmationURL }}` in the email, which points at
 * Supabase's own hosted `/auth/v1/verify` endpoint. That endpoint verifies
 * the token and THEN 302-redirects back to our `redirect_to` URL. That
 * second hop is fragile in two ways that both produce exactly this bug:
 *   1. If `redirect_to` isn't on the Auth > URL Configuration allow list,
 *      Supabase silently drops it and falls back to the bare Site URL — no
 *      `code` param at all.
 *   2. If the token was already consumed once (very common — Gmail/Outlook/
 *      corporate mail security scanners "pre-visit" every link in an email
 *      before the human clicks), Supabase's verify endpoint reports the
 *      error as a `#error=...` HASH fragment, not a query string. Hash
 *      fragments never reach the server at all, so our route sees a plain
 *      URL with no `code` — same "missing_code" outcome, every time.
 *
 * The fix: skip the hosted-redirect hop entirely. The email links directly
 * to *our own* domain with `token_hash` + `type` as normal query params
 * (which the server always receives), and we verify it ourselves with
 * `verifyOtp`. This requires updating the Supabase email templates — see
 * the paste-in snippets shared alongside this file.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/';

  if (!token_hash || !type) {
    return NextResponse.redirect(`${origin}/login?error=missing_code&next=${encodeURIComponent(next)}`);
  }

  const db = await createClient();
  const { error } = await db.auth.verifyOtp({ token_hash, type });
  if (error) {
    const reason = /expired/i.test(error.message) ? 'expired' : 'invalid';
    return NextResponse.redirect(`${origin}/login?error=${reason}&next=${encodeURIComponent(next)}`);
  }

  return postAuthRedirect(db, origin, next);
}
