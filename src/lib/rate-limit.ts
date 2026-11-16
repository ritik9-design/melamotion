type Bucket = { count: number; reset: number };

const buckets = new Map<string, Bucket>();

export function resetRateLimits() {
  buckets.clear();
}

export function isRateLimited(key: string, limit: number, windowMs: number, now = Date.now()) {
  const bucket = buckets.get(key);
  if (!bucket || bucket.reset <= now) return false;
  return bucket.count >= limit;
}

export function recordFailure(key: string, windowMs: number, now = Date.now()) {
  const bucket = buckets.get(key);
  if (!bucket || bucket.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return;
  }
  bucket.count += 1;
}

export function clearRateLimit(key: string) {
  buckets.delete(key);
}

export function takeRateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  if (isRateLimited(key, limit, windowMs, now)) {
    const bucket = buckets.get(key);
    const retryAfter = bucket ? Math.max(1, Math.ceil((bucket.reset - now) / 1000)) : 1;
    return { ok: false as const, retryAfter };
  }
  recordFailure(key, windowMs, now);
  return { ok: true as const };
}
