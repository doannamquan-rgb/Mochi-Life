import { describe, it, expect } from 'vitest'
import { getDashboardNextAction, type DashboardNextActionInput } from '../dashboard'

const baseEmpty: DashboardNextActionInput = {
  today: '2026-11-27',
  hasActiveCourse: false,
  totalVocabulary: 0,
  dueVocabulary: 0,
  todayStudyMinutes: 0,
  streak: 0,
  hasWeightGoal: false,
  latestWeightDate: null,
  todayExerciseMinutes: 0,
  weekExerciseSessions: 0,
  weeklySessionTarget: null,
  totalChecklistCount: 0,
  completedChecklistCount: 0,
  nextChecklistItemText: null,
  todayTransactionCount: 0,
  monthExpense: 0,
  monthBudgetAmount: null,
}

describe('getDashboardNextAction — Shared Dashboard Focus Prioritization', () => {
  it('returns empty status when user has no tracked data yet', () => {
    const res = getDashboardNextAction(baseEmpty)
    expect(res.status).toBe('empty')
    expect(res.primary.id).toBe('first_log')
    expect(res.secondary.length).toBeGreaterThan(0)
  })

  it('prioritizes due vocabulary review and highlights streak protection when todayStudyMinutes is 0', () => {
    const res = getDashboardNextAction({
      ...baseEmpty,
      hasActiveCourse: true,
      totalVocabulary: 100,
      dueVocabulary: 14,
      streak: 6,
      todayStudyMinutes: 0,
      latestWeightDate: '2026-11-26',
    })
    expect(res.status).toBe('action')
    expect(res.primary.id).toBe('review_vocab')
    expect(res.primary.domain).toBe('study')
    expect(res.primary.title).toContain('14')
    expect(res.primary.title).toContain('6 ngày')
  })

  it('prioritizes pending checklist when no due vocabulary or streak-at-risk study exists', () => {
    const res = getDashboardNextAction({
      ...baseEmpty,
      hasActiveCourse: true,
      totalVocabulary: 50,
      dueVocabulary: 0,
      todayStudyMinutes: 15,
      streak: 4,
      totalChecklistCount: 3,
      completedChecklistCount: 1,
      nextChecklistItemText: 'Uống đủ 2 lít nước',
    })
    expect(res.status).toBe('action')
    expect(res.primary.id).toBe('complete_checklist')
    expect(res.primary.title).toContain('Uống đủ 2 lít nước')
    expect(res.checklistRemaining).toBe(2)
  })

  it('prioritizes exercise when behind weekly workout target and no workout logged today', () => {
    const res = getDashboardNextAction({
      ...baseEmpty,
      hasWeightGoal: true,
      latestWeightDate: '2026-11-27',
      todayExerciseMinutes: 0,
      weekExerciseSessions: 1,
      weeklySessionTarget: 4,
    })
    expect(res.status).toBe('action')
    expect(res.primary.id).toBe('log_exercise')
    expect(res.primary.description).toContain('1/4')
  })

  it('prioritizes weight logging when user has weight goal and has not logged today', () => {
    const res = getDashboardNextAction({
      ...baseEmpty,
      hasWeightGoal: true,
      latestWeightDate: '2026-11-25',
      todayExerciseMinutes: 30,
      weekExerciseSessions: 3,
      weeklySessionTarget: 3,
    })
    expect(res.status).toBe('action')
    expect(res.primary.id).toBe('log_weight')
  })

  it('prioritizes finance check when today has no transaction and warns if over budget', () => {
    const res = getDashboardNextAction({
      ...baseEmpty,
      hasWeightGoal: true,
      latestWeightDate: '2026-11-27',
      todayExerciseMinutes: 35,
      weekExerciseSessions: 3,
      weeklySessionTarget: 3,
      todayTransactionCount: 0,
      monthExpense: 6_500_000,
      monthBudgetAmount: 5_000_000,
    })
    expect(res.status).toBe('action')
    expect(res.primary.id).toBe('log_transaction')
    expect(res.primary.badge).toBe('Lưu ý ngân sách')
    expect(res.budgetUsedPct).toBe(100)
  })

  it('returns completed status when today goals and habits are all completed', () => {
    const res = getDashboardNextAction({
      ...baseEmpty,
      hasActiveCourse: true,
      totalVocabulary: 120,
      dueVocabulary: 0,
      todayStudyMinutes: 20,
      streak: 5,
      hasWeightGoal: true,
      latestWeightDate: '2026-11-27',
      todayExerciseMinutes: 45,
      weekExerciseSessions: 3,
      weeklySessionTarget: 3,
      totalChecklistCount: 2,
      completedChecklistCount: 2,
      todayTransactionCount: 2,
      monthExpense: 1_200_000,
      monthBudgetAmount: 5_000_000,
    })
    expect(res.status).toBe('completed')
    expect(res.primary.id).toBe('ask_ai')
    expect(res.checklistRemaining).toBe(0)
  })
})
