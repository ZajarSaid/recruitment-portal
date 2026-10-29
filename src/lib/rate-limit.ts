/**
 * Best-effort in-memory rate limiter.
 *
 * This is intentionally simple: it slows down brute-force attempts for a
 * single Node.js process. It does not coordinate across multiple processes or
 * serverless instances. For production deployments at scale, replace this with
 * a shared store (for example, a database table or an external cache).
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; remaining: 0; retryAfterMs: number };

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    return { ok: false, remaining: 0, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count };
}

/** Test/maintenance helper to clear all counters. */
export function resetRateLimits(): void {
  buckets.clear();
}
