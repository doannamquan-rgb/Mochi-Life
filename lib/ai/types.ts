// AI-specific types for Mochi AI Coach

export type ContextDomain = 'study' | 'fitness' | 'finance' | 'calendar' | 'achievements' | 'general'

export type StudyAIContext = {
  activeCourse: string | null
  courseLevel: string | null
  learnedWords: number
  totalWords: number
  dueWords: number
  masteredWords: number
  newTodayWords: number
  streak: number
  progressPercent: number
  todayStudyMinutes: number
  weakWordsCount: number
  weakWordsSample: Array<{ hanzi: string; pinyin: string; meaning: string }>
  studyGoal: { dailyNewWords: number; dailyReviewWords: number; dailyMinutes: number } | null
}

export type FitnessAIContext = {
  currentWeight: number | null
  targetWeight: number | null
  startWeight: number | null
  weightChange7d: number | null
  weightChange14d: number | null
  weightProgress: number
  workoutsThisWeek: number
  weeklyWorkoutTarget: number | null
  weekMinutes: number
  weekCalories: number
  todayCalories: number
  todayMinutes: number
}

export type FinanceAIContext = {
  incomeThisMonth: number
  expenseThisMonth: number
  balance: number
  expenseChangePercent: number | null
  topCategories: Array<{ name: string; amount: number; percent: number }>
  budgetUsedPercent: number | null
  todayExpense: number
}

export type AchievementAIContext = {
  totalXP: number
  level: number
  recentAchievements: Array<{ name: string; description: string }>
}

export type CalendarAIContext = {
  upcomingEventsCount: number
  todayEventsSummary: string[]
}

export type MochiAIContext = {
  study?: StudyAIContext
  fitness?: FitnessAIContext
  finance?: FinanceAIContext
  achievements?: AchievementAIContext
  calendar?: CalendarAIContext
  userName: string
  currentDate: string
}

export type MochiChatMessage = {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export type MochiAIError = {
  code: 'AI_DISABLED' | 'NO_API_KEY' | 'RATE_LIMITED' | 'GEMINI_ERROR' | 'VALIDATION_ERROR' | 'AUTH_ERROR' | 'CONTEXT_ERROR'
  message: string
  retryAfter?: number
}
