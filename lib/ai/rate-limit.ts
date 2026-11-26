export type RateLimitResult = { allowed: boolean; retryAfter?: number }

export type RateLimitRule = { max: number; windowMs: number }

/**
 * Implementations must atomically consume one request for a key.
 * Replace the in-memory adapter with a shared store before scaling to multiple instances.
 */
export interface RateLimitStore {
  consume(key: string, rule: RateLimitRule, now: number): Promise<RateLimitResult>
}

export const RATE_LIMITS = {
  chat: { max: 20, windowMs: 60 * 60 * 1000 },
  brief: { max: 10, windowMs: 24 * 60 * 60 * 1000 },
  reaction: { max: 30, windowMs: 60 * 60 * 1000 },
} as const satisfies Record<string, RateLimitRule>

export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly entries = new Map<string, { count: number; windowStart: number }>()
  private lastCleanup = Date.now()

  async consume(key: string, rule: RateLimitRule, now: number): Promise<RateLimitResult> {
    if (now - this.lastCleanup >= RATE_LIMITS.brief.windowMs) {
      this.lastCleanup = now
      for (const [entryKey, value] of this.entries) {
        if (now - value.windowStart >= RATE_LIMITS.brief.windowMs) this.entries.delete(entryKey)
      }
    }

    const info = this.entries.get(key) ?? { count: 0, windowStart: now }
    if (now - info.windowStart >= rule.windowMs) {
      info.count = 1
      info.windowStart = now
      this.entries.set(key, info)
      return { allowed: true }
    }
    if (info.count >= rule.max) {
      return { allowed: false, retryAfter: Math.ceil((rule.windowMs - (now - info.windowStart)) / 1000) }
    }
    info.count += 1
    this.entries.set(key, info)
    return { allowed: true }
  }
}

export function createRateLimiter(store: RateLimitStore) {
  return (userId: string, type: keyof typeof RATE_LIMITS): Promise<RateLimitResult> =>
    store.consume(`${userId}:${type}`, RATE_LIMITS[type], Date.now())
}

// Single-process fallback only. No shared rate-limit service is configured in this repository.
const defaultRateLimitStore = new InMemoryRateLimitStore()
export const checkRateLimit = createRateLimiter(defaultRateLimitStore)
