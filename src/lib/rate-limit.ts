/**
 * Rate limiter supporting both in-memory sliding-window tracking (single instance)
 * and distributed Upstash Redis REST calls (multi-instance / serverless edge).
 */

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
  remaining?: number;
}

const buckets = new Map<string, number[]>();
const MAX_BUCKETS = 20_000;

/**
 * In-memory sliding-window rate limiter.
 */
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
    return {
      allowed: false,
      retryAfterMs,
      remaining: 0,
    };
  }

  hits.push(now);
  buckets.set(key, hits);
  return {
    allowed: true,
    retryAfterMs: 0,
    remaining: opts.limit - hits.length,
  };
}

/**
 * Distributed rate limiter with automatic in-memory fallback.
 * If UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set, issues REST requests.
 */
export async function rateLimitDistributed(
  key: string,
  opts: RateLimitOptions
): Promise<RateLimitResult> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    // Fall back to local in-memory sliding window
    return rateLimit(key, opts);
  }

  const redisKey = `ratelimit:${key}`;
  const windowSec = Math.ceil(opts.windowMs / 1000);

  try {
    // Pipeline command via Upstash REST API: INCR and EXPIRE if new
    const res = await fetch(`${redisUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, windowSec, "NX"],
        ["TTL", redisKey],
      ]),
      // 1.5s timeout for fast fallback
      signal: AbortSignal.timeout(1500),
    });

    if (!res.ok) {
      return rateLimit(key, opts);
    }

    const data = (await res.json()) as Array<{ result: number }>;
    const count = data[0]?.result ?? 1;
    const ttlSec = data[2]?.result ?? windowSec;

    if (count > opts.limit) {
      return {
        allowed: false,
        retryAfterMs: Math.max(0, ttlSec * 1000),
        remaining: 0,
      };
    }

    return {
      allowed: true,
      retryAfterMs: 0,
      remaining: Math.max(0, opts.limit - count),
    };
  } catch {
    // Graceful degradation: fall back to in-memory limiter on network failure
    return rateLimit(key, opts);
  }
}

/**
 * Resets all rate limit buckets or a specific key. Useful for tests.
 */
export function resetRateLimit(key?: string): void {
  if (key) {
    buckets.delete(key);
  } else {
    buckets.clear();
  }
}

export function clientKey(ip: string | null, id: string): string {
  return (ip ?? "unknown") + ":" + id;
}
