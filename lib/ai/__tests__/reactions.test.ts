import { describe, it, expect } from 'vitest'
import { buildFallbackReaction } from '../reactions/fallback'
import type { ReactionFacts } from '../reactions/types'

// ─── Fitness Exercise Fallback Tests ────────────────────────────────────────

describe('buildFallbackReaction - exercise', () => {
  const baseFacts: Extract<ReactionFacts, { eventType: 'exercise_logged' }> = {
    eventType: 'exercise_logged',
    action: {
      exerciseType: 'running',
      exerciseLabel: 'Chạy bộ',
      durationMinutes: 30,
      caloriesBurned: 280,
      distanceKm: 4.5,
      intensity: 'moderate',
    },
    recent: {
      sessions7d: 3,
      prevSessions7d: 2,
      minutes7d: 90,
      prevMinutes7d: 60,
      daysSinceLastSession: 1,
      activeDays30d: 10,
    },
    goal: {
      weeklyTarget: 4,
      weekCompleted: 3,
      weekGoalPercent: 75,
    },
    milestones: {
      isFirstEver: false,
      weekGoalJustMet: false,
      returningAfterBreak: false,
      breakDays: null,
    },
    projection: null,
  }

  it('generates informative reaction for regular log', () => {
    const reaction = buildFallbackReaction(baseFacts)
    expect(reaction.eventType).toBe('exercise_logged')
    expect(reaction.generatedBy).toBe('fallback')
    expect(reaction.title).toBeTruthy()
    expect(reaction.message).toBeTruthy()
    expect(reaction.message).toContain('30')
  })

  it('generates celebrate tone for first-ever workout', () => {
    const facts: typeof baseFacts = {
      ...baseFacts,
      milestones: { ...baseFacts.milestones, isFirstEver: true },
    }
    const reaction = buildFallbackReaction(facts)
    expect(reaction.tone).toBe('celebrate')
    expect(reaction.title).toContain('đầu tiên')
  })

  it('generates celebrate when week goal just met', () => {
    const facts: typeof baseFacts = {
      ...baseFacts,
      goal: { weeklyTarget: 4, weekCompleted: 4, weekGoalPercent: 100 },
      milestones: { ...baseFacts.milestones, weekGoalJustMet: true },
    }
    const reaction = buildFallbackReaction(facts)
    expect(reaction.tone).toBe('celebrate')
    expect(reaction.highlight).not.toBeNull()
  })

  it('generates welcome_back after break', () => {
    const facts: typeof baseFacts = {
      ...baseFacts,
      milestones: { ...baseFacts.milestones, returningAfterBreak: true, breakDays: 10 },
    }
    const reaction = buildFallbackReaction(facts)
    expect(reaction.tone).toBe('welcome_back')
    expect(reaction.message).toContain('10')
  })
})

// ─── Weight Fallback Tests ────────────────────────────────────────────────────

describe('buildFallbackReaction - weight', () => {
  const baseWeightFacts: Extract<ReactionFacts, { eventType: 'weight_logged' }> = {
    eventType: 'weight_logged',
    action: { weight: 72.5, weightUnit: 'kg' },
    trend: {
      prevWeight: 73.0,
      change: -0.5,
      changeDirection: 'down',
      weightLogs7d: 3,
      weightLogs14d: 5,
    },
    goal: {
      targetWeight: 68,
      startWeight: 76,
      progressPercent: 43.75,
      remaining: 4.5,
    },
    milestones: { isFirstLog: false },
    projection: null,
  }

  it('gives encourage tone on weight loss', () => {
    const reaction = buildFallbackReaction(baseWeightFacts)
    expect(reaction.tone).toBe('encourage')
    expect(reaction.message).toContain('72.5')
  })

  it('shows remaining goal when weight goal exists', () => {
    const reaction = buildFallbackReaction(baseWeightFacts)
    expect(reaction.highlight).toContain('4.5')
  })

  it('informs without alarming on weight gain', () => {
    const facts: typeof baseWeightFacts = {
      ...baseWeightFacts,
      trend: { ...baseWeightFacts.trend, change: 0.3, changeDirection: 'up' },
    }
    const reaction = buildFallbackReaction(facts)
    expect(reaction.tone).toBe('informative')
    expect(reaction.message).not.toContain('xấu')
    expect(reaction.message).not.toContain('tệ')
  })
})

// ─── Study Fallback Tests ─────────────────────────────────────────────────────

