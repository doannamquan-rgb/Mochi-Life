import { todayString, toDbDate } from './date-utils'

/**
 * Calculates current consecutive study streak from an array of session date strings (YYYY-MM-DD).
 */
export function calculateStreak(sessionDates: string[]): number {
  if (!sessionDates || sessionDates.length === 0) return 0
  
  const dateSet = new Set(sessionDates)
  
  // Use midday to avoid timezone issues when manipulating days
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  
  const todayStr = todayString()
  let currentStr = todayStr
  
  // If no session today, check yesterday
  if (!dateSet.has(currentStr)) {
    d.setDate(d.getDate() - 1)
    currentStr = toDbDate(d)
    if (!dateSet.has(currentStr)) {
      return 0 // neither today nor yesterday
    }
  }

  let streak = 0
  while (true) {
    if (dateSet.has(currentStr)) {
      streak++
      d.setDate(d.getDate() - 1)
      currentStr = toDbDate(d)
    } else {
      break
    }
  }

  return streak
}
