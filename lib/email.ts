import 'server-only';
import { admin } from '@/lib/supabase/admin';
import { resend as resendEnv } from '@/lib/env';

// Env access goes through lib/env.ts — single source of truth.
const RESEND_API_KEY = resendEnv.apiKey;
const EMAIL_FROM = resendEnv.from;

export const emailConfigured = Boolean(RESEND_API_KEY);

interface SendArgs { to: string; subject: string; html: string; template: string }

/**
 * Send a transactional email and record the outcome in `email_logs`.
 * Always uses the service-role client for the log write (no user session needed,
 * and email_logs is admin-only). Never throws — returns whether it sent.
 */
export async function sendEmail({ to, subject, html, template }: SendArgs): Promise<boolean> {
  if (!emailConfigured) {
    await logEmail(to, template, 'queued');
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
    });

    if (!res.ok) {
      // A Response body can only be read once — this used to call
      // res.text() twice, which throws on the second call and meant the
      // real error from Resend never made it into email_logs.
      const errorText = await res.text();
      await logEmail(to, template, 'failed', null, errorText.slice(0, 300));
      return false;
    }
    const data = (await res.json()) as { id?: string };
    await logEmail(to, template, 'sent', data.id ?? null);
    return true;
  } catch (e) {
    await logEmail(to, template, 'failed', null, String(e).slice(0, 300));
    return false;
  }
}

async function logEmail(to: string, template: string, status: string, providerId: string | null = null, error: string | null = null) {
  await admin.from('email_logs').insert({ to_email: to, template, status, provider_id: providerId, error });
}

/** Look up a user's email via the service-role admin API (not exposed via RLS). */
export async function getUserEmail(userId: string): Promise<string | null> {
  const { data } = await admin.auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}
