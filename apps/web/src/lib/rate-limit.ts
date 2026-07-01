import "server-only";

/**
 * In-memory fixed-window rate limiter (per server instance). Adequate for a
 * single-instance / standalone deployment (per ADR 0001). In a multi-instance
 * serverless deployment this is best-effort per-instance — swap in a shared
 * store (Upstash/Redis) behind this same interface when horizontal scaling
 * lands. Every caller goes through `rateLimit()`, so that swap is one file.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();
let lastSweep = 0;
const SWEEP_INTERVAL_MS = 60_000;

/**
 * Evict expired buckets so the map can't grow unbounded under many distinct
 * keys (per-IP for public endpoints). Throttled to once per minute so it stays
 * amortized O(1) on the hot path.
 */
function sweep(now: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, b] of store) {
    if (b.resetAt <= now) store.delete(key);
  }
}

export interface RateResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateResult {
  const now = Date.now();
  sweep(now);
  const b = store.get(key);
  if (!b || b.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterMs: 0 };
  }
  if (b.count >= limit) {
    return { ok: false, remaining: 0, retryAfterMs: b.resetAt - now };
  }
  b.count += 1;
  return { ok: true, remaining: limit - b.count, retryAfterMs: 0 };
}

/**
 * Best-effort client identifier for per-IP limiting of unauthenticated
 * endpoints. Uses the left-most `x-forwarded-for` hop (the original client as
 * seen by the edge proxy), falling back to a shared bucket when absent.
 */
export function clientKey(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "anon";
}
