'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { admin as adminDb } from '@/lib/supabase/admin';
import { requireUser, requireRole } from '@/lib/auth/rbac';
import { action } from '@/lib/auth/action';
import { rateLimit, clientKey } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';
import { ActionError, type Result, err, ok } from '@/lib/result';
import { credentialsSchema, emailOnlySchema, newPasswordSchema, roleSchema, signUpSchema, profileSchema, ownerProfileSchema } from './schema';

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
      throw new ActionError('UNAUTHENTICATED', error.message || 'Wrong email or password.');
    }

    // Credentials were correct — but a suspended/deleted account's login
    // isn't removed (see 0049_account_deletion_requests.sql), so this is
    // caught here rather than only surfacing once they reach a dashboard.
    const { data: { user } } = await db.auth.getUser();
    if (user) {
      const { data: profile } = await db.from('profiles').select('account_status').eq('id', user.id).maybeSingle();
      if (profile?.account_status === 'deleted') {
        await db.auth.signOut();
        throw new ActionError('FORBIDDEN', 'This account has been deleted. Contact us if you think this is a mistake.');
      }
      if (profile?.account_status === 'suspended') {
        await db.auth.signOut();
        throw new ActionError('FORBIDDEN', 'This account has been suspended. Contact us if you think this is a mistake.');
      }
    }

    await db.rpc('record_login_success');

    // Return the role-based default route so client side can perform hard navigation
    let redirectTo = '/';
    if (user) {
      const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (profile?.role === 'owner') redirectTo = '/owner';
      else if (profile?.role === 'admin') redirectTo = '/admin';
      else if (profile?.role === 'student') redirectTo = '/account';
    }

    return { ok: true as const, redirectTo };
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
        // NOTE: the actual link the user receives is controlled by the
        // "Confirm signup" template in Supabase Dashboard > Authentication >
        // Email Templates, which must point at /auth/confirm (token_hash
        // flow), not /auth/callback (that one's OAuth-only now). This
        // emailRedirectTo is kept only as the allow-listed fallback Supabase
        // falls back to if the template is ever reset to default.
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
      // Same "Confirm signup" template as signUp() above controls the real link.
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
      // Real link comes from the "Magic Link" template (must use /auth/confirm + type=magiclink).
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
    // Real link comes from the "Reset Password" template (must use /auth/confirm + type=recovery).
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

/**
 * Owner-facing public profile (bio + public contact email) shown on the
 * "Centre Owner" card on every one of their centre listing pages.
 */
export async function updateOwnerProfile(raw: unknown): Promise<Result<{ ok: true }>> {
  return action(ownerProfileSchema, raw, async (input) => {
    const user = await requireRole('owner');
    const db = await createClient();
    const { error } = await db
      .from('profiles')
      .update({ bio: input.bio || null, public_email: input.publicEmail || null })
      .eq('id', user.id);
    if (error) throw new ActionError('INTERNAL', 'Could not save your public profile. Try again.');
    revalidatePath('/owner/settings');
    return { ok: true as const };
  });
}

const OWNER_AVATAR_ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

/**
 * Upload/replace the owner's profile photo. Routed through the service-role
 * client (same trusted-upload pattern as uploadCentreImage in
 * features/centres/actions.ts) since a direct browser-session write to
 * Storage hits an RLS rejection there too.
 */
export async function uploadOwnerAvatar(formData: FormData): Promise<Result<{ url: string }>> {
  const user = await requireRole('owner');

  const file = formData.get('file');
  if (!(file instanceof File)) return err('VALIDATION', 'No file provided.');
  if (!OWNER_AVATAR_ALLOWED_MIME.includes(file.type)) {
    return err('VALIDATION', `${file.type || 'That file type'} isn't supported — use JPEG, PNG, WebP, or AVIF.`);
  }
  if (file.size > 5 * 1024 * 1024) return err('VALIDATION', 'Image must be under 5 MB.');

  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `avatars/${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await adminDb.storage.from('listing-images').upload(path, file, { upsert: false, contentType: file.type });
  if (upErr) return err('INTERNAL', `Upload failed: ${upErr.message}`);

  const { data: pub } = adminDb.storage.from('listing-images').getPublicUrl(path);
  const { error: updErr } = await adminDb.from('profiles').update({ avatar_url: pub.publicUrl }).eq('id', user.id);
  if (updErr) return err('INTERNAL', updErr.message);

  revalidatePath('/owner/settings');
  return ok({ url: pub.publicUrl });
}

/** Sign out and return to home. */
export async function signOut(): Promise<void> {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (user) await logAudit('auth.logout', 'profile', user.id);
  await db.auth.signOut();
  redirect('/');
}
