import { describe, it, expect } from 'vitest'
import { calculateNextDueDate } from '../recurring-sync'
import { toDbDate } from '../date-utils'

describe('calculateNextDueDate', () => {
  it('advances daily frequency by 1 day', () => {
    const from = new Date(2026, 0, 15) // 2026-01-15
    const next = calculateNextDueDate(from, 'daily')
    expect(toDbDate(next)).toBe('2026-01-16')
  })

  it('advances weekly frequency by 7 days', () => {
    const from = new Date(2026, 0, 15) // 2026-01-15
    const next = calculateNextDueDate(from, 'weekly')
    expect(toDbDate(next)).toBe('2026-01-22')
  })

  it('advances standard monthly frequency preserving day of month', () => {
    const from = new Date(2026, 0, 15) // 2026-01-15
    const next = calculateNextDueDate(from, 'monthly', 15)
    expect(toDbDate(next)).toBe('2026-02-15')
  })

  it('preserves anchor day 31 across short months (Jan 31 -> Feb 28 -> Mar 31 -> Apr 30)', () => {
    // 1. Jan 31 -> Feb 28 (2026 is non-leap year)
    const jan31 = new Date(2026, 0, 31)
    const febNext = calculateNextDueDate(jan31, 'monthly', 31)
    expect(toDbDate(febNext)).toBe('2026-02-28')

    // 2. Feb 28 with anchor 31 -> Mar 31 (not Mar 28!)
    const marNext = calculateNextDueDate(febNext, 'monthly', 31)
    expect(toDbDate(marNext)).toBe('2026-03-31')

    // 3. Mar 31 with anchor 31 -> Apr 30
    const aprNext = calculateNextDueDate(marNext, 'monthly', 31)
    expect(toDbDate(aprNext)).toBe('2026-04-30')

    // 4. Apr 30 with anchor 31 -> May 31
    const mayNext = calculateNextDueDate(aprNext, 'monthly', 31)
    expect(toDbDate(mayNext)).toBe('2026-05-31')
  })

  it('preserves anchor day 30 across February (Jan 30 -> Feb 28 -> Mar 30)', () => {
    const jan30 = new Date(2026, 0, 30)
    const febNext = calculateNextDueDate(jan30, 'monthly', 30)
    expect(toDbDate(febNext)).toBe('2026-02-28')

    const marNext = calculateNextDueDate(febNext, 'monthly', 30)
    expect(toDbDate(marNext)).toBe('2026-03-30')
  })

  it('advances yearly frequency preserving anchor day and month', () => {
    const from = new Date(2026, 7, 14) // 2026-08-14
    const next = calculateNextDueDate(from, 'yearly', 14, 8)
    expect(toDbDate(next)).toBe('2027-08-14')
  })

  it('handles leap year Feb 29 for yearly recurrence (2024 leap -> 2025 non-leap -> 2028 leap)', () => {
    // 2024 (leap) -> 2025 (non-leap: Feb 28)
    const leap2024 = new Date(2024, 1, 29)
    const next2025 = calculateNextDueDate(leap2024, 'yearly', 29, 2)
    expect(toDbDate(next2025)).toBe('2025-02-28')

    // When advancing to 2028 (leap year), anchor 29 restores Feb 29
    const year2027 = new Date(2027, 1, 28)
    const leap2028 = calculateNextDueDate(year2027, 'yearly', 29, 2)
    expect(toDbDate(leap2028)).toBe('2028-02-29')
  })
})
