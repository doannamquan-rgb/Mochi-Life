import { describe, it, expect } from 'vitest'
import {
  formatDate,
  formatDateTime,
  formatTime,
  formatShortMonth,
  formatDayLabel,
  getGreeting,
  getDateRange,
  getWeekRange,
  getMonthRange,
  toDbDate,
  fromDbDate,
  daysDiff,
  formatMonthName,
  todayString,
  isDateToday,
} from '../date-utils'

describe('date-utils', () => {
  it('formats dates in Vietnamese format (dd/MM/yyyy)', () => {
    expect(formatDate('2026-08-14')).toBe('14/08/2026')
    expect(formatDate(new Date(2026, 7, 14))).toBe('14/08/2026')
  })

  it('formats date and time (dd/MM/yyyy HH:mm)', () => {
    const d = new Date(2026, 7, 14, 15, 30)
    expect(formatDateTime(d)).toBe('14/08/2026 15:30')
  })

  it('formats time only (HH:mm)', () => {
    const d = new Date(2026, 7, 14, 9, 5)
    expect(formatTime(d)).toBe('09:05')
  })

  it('formats short month (MM/yyyy)', () => {
    expect(formatShortMonth('2026-08-14')).toBe('08/2026')
  })

  it('formats day label in Vietnamese (CN, T2, T3...)', () => {
    // 2026-08-14 is a Friday -> T6
    const friday = new Date(2026, 7, 14)
    expect(formatDayLabel(friday)).toBe('T6')

    // 2026-08-16 is a Sunday -> CN
    const sunday = new Date(2026, 7, 16)
    expect(formatDayLabel(sunday)).toBe('CN')
  })

  it('returns valid greetings based on hour', () => {
    const greeting = getGreeting()
    expect(['Chào buổi sáng', 'Chào buổi chiều', 'Chào buổi tối', 'Chào ban đêm']).toContain(greeting)
  })

  it('calculates date ranges correctly', () => {
    const all = getDateRange('all')
    expect(all.kind).toBe('all')
    expect(all.from).toBeNull()

    const d7 = getDateRange('7d')
    expect(d7.kind).toBe('bounded')
    if (d7.kind === 'bounded') {
      expect(d7.from).toBeInstanceOf(Date)
      expect(d7.toExclusive).toBeInstanceOf(Date)
    }
  })

  it('computes week and month ranges', () => {
    const d = new Date(2026, 7, 14)
    const week = getWeekRange(d)
    expect(week.from).toBeInstanceOf(Date)
    expect(week.to).toBeInstanceOf(Date)

    const month = getMonthRange(d)
    expect(month.from.getDate()).toBe(1)
    expect(month.to.getDate()).toBe(31) // August has 31 days
  })

  it('converts to/from db date format (yyyy-MM-dd)', () => {
    expect(toDbDate(new Date(2026, 7, 14))).toBe('2026-08-14')
    const parsed = fromDbDate('2026-08-14')
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(7)
    expect(parsed.getDate()).toBe(14)
  })

  it('computes days difference accurately', () => {
    expect(daysDiff('2026-08-01', '2026-08-10')).toBe(9)
  })

  it('formats month name in Vietnamese', () => {
    expect(formatMonthName(new Date(2026, 7, 14))).toBe('Tháng 8/2026')
  })

  it('identifies today date string', () => {
    const today = todayString()
    expect(isDateToday(today)).toBe(true)
    expect(isDateToday('2020-01-01')).toBe(false)
  })
})
