'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/rbac';
import { action } from '@/lib/auth/action';
import { rateLimit, clientKey } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';
import { ActionError, type Result, err } from '@/lib/result';
import { credentialsSchema, emailOnlySchema, newPasswordSchema, roleSchema, signUpSchema, profileSchema } from './schema';

async function siteUrl(): Promise<string> {
  return process.env.NEXT_PUBLIC_SITE_URL ?? `https://${(await headers()).get('host')}`;
}

/**
 * Email + password sign-in. Rate-limited to blunt credential stuffing, plus a
 * per-account lockout (5 failures / 15 min) tracked in the database — the IP
 * rate limit alone doesn't stop a targeted attack against one account from
 * many IPs. Every outcome (blocked / failed / success) is audit-logged.
 */
export async function signInWithPassword(raw: unknown): Promise<Result<{ ok: true }>> {
  const h = await headers();
  if (!(await rateLimit(clientKey(h, 'signin'), 10, 60_000)).success)
    return err('RATE_LIMITED', 'Too many attempts. Please wait a minute.');

  return action(credentialsSchema, raw, async (input) => {
    const db = await createClient();

    const { data: locked } = await db.rpc('is_account_locked', { p_email: input.email });
    if (locked) {
      throw new ActionError('FORBIDDEN', 'Too many failed attempts. Please try again in a few minutes.');
    }

    const { error } = await db.auth.signInWithPassword({ email: input.email, password: input.password });
    if (error) {
      await db.rpc('record_login_failure', { p_email: input.email });
      throw new ActionError('UNAUTHENTICATED', 'Wrong email or password.');
    }
    await db.rpc('record_login_success');
    return { ok: true as const };
  });
}

/** Sign-up. Sends a verification email; profile row is created by the DB trigger. */
export async function signUp(raw: unknown): Promise<Result<{ needsVerification: boolean }>> {
  const h = await headers();
  if (!(await rateLimit(clientKey(h, 'signup'), 5, 60_000)).success)
    return err('RATE_LIMITED', 'Too many attempts. Please wait a minute.');

  return action(signUpSchema, raw, async (input) => {
    const db = await createClient();
    const { data, error } = await db.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        // handle_new_user() reads raw_user_meta_data->>'full_name' into profiles.
        data: { full_name: input.fullName },
        emailRedirectTo: `${await siteUrl()}/auth/callback?next=/onboarding`,
      },
    });
    if (error) throw new ActionError('CONFLICT', error.message);
    if (data.user) await logAudit('auth.register', 'profile', data.user.id, { email: input.email });
    return { needsVerification: !data.session };
  });
}

/**
 * Resend the sign-up verification email. Same rate limit bucket/shape as
 * sign-up itself — this is the exact same email-sending action from the
 * user's perspective and should not bypass that limit.
 */
export async function resendVerificationEmail(raw: unknown): Promise<Result<{ ok: true }>> {
  const h = await headers();
  if (!(await rateLimit(clientKey(h, 'signup'), 5, 60_000)).success)
    return err('RATE_LIMITED', 'Too many attempts. Please wait a minute.');

  return action(emailOnlySchema, raw, async (input) => {
    const db = await createClient();
    const { error } = await db.auth.resend({
      type: 'signup',
      email: input.email,
      options: { emailRedirectTo: `${await siteUrl()}/auth/callback?next=/onboarding` },
    });
    // Don't reveal whether the email exists/is already verified — same
    // account-enumeration protection as password reset.
    if (error) console.error('[auth] resend verification failed', error.message);
    await logAudit('auth.verification_resent', 'auth', input.email);
    return { ok: true as const };
  });
}

/** Passwordless magic-link sign-in. */
export async function sendMagicLink(raw: unknown): Promise<Result<{ ok: true }>> {
  const h = await headers();
  if (!(await rateLimit(clientKey(h, 'magiclink'), 5, 60_000)).success)
    return err('RATE_LIMITED', 'Too many attempts. Please wait a minute.');

  return action(emailOnlySchema, raw, async (input) => {
    const db = await createClient();
    const { error } = await db.auth.signInWithOtp({
      email: input.email,
      options: { emailRedirectTo: `${await siteUrl()}/auth/callback?next=/onboarding` },
    });
    if (error) throw new ActionError('INTERNAL', 'Could not send the link. Try again.');
    return { ok: true as const };
  });
}

/** Request a password-reset email. Always returns ok (don't leak which emails exist). */
export async function requestPasswordReset(raw: unknown): Promise<Result<{ ok: true }>> {
  const h = await headers();
  if (!(await rateLimit(clientKey(h, 'reset'), 5, 60_000)).success)
    return err('RATE_LIMITED', 'Too many attempts. Please wait a minute.');

  return action(emailOnlySchema, raw, async (input) => {
    const db = await createClient();
    await db.auth.resetPasswordForEmail(input.email, { redirectTo: `${await siteUrl()}/auth/callback?next=/auth/update-password` });
    await logAudit('auth.password_reset_requested', 'auth', input.email);
    return { ok: true as const };
  });
}

/** Set a new password (user arrives here via the reset link, already in a session). */
export async function updatePassword(raw: unknown): Promise<Result<{ ok: true }>> {
  return action(newPasswordSchema, raw, async (input) => {
    const user = await requireUser();
    const db = await createClient();
    const { error } = await db.auth.updateUser({ password: input.password });
    if (error) throw new ActionError('INTERNAL', error.message);
    await logAudit('auth.password_changed', 'profile', user.id);
    return { ok: true as const };
  });
}

/** Onboarding: choose student or owner (safe definer fn; never admin). */
export async function chooseRole(raw: unknown): Promise<Result<{ ok: true }>> {
  return action(roleSchema, raw, async (input) => {
    const user = await requireUser();
    const db = await createClient();
    const { error } = await db.rpc('choose_role', { p_role: input.role });
    if (error) throw new ActionError('INTERNAL', 'Could not save your choice. Try again.');
    await logAudit('profile.role_assigned', 'profile', user.id, { role: input.role });
    revalidatePath('/', 'layout');
    return { ok: true as const };
  });
}

/**
 * Update your own profile (name, phone). Uses the existing self-update RLS
 * policy on profiles, which freezes `role` — a user can never escalate here.
 */
export async function updateProfile(raw: unknown): Promise<Result<{ ok: true }>> {
  return action(profileSchema, raw, async (input) => {
    const user = await requireUser();
    const db = await createClient();
    const { error } = await db
      .from('profiles')
      .update({ full_name: input.fullName, phone: input.phone || null })
      .eq('id', user.id);
    if (error) throw new ActionError('INTERNAL', 'Could not save your profile. Try again.');
    revalidatePath('/account');
    revalidatePath('/', 'layout');
    return { ok: true as const };
  });
}

/** Sign out and return to home. */
export async function signOut(): Promise<void> {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (user) await logAudit('auth.logout', 'profile', user.id);
  await db.auth.signOut();
  redirect('/');
}
