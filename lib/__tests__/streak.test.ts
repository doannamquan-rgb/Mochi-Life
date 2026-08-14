import { describe, it, expect } from 'vitest'
import { calculateStreak } from '../chinese-stats'
import { todayString, toDbDate } from '../date-utils'

describe('calculateStreak', () => {
  const getRelativeDate = (offsetDays: number) => {
    const d = new Date()
    d.setHours(12, 0, 0, 0)
    d.setDate(d.getDate() + offsetDays)
    return toDbDate(d)
  }

  it('returns 0 for empty session list', () => {
    expect(calculateStreak([])).toBe(0)
  })

  it('returns 1 when user studied only today', () => {
    const today = todayString()
    expect(calculateStreak([today])).toBe(1)
  })

  it('preserves streak of 1 when user studied yesterday but not today yet', () => {
    const yesterday = getRelativeDate(-1)
    expect(calculateStreak([yesterday])).toBe(1)
  })

  it('returns 2 when user studied today and yesterday', () => {
    const today = todayString()
    const yesterday = getRelativeDate(-1)
    expect(calculateStreak([today, yesterday])).toBe(2)
  })

  it('returns 3 when user studied 3 consecutive days ending yesterday', () => {
    const d1 = getRelativeDate(-1)
    const d2 = getRelativeDate(-2)
    const d3 = getRelativeDate(-3)
    expect(calculateStreak([d1, d2, d3])).toBe(3)
  })

  it('returns 0 when there is a gap (studied 2 days ago, but neither today nor yesterday)', () => {
    const d2 = getRelativeDate(-2)
    const d3 = getRelativeDate(-3)
    expect(calculateStreak([d2, d3])).toBe(0)
  })

  it('handles multiple sessions on the same day without overcounting', () => {
    const today = todayString()
    const yesterday = getRelativeDate(-1)
    expect(calculateStreak([today, today, yesterday, yesterday])).toBe(2)
  })

  it('breaks streak at the first missing day in sequence', () => {
    const today = todayString()
    const yesterday = getRelativeDate(-1)
    // missing day -2
    const d3 = getRelativeDate(-3)
    const d4 = getRelativeDate(-4)
    expect(calculateStreak([today, yesterday, d3, d4])).toBe(2)
  })
})
