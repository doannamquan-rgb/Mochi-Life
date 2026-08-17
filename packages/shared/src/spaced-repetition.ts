/**
 * Simple Spaced Repetition System for Mochi Life
 * Based on SM-2 algorithm principles (simplified)
 * Architecture allows easy upgrade to full SM-2 in future
 */

import type { ReviewRating } from './types'

export type SpacedRepetitionState = {
  interval_days: number    // Current interval in days
  ease_factor: number      // Ease factor (2.5 default)
  repetitions: number      // Number of successful repetitions
  next_review_at: Date     // Next review date
}

const MIN_EASE_FACTOR = 1.3
const DEFAULT_EASE_FACTOR = 2.5

/**
 * Calculate next review date based on rating
 * SM-2 inspired algorithm
 */
export function calculateNextReview(
  state: SpacedRepetitionState,
  rating: ReviewRating
): SpacedRepetitionState {
  const now = new Date()
  let { interval_days, ease_factor, repetitions } = state

  switch (rating) {
    case 'forgot':
      // Reset to beginning
      repetitions = 0
      interval_days = 1
      ease_factor = Math.max(MIN_EASE_FACTOR, ease_factor - 0.2)
      break

    case 'hard':
      // Small penalty to ease factor, short interval
      ease_factor = Math.max(MIN_EASE_FACTOR, ease_factor - 0.15)
      if (repetitions === 0) {
        interval_days = 1
      } else {
        interval_days = Math.max(1, Math.round(interval_days * 1.2))
      }
      repetitions = Math.max(0, repetitions - 1)
      break

    case 'remembered':
      // Normal progression
      if (repetitions === 0) {
        interval_days = 1
      } else if (repetitions === 1) {
        interval_days = 3
      } else {
        interval_days = Math.round(interval_days * ease_factor)
      }
      repetitions += 1
      // Slight ease factor decrease for effort
      ease_factor = Math.max(MIN_EASE_FACTOR, ease_factor - 0.02)
      break

    case 'easy':
      // Boost ease factor, longer interval
      if (repetitions === 0) {
        interval_days = 3
      } else if (repetitions === 1) {
        interval_days = 7
      } else {
        interval_days = Math.round(interval_days * ease_factor * 1.15)
      }
      repetitions += 1
      ease_factor = Math.min(3.0, ease_factor + 0.1)
      break
  }

  // Cap at reasonable max (1 year)
  interval_days = Math.min(365, interval_days)

  const next_review_at = new Date(now)
  next_review_at.setDate(next_review_at.getDate() + interval_days)

  return {
    interval_days,
    ease_factor,
    repetitions,
    next_review_at,
  }
}

/**
 * Get initial state for a new word
 */
export function getInitialSRState(): SpacedRepetitionState {
  return {
    interval_days: 0,
    ease_factor: DEFAULT_EASE_FACTOR,
    repetitions: 0,
    next_review_at: new Date(),
  }
}

/**
 * Check if item is due for review
 */
export function isDueForReview(nextReviewAt: string | Date): boolean {
  const now = new Date()
  const reviewDate = typeof nextReviewAt === 'string' 
    ? new Date(nextReviewAt) 
    : nextReviewAt
  return reviewDate <= now
}

/**
 * Get memory level from SR state
 */
export function getMemoryLevelFromSR(state: SpacedRepetitionState): string {
  if (state.repetitions === 0) return 'not_learned'
  if (state.repetitions === 1) return 'hard'
  if (state.repetitions <= 3) return 'learning'
  if (state.repetitions <= 6) return 'learned'
  return 'mastered'
}

/**
 * Format interval for display
 */
export function formatInterval(days: number): string {
  if (days === 0) return 'Hôm nay'
  if (days === 1) return 'Ngày mai'
  if (days < 7) return `${days} ngày nữa`
  if (days < 30) return `${Math.round(days / 7)} tuần nữa`
  if (days < 365) return `${Math.round(days / 30)} tháng nữa`
  return `${Math.round(days / 365)} năm nữa`
}
