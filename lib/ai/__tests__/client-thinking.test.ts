import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isAIEnabled } from '../client'

describe('AI Client & Thinking Config Configuration Tests', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('checks if AI is enabled when environment variables are set', () => {
    process.env.MOCHI_AI_ENABLED = 'true'
    process.env.GEMINI_API_KEY = 'mock-api-key'
    expect(isAIEnabled()).toBe(true)

    process.env.MOCHI_AI_ENABLED = 'false'
    expect(isAIEnabled()).toBe(false)
  })
})
