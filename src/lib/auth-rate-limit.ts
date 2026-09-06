/**
 * Best-effort in-memory rate limit for auth Server Actions.
 * Resets per serverless isolate — not a global WAF. Good enough to slow
 * credential stuffing on the Vercel Hobby demo.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10;

export function authRateLimitKey(kind: "signin" | "signup", email: string): string {
  return `${kind}:${email.trim().toLowerCase()}`;
}

export function checkAuthRateLimit(key: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }
  if (bucket.count >= MAX_ATTEMPTS) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  bucket.count += 1;
  return { ok: true };
}