describe('buildFallbackReaction - study', () => {
  const baseStudyFacts: Extract<ReactionFacts, { eventType: 'study_session_completed' }> = {
    eventType: 'study_session_completed',
    action: {
      newWordsCount: 10,
      reviewedWordsCount: 20,
      durationMinutes: 25,
      lessonName: 'Bài 5: Mua sắm',
    },
    recent: {
      streak: 5,
      studyDays7d: 4,
      prevStudyDays7d: 3,
      dueWordsRemaining: 15,
      totalLearned: 120,
      totalVocabulary: 500,
      progressPercent: 24,
      avgWordsPerActiveDay: 8,
    },
    goal: {
      dailyNewWordsTarget: 10,
      dailyReviewTarget: 20,
      dailyMinutesTarget: 30,
    },
    milestones: {
      isFirstSession: false,
      streakExtended: true,
      weeklyGoalMet: false,
      reviewQueueCleared: false,
    },
    projection: null,
  }

  it('celebrates streak extension', () => {
    const reaction = buildFallbackReaction(baseStudyFacts)
    expect(reaction.tone).toBe('celebrate')
    expect(reaction.title).toContain('5')
    expect(reaction.title.toLowerCase()).toContain('streak')
  })

  it('mentions due words in highlight when queue not cleared', () => {
    const reaction = buildFallbackReaction(baseStudyFacts)
    expect(reaction.highlight).not.toBeNull()
    expect(reaction.highlight).toContain('15')
  })

  it('handles review_session_completed event type', () => {
    const facts: Extract<ReactionFacts, { eventType: 'review_session_completed' }> = {
      ...baseStudyFacts,
      eventType: 'review_session_completed',
    }
    const reaction = buildFallbackReaction(facts)
    expect(reaction.eventType).toBe('review_session_completed')
  })
})

// ─── Finance Fallback Tests ───────────────────────────────────────────────────

describe('buildFallbackReaction - finance', () => {
  const baseExpenseFacts: Extract<ReactionFacts, { eventType: 'transaction_expense_created' }> = {
    eventType: 'transaction_expense_created',
    action: {
      amount: 150000,
      type: 'expense',
      categoryName: 'Ăn uống',
      categoryIcon: '🍜',
    },
    monthly: {
      expenseThisMonth: 2500000,
      incomeThisMonth: 5000000,
      balance: 2500000,
      expensePrevMonth: 2200000,
      incomePrevMonth: 5000000,
      expenseChangePercent: 13.6,
    },
    category: {
      categorySpendThisMonth: 800000,
      categoryBudget: 1000000,
      categoryBudgetUsedPercent: 80,
    },
    budget: {
      totalBudget: 4000000,
      totalUsedPercent: 62.5,
      daysRemainingInMonth: 10,
    },
    milestones: {
      budgetExceeded: false,
      categoryBudgetNearLimit: true,
    },
    projection: null,
  }

  it('generates informative reaction for expense', () => {
    const reaction = buildFallbackReaction(baseExpenseFacts)
    expect(reaction.eventType).toBe('transaction_expense_created')
    expect(reaction.generatedBy).toBe('fallback')
    expect(reaction.message).toBeTruthy()
  })

  it('shows budget usage when budget exists', () => {
    const reaction = buildFallbackReaction(baseExpenseFacts)
    // Should mention budget percent
    expect(reaction.message).toMatch(/62|63|ngân sách/i)
  })

  it('generates celebrate tone for income', () => {
    const incomeFacts: Extract<ReactionFacts, { eventType: 'transaction_income_created' }> = {
      ...baseExpenseFacts,
      eventType: 'transaction_income_created',
      action: {
        amount: 5000000,
        type: 'income',
        categoryName: 'Lương',
        categoryIcon: '💚',
      },
    }
    const reaction = buildFallbackReaction(incomeFacts)
    expect(reaction.tone).toBe('celebrate')
    expect(reaction.eventType).toBe('transaction_income_created')
  })

  it('NEVER uses shaming language', () => {
    const reaction = buildFallbackReaction(baseExpenseFacts)
    const text = (reaction.title + reaction.message + (reaction.highlight ?? '') + (reaction.nextAction ?? '')).toLowerCase()
    const shamingWords = ['xấu', 'tệ', 'tiêu xài hoang phí', 'lãng phí', 'thất bại']
    for (const word of shamingWords) {
      expect(text).not.toContain(word)
    }
  })
})
