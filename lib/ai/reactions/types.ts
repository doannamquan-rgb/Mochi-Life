/**
 * Mochi Smart Reaction — Core Types
 * Defines event types, deterministic fact structures, and reaction response types.
 */

// ─── Event Types ──────────────────────────────────────────────────────────────

export type MochiReactionEvent =
  | 'exercise_logged'
  | 'weight_logged'
  | 'transaction_expense_created'
  | 'transaction_income_created'
  | 'study_session_completed'
  | 'review_session_completed'

// ─── Projection ───────────────────────────────────────────────────────────────

export type ProjectionConfidence = 'low' | 'medium' | 'high'

export type ReactionProjection = {
  label: string
  value: string
  confidence: ProjectionConfidence
}

// ─── Reaction Facts (built deterministically, NEVER by Gemini) ────────────────

export type FitnessExerciseReactionFacts = {
  eventType: 'exercise_logged'
  action: {
    exerciseType: string
    exerciseLabel: string
    durationMinutes: number
    caloriesBurned: number | null
    distanceKm: number | null
    intensity: string
  }
  recent: {
    sessions7d: number
    prevSessions7d: number
    minutes7d: number
    prevMinutes7d: number
    daysSinceLastSession: number | null
    activeDays30d: number
  }
  goal: {
    weeklyTarget: number | null
    weekCompleted: number
    weekGoalPercent: number | null
  }
  milestones: {
    isFirstEver: boolean
    weekGoalJustMet: boolean
    returningAfterBreak: boolean
    breakDays: number | null
  }
  projection: ReactionProjection | null
}

export type FitnessWeightReactionFacts = {
  eventType: 'weight_logged'
  action: {
    weight: number
    weightUnit: string
  }
  trend: {
    prevWeight: number | null
    change: number | null
    changeDirection: 'down' | 'up' | 'same' | null
    weightLogs7d: number
    weightLogs14d: number
  }
  goal: {
    targetWeight: number | null
    startWeight: number | null
    progressPercent: number
    remaining: number | null
  }
  milestones: {
    isFirstLog: boolean
  }
  projection: ReactionProjection | null
}

export type StudySessionReactionFacts = {
  eventType: 'study_session_completed' | 'review_session_completed'
  action: {
    newWordsCount: number
    reviewedWordsCount: number
    durationMinutes: number
    lessonName: string | null
  }
  recent: {
    streak: number
    studyDays7d: number
    prevStudyDays7d: number
    dueWordsRemaining: number
    totalLearned: number
    totalVocabulary: number
    progressPercent: number
    avgWordsPerActiveDay: number | null
  }
  goal: {
    dailyNewWordsTarget: number | null
    dailyReviewTarget: number | null
    dailyMinutesTarget: number | null
  }
  milestones: {
    isFirstSession: boolean
    streakExtended: boolean
    weeklyGoalMet: boolean
    reviewQueueCleared: boolean
  }
  projection: ReactionProjection | null
}

export type FinanceTransactionReactionFacts = {
  eventType: 'transaction_expense_created' | 'transaction_income_created'
  action: {
    amount: number
    type: 'expense' | 'income'
    categoryName: string | null
    categoryIcon: string | null
  }
  monthly: {
    expenseThisMonth: number
    incomeThisMonth: number
    balance: number
    expensePrevMonth: number
    incomePrevMonth: number
    expenseChangePercent: number | null
  }
  category: {
    categorySpendThisMonth: number | null
    categoryBudget: number | null
    categoryBudgetUsedPercent: number | null
  }
  budget: {
    totalBudget: number | null
    totalUsedPercent: number | null
    daysRemainingInMonth: number
  }
  milestones: {
    budgetExceeded: boolean
    categoryBudgetNearLimit: boolean
  }
  projection: ReactionProjection | null
}

export type ReactionFacts =
  | FitnessExerciseReactionFacts
  | FitnessWeightReactionFacts
  | StudySessionReactionFacts
  | FinanceTransactionReactionFacts

// ─── Mochi Reaction Response ──────────────────────────────────────────────────

export type ReactionTone =
  | 'celebrate'
  | 'encourage'
  | 'gentle_nudge'
  | 'informative'
  | 'welcome_back'
  | 'milestone'

export type MochiReaction = {
  eventType: MochiReactionEvent
  title: string
  message: string
  tone: ReactionTone
  highlight: string | null
  nextAction: string | null
  generatedBy: 'gemini' | 'fallback'
}
