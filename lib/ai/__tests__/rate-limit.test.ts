import { describe, it, expect } from 'vitest'
import { checkRateLimit } from '../rate-limit'

describe('In-Memory Rate Limiter Tests', () => {
  it('allows requests up to max limit and blocks exceeding requests', () => {
    const testUser = `user-${Date.now()}`

    // First 20 requests should be allowed
    for (let i = 0; i < 20; i++) {
      const res = checkRateLimit(testUser, 'chat')
      expect(res.allowed).toBe(true)
    }

    // 21st request should be blocked with retryAfter
    const blockedRes = checkRateLimit(testUser, 'chat')
    expect(blockedRes.allowed).toBe(false)
    expect(blockedRes.retryAfter).toBeGreaterThan(0)
  })
})
