import { describe, it, expect } from 'vitest'
import {
  parseAndValidateVNDAmount,
  formatVND,
  formatTransactionAmount,
  THINKING_MODE_OPTIONS,
} from '@mochi/shared'

describe('Finance & Domain Validation Pure Logic', () => {
  describe('parseAndValidateVNDAmount', () => {
    it('should validate positive integer amounts', () => {
      const res = parseAndValidateVNDAmount(50000)
      expect(res.valid).toBe(true)
      expect(res.value).toBe(50000)
      expect(res.error).toBeUndefined()
    })

    it('should parse formatted string amounts with dots or commas', () => {
      const res1 = parseAndValidateVNDAmount('50.000')
      expect(res1.valid).toBe(true)
      expect(res1.value).toBe(50000)

      const res2 = parseAndValidateVNDAmount('1,500,000 đ')
      expect(res2.valid).toBe(true)
      expect(res2.value).toBe(1500000)
    })

    it('should reject 0 or negative numbers', () => {
      const resZero = parseAndValidateVNDAmount(0)
      expect(resZero.valid).toBe(false)

      const resNeg = parseAndValidateVNDAmount(-1000)
      expect(resNeg.valid).toBe(false)
    })

    it('should reject NaN, Infinity, and empty strings', () => {
      expect(parseAndValidateVNDAmount(NaN).valid).toBe(false)
      expect(parseAndValidateVNDAmount(Infinity).valid).toBe(false)
      expect(parseAndValidateVNDAmount('').valid).toBe(false)
      expect(parseAndValidateVNDAmount('abc').valid).toBe(false)
    })
  })

  describe('formatTransactionAmount', () => {
    it('should format income with positive prefix', () => {
      const res = formatTransactionAmount(100000, 'income')
      expect(res).toContain('+')
      expect(res).toContain('100.000')
    })

    it('should format expense with negative prefix', () => {
      const res = formatTransactionAmount(45000, 'expense')
      expect(res).toContain('-')
      expect(res).toContain('45.000')
    })
  })

  describe('THINKING_MODE_OPTIONS', () => {
    it('should contain fast, balanced, and deep modes with labels and icons', () => {
      const ids = THINKING_MODE_OPTIONS.map(m => m.id)
      expect(ids).toEqual(['fast', 'balanced', 'deep'])

      const fast = THINKING_MODE_OPTIONS.find(m => m.id === 'fast')
      expect(fast?.label).toBe('Siêu tốc')
      expect(fast?.icon).toBe('⚡')

      const deep = THINKING_MODE_OPTIONS.find(m => m.id === 'deep')
      expect(deep?.label).toBe('Suy luận sâu')
      expect(deep?.icon).toBe('🧠')
    })
  })
})
