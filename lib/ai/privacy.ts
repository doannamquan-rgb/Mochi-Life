import type { StudyAIContext, FitnessAIContext, FinanceAIContext, AchievementAIContext } from './types'
import type { ChineseStats } from '@/lib/chinese-stats'
import type { FitnessStats } from '@/lib/fitness-stats'
import type { FinanceStats } from '@/lib/finance-stats'

const MAX_WEAK_WORDS_SAMPLE = 5

/**
 * Sanitize Chinese/Study stats for AI consumption.
 * Maps actual ChineseStats field names to StudyAIContext.
 * Limits weak vocabulary to a small sample.
 */
export function sanitizeStudyContext(stats: ChineseStats): StudyAIContext {
  // Find weak words (low memory level, due for review)
  const weakWords = (stats.vocabulary ?? [])
    .filter(v => v.memory_level === 'hard' || v.memory_level === 'learning')
    .slice(0, MAX_WEAK_WORDS_SAMPLE)
    .map(v => ({ hanzi: v.hanzi, pinyin: v.pinyin, meaning: v.meaning }))

  return {
    activeCourse: stats.activeCourse?.name ?? null,
    courseLevel: stats.activeCourse?.level ?? null,
    learnedWords: stats.learnedVocabulary,
    totalWords: stats.totalVocabulary,
    dueWords: stats.dueVocabulary,
    masteredWords: stats.masteredVocabulary,
    newTodayWords: stats.newTodayVocabulary,
    streak: stats.streak,
    progressPercent: stats.progressPercent,
    todayStudyMinutes: stats.todaySession?.duration_minutes ?? 0,
    weakWordsCount: weakWords.length,
    weakWordsSample: weakWords,
    studyGoal: stats.studyGoal ? {
      dailyNewWords: stats.studyGoal.daily_new_words,
      dailyReviewWords: stats.studyGoal.daily_review_words,
      dailyMinutes: stats.studyGoal.daily_minutes,
    } : null,
  }
}

/**
 * Sanitize Fitness stats for AI consumption.
 * Maps actual FitnessStats field names to FitnessAIContext.
 * Only includes aggregated weight trends and exercise summaries.
 */
export function sanitizeFitnessContext(stats: FitnessStats): FitnessAIContext {
  // Calculate weight changes from weight logs if available
  let weightChange7d: number | null = null
  let weightChange14d: number | null = null
  const weightLogs = stats.weightLogs ?? []
  const latestWeight = stats.latestWeight

  if (latestWeight && weightLogs.length >= 2) {
    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const fourteenDaysAgo = new Date(now)
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const log7d = weightLogs.find(w => new Date(w.log_date) <= sevenDaysAgo)
    const log14d = weightLogs.find(w => new Date(w.log_date) <= fourteenDaysAgo)

    if (log7d) weightChange7d = Number((latestWeight.weight - log7d.weight).toFixed(1))
    if (log14d) weightChange14d = Number((latestWeight.weight - log14d.weight).toFixed(1))
  }

  return {
    currentWeight: latestWeight?.weight ?? null,
    targetWeight: stats.targetWeight,
    startWeight: stats.startWeight,
    weightChange7d,
    weightChange14d,
    weightProgress: stats.weightProgress,
    workoutsThisWeek: stats.weekSessions,
    weeklyWorkoutTarget: stats.fitnessGoal?.weekly_sessions ?? null,
    weekMinutes: stats.weekMinutes,
    weekCalories: stats.weekCalories,
    todayCalories: stats.todayCalories,
    todayMinutes: stats.todayMinutes,
  }
}

/**
 * Sanitize Finance stats for AI consumption.
 * NO raw transaction descriptions, NO IDs, NO wallet info.
 * Only category aggregates and totals.
 */
export function sanitizeFinanceContext(stats: FinanceStats): FinanceAIContext {
  const topCategories = (stats.topExpenseCategories ?? [])
    .slice(0, 5)
    .map(c => ({ name: c.name, amount: c.amount, percent: c.percent }))

  return {
    incomeThisMonth: stats.incomeThisMonth,
    expenseThisMonth: stats.expenseThisMonth,
    balance: stats.balance,
    expenseChangePercent: stats.expenseChangePercent,
    topCategories,
    budgetUsedPercent: stats.budget ? stats.budgetUsedPercent : null,
    todayExpense: stats.todayExpense,
  }
}

/**
 * Sanitize achievement data for AI consumption.
 * Only XP, level, and recent 3 achievements.
 */
export function sanitizeAchievementContext(data: {
  totalXP: number
  level: { level: number }
  recentAchievements: Array<{ name?: string; description?: string }>
}): AchievementAIContext {
  return {
    totalXP: data.totalXP ?? 0,
    level: data.level?.level ?? 1,
    recentAchievements: (data.recentAchievements ?? [])
      .slice(0, 3)
      .map(a => ({ name: a.name ?? '', description: a.description ?? '' }))
      .filter(a => a.name),
  }
}
