import 'server-only';

/**
 * Central environment validation. Import `env` instead of reading process.env
 * directly, so a missing/misconfigured variable fails at boot with a clear
 * message rather than a cryptic runtime crash deep in a request.
 *
 * Public (NEXT_PUBLIC_*) vars are also re-exported for client construction.
 * Server-only secrets are validated lazily so client bundles never touch them.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(
      `[env] Missing required environment variable: ${name}. ` +
        `Set it in .env.local (see .env.example). The app cannot start without it.`,
    );
  }
  return value;
}

function optional(value: string | undefined): string | undefined {
  return value && value.trim() !== '' ? value : undefined;
}

/** Required for the app to run at all (Supabase). Validated eagerly on import. */
export const env = {
  SUPABASE_URL: required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
  SUPABASE_ANON_KEY: required('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  SITE_URL: optional(process.env.NEXT_PUBLIC_SITE_URL) ?? 'http://localhost:3000',
} as const;

/** Service-role key — server-only, validated only when actually used (admin client). */
export function serviceRoleKey(): string {
  return required('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Optional integrations — callers check `configured` and degrade gracefully. */
export const razorpay = {
  keyId: optional(process.env.RAZORPAY_KEY_ID),
  keySecret: optional(process.env.RAZORPAY_KEY_SECRET),
  webhookSecret: optional(process.env.RAZORPAY_WEBHOOK_SECRET),
  get configured() { return Boolean(this.keyId && this.keySecret); },
} as const;

export const resend = {
  apiKey: optional(process.env.RESEND_API_KEY),
  from: optional(process.env.EMAIL_FROM) ?? 'StudyNook <onboarding@resend.dev>',
  get configured() { return Boolean(this.apiKey); },
} as const;

/**
 * Optional: backs rate limiting with Upstash Redis REST so limits are shared
 * across serverless instances instead of living in a single instance's memory
 * (see lib/rate-limit.ts). Not required to run the app — falls back to the
 * in-memory limiter (correct for local dev, not for a multi-instance deploy)
 * when unset.
 */
export const upstash = {
  url: optional(process.env.UPSTASH_REDIS_REST_URL),
  token: optional(process.env.UPSTASH_REDIS_REST_TOKEN),
  get configured() { return Boolean(this.url && this.token); },
} as const;
