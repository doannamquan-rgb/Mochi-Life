import { format, parseISO, differenceInDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths, subYears, isToday, isYesterday, formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

export const VN_LOCALE = vi

// Format date as dd/mm/yyyy (Vietnamese standard)
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd/MM/yyyy', { locale: vi })
}

// Format datetime
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd/MM/yyyy HH:mm', { locale: vi })
}

// Format time only
export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'HH:mm', { locale: vi })
}

// Format as short month (e.g., "T7")
export function formatShortMonth(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'MM/yyyy', { locale: vi })
}

// Format as day label (Mon, Tue, etc.)
export function formatDayLabel(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  const dayMap = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
  return dayMap[d.getDay()]
}

// Format relative time ("2 ngày trước")
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (isToday(d)) return 'Hôm nay'
  if (isYesterday(d)) return 'Hôm qua'
  return formatDistanceToNow(d, { addSuffix: true, locale: vi })
}

// Get greeting based on time of day
export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Chào buổi sáng'
  if (hour >= 12 && hour < 18) return 'Chào buổi chiều'
  if (hour >= 18 && hour < 22) return 'Chào buổi tối'
  return 'Chào ban đêm'
}

// Get date range for a chart period
export function getDateRange(period: '7d' | '30d' | '3m' | '6m' | '1y' | 'all'): { from: Date; to: Date } {
  const to = new Date()
  to.setHours(23, 59, 59, 999)
  
  let from = new Date()
  from.setHours(0, 0, 0, 0)
  
  switch (period) {
    case '7d':
      from = subDays(from, 6)
      break
    case '30d':
      from = subDays(from, 29)
      break
    case '3m':
      from = subMonths(from, 3)
      break
    case '6m':
      from = subMonths(from, 6)
      break
    case '1y':
      from = subYears(from, 1)
      break
    case 'all':
      from = new Date(2020, 0, 1)
      break
  }
  
  return { from, to }
}

// Get week range
export function getWeekRange(date: Date = new Date()): { from: Date; to: Date } {
  return {
    from: startOfWeek(date, { weekStartsOn: 1 }),
    to: endOfWeek(date, { weekStartsOn: 1 }),
  }
}

// Get month range
export function getMonthRange(date: Date = new Date()): { from: Date; to: Date } {
  return {
    from: startOfMonth(date),
    to: endOfMonth(date),
  }
}

// Format date for database (yyyy-mm-dd)
export function toDbDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'yyyy-MM-dd')
}

// Parse db date string to Date
export function fromDbDate(dateStr: string): Date {
  return parseISO(dateStr)
}

// Days difference
export function daysDiff(from: string | Date, to: string | Date = new Date()): number {
  const f = typeof from === 'string' ? parseISO(from) : from
  const t = typeof to === 'string' ? parseISO(to) : to
  return differenceInDays(t, f)
}

// Format Vietnamese month name
export function formatMonthName(date: Date): string {
  return `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`
}

// Today as string
export function todayString(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

// Check if date string is today
export function isDateToday(dateStr: string): boolean {
  return dateStr === todayString()
}
