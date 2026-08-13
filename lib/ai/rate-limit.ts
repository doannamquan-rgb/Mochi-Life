/**
 * This is a best-effort application-level rate limiter, not a distributed security boundary.
 * Suitable for a single-instance Next.js app or basic usage limits.
 */

type RateLimitInfo = {
  count: number;
  windowStart: number;
};

const store = new Map<string, RateLimitInfo>();

const LIMITS = {
  chat: {
    max: 20,
    windowMs: 60 * 60 * 1000 // 1 hour
  },
  brief: {
    max: 10,
    windowMs: 24 * 60 * 60 * 1000 // 1 day
  },
  reaction: {
    max: 30,
    windowMs: 60 * 60 * 1000 // 1 hour
  }
};

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, info] of store.entries()) {
    if (now - info.windowStart > LIMITS.brief.windowMs) {
      store.delete(key);
    }
  }
}

export function checkRateLimit(userId: string, type: 'chat' | 'brief' | 'reaction'): { allowed: boolean; retryAfter?: number } {
  cleanup();

  const key = `${userId}:${type}`;
  const now = Date.now();
  const limitRule = LIMITS[type];

  const info = store.get(key) || { count: 0, windowStart: now };

  if (now - info.windowStart >= limitRule.windowMs) {
    info.count = 1;
    info.windowStart = now;
    store.set(key, info);
    return { allowed: true };
  }

  if (info.count >= limitRule.max) {
    const retryAfterMs = limitRule.windowMs - (now - info.windowStart);
    return { allowed: false, retryAfter: Math.ceil(retryAfterMs / 1000) };
  }

  info.count += 1;
  store.set(key, info);
  return { allowed: true };
}
