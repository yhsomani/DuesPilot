/**
 * In-memory sliding-window rate limiter, keyed per client. Suitable for a
 * single-instance deployment; swap for a shared store (Redis etc.) when the
 * app runs multi-instance.
 */

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

const buckets = new Map<string, number[]>();
const MAX_BUCKETS = 20_000;

export function rateLimit(
  key: string,
  opts: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  if (buckets.size > MAX_BUCKETS) buckets.clear();

  const hits = (buckets.get(key) ?? []).filter(
    (t) => now - t < opts.windowMs
  );

  if (hits.length >= opts.limit) {
    const retryAfterMs = Math.max(0, opts.windowMs - (now - hits[0]));
    return { allowed: false, retryAfterMs };
  }

  hits.push(now);
  buckets.set(key, hits);
  return { allowed: true, retryAfterMs: 0 };
}

export function clientKey(ip: string | null, id: string): string {
  return (ip ?? "unknown") + ":" + id;
}