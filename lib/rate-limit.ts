import 'server-only';
import { upstash } from '@/lib/env';

/**
 * Fixed-window rate limiter (charter §Reliability: rate-limit auth, search,
 * forms, expensive endpoints, webhooks).
 *
 * PRODUCTION NOTE: this app deploys to Vercel serverless, where each
 * invocation can land on a different, short-lived instance — an in-memory
 * counter does not see traffic from other instances, so limits are not
 * actually enforced across a real deployment. When `UPSTASH_REDIS_REST_URL`
 * / `UPSTASH_REDIS_REST_TOKEN` are set (see lib/env.ts), this backs the
 * limiter with Upstash Redis over its REST API so the count is shared. If
 * they're unset, it falls back to the in-memory store below, which remains
 * correct for local dev / a single long-lived instance only — set the
 * Upstash env vars before relying on these limits in production.
 */
interface Bucket { count: number; resetAt: number }
const store = new Map<string, Bucket>();

export interface RateLimitResult { success: boolean; remaining: number; resetAt: number }

function memoryHit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = store.get(key);
  if (!existing || existing.resetAt < now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, resetAt };
  }
  existing.count += 1;
  const success = existing.count <= limit;
  return { success, remaining: Math.max(0, limit - existing.count), resetAt: existing.resetAt };
}

async function upstashHit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const now = Date.now();
  const redisKey = `ratelimit:${key}`;
  try {
    // INCR first; only the caller that gets count === 1 sets the window TTL,
    // so concurrent first-hits don't each reset the window. There is a tiny
    // window between INCR and PEXPIRE where the key could survive without a
    // TTL if the process crashed mid-request — acceptable for rate limiting
    // (worst case: one window is briefly longer than intended, never shorter).
    const incrRes = await fetch(`${upstash.url}/incr/${encodeURIComponent(redisKey)}`, {
      headers: { authorization: `Bearer ${upstash.token}` },
      cache: 'no-store',
    });
    if (!incrRes.ok) throw new Error(`upstash incr failed: ${incrRes.status}`);
    const { result: count } = (await incrRes.json()) as { result: number };

    if (count === 1) {
      await fetch(`${upstash.url}/pexpire/${encodeURIComponent(redisKey)}/${windowMs}`, {
        headers: { authorization: `Bearer ${upstash.token}` },
        cache: 'no-store',
      });
    }

    const success = count <= limit;
    return { success, remaining: Math.max(0, limit - count), resetAt: now + windowMs };
  } catch {
    // Redis unreachable: fail open on the shared limiter but still apply the
    // in-memory guard for this instance, rather than letting the request
    // through with zero limiting at all.
    return memoryHit(key, limit, windowMs);
  }
}

export function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  if (upstash.configured) return upstashHit(key, limit, windowMs);
  return Promise.resolve(memoryHit(key, limit, windowMs));
}

/** Derive a client key from headers (best-effort IP) for anonymous limits. */
export function clientKey(headers: Headers, scope: string): string {
  const ip = headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? headers.get('x-real-ip') ?? 'unknown';
  return `${scope}:${ip}`;
}
