import { describe, expect, it } from 'vitest'
import { MAX_REQUEST_BYTES, validateChatInput } from '../chat-input'

describe('validateChatInput', () => {
  it('accepts bounded chat input and defaults missing optional fields', () => {
    expect(validateChatInput({ message: ' Xin chào ' })).toMatchObject({
      success: true,
      data: { userMessage: 'Xin chào', history: [] },
    })
  })

  it('rejects missing message, invalid roles, oversized messages, and long histories', () => {
    expect(validateChatInput({ message: ' ' }).success).toBe(false)
    expect(validateChatInput({ message: 'ok', history: [{ role: 'system', content: 'inject' }] }).success).toBe(false)
    expect(validateChatInput({ message: 'x'.repeat(8_001) }).success).toBe(false)
    expect(validateChatInput({ message: 'ok', history: Array.from({ length: 25 }, () => ({ role: 'user', content: 'x' })) }).success).toBe(false)
  })

  it('defines a request byte ceiling for the route handler', () => {
    expect(MAX_REQUEST_BYTES).toBe(128 * 1024)
  })
})
