import { describe, it, expect } from 'vitest'
import {
  sanitizeStudyContext,
  sanitizeFitnessContext,
  sanitizeFinanceContext,
  sanitizeAchievementContext,
} from '../privacy'

describe('Privacy Sanitizer Tests', () => {
  it('sanitizeStudyContext correctly formats Chinese stats and caps weak words', () => {
    const mockStats: any = {
      activeCourse: { name: 'HSK 3 Standard', level: 'HSK3' },
      learnedVocabulary: 150,
      totalVocabulary: 300,
      dueVocabulary: 12,
      masteredVocabulary: 40,
      newTodayVocabulary: 5,
      streak: 7,
      progressPercent: 50,
      todaySession: { duration_minutes: 25 },
      vocabulary: [
        { hanzi: '学习', pinyin: 'xuéxí', meaning: 'học tập', memory_level: 'hard' },
        { hanzi: '苹果', pinyin: 'píngguǒ', meaning: 'quả táo', memory_level: 'learning' },
        { hanzi: '高兴', pinyin: 'gāoxìng', meaning: 'vui vẻ', memory_level: 'hard' },
        { hanzi: ' may mắn', pinyin: 'xìngyùn', meaning: 'may mắn', memory_level: 'hard' },
        { hanzi: 'Phát âm', pinyin: 'fāyīn', meaning: 'phát âm', memory_level: 'learning' },
        { hanzi: 'Từ thứ 6', pinyin: 'tù6', meaning: 'từ thứ 6', memory_level: 'hard' },
      ],
      studyGoal: {
        daily_new_words: 10,
        daily_review_words: 20,
        daily_minutes: 30,
      },
    }

    const result = sanitizeStudyContext(mockStats)

    expect(result.activeCourse).toBe('HSK 3 Standard')
    expect(result.courseLevel).toBe('HSK3')
    expect(result.learnedWords).toBe(150)
    expect(result.dueWords).toBe(12)
    expect(result.streak).toBe(7)
    expect(result.todayStudyMinutes).toBe(25)
    // Should cap weak words sample to max 5
    expect(result.weakWordsSample.length).toBe(5)
    expect(result.weakWordsSample[0].hanzi).toBe('学习')
  })

  it('sanitizeFitnessContext handles missing and present weight logs', () => {
    const mockStats: any = {
      latestWeight: { weight: 70.5 },
      targetWeight: 65,
      startWeight: 75,
      weightProgress: 45,
      weekSessions: 3,
      fitnessGoal: { weekly_sessions: 4 },
      weekMinutes: 120,
      weekCalories: 600,
      todayCalories: 250,
      todayMinutes: 45,
      weightLogs: [
        { weight: 70.5, log_date: '2026-08-10' },
        { weight: 71.5, log_date: '2026-08-01' },
      ],
    }

    const result = sanitizeFitnessContext(mockStats)

    expect(result.currentWeight).toBe(70.5)
    expect(result.targetWeight).toBe(65)
    expect(result.workoutsThisWeek).toBe(3)
    expect(result.weeklyWorkoutTarget).toBe(4)
    expect(result.todayCalories).toBe(250)
  })

  it('sanitizeFinanceContext excludes raw transaction descriptions and IDs', () => {
    const mockStats: any = {
      incomeThisMonth: 15000000,
      expenseThisMonth: 8200000,
      balance: 6800000,
      expenseChangePercent: 12.5,
      todayExpense: 150000,
      budget: { amount: 10000000 },
      budgetUsedPercent: 82,
      topExpenseCategories: [
        { name: 'Ăn uống', icon: '🍜', amount: 3500000, percent: 42 },
        { name: 'Đi lại', icon: '🚌', amount: 1200000, percent: 14 },
      ],
    }

    const result = sanitizeFinanceContext(mockStats)

    expect(result.incomeThisMonth).toBe(15000000)
    expect(result.expenseThisMonth).toBe(8200000)
    expect(result.balance).toBe(6800000)
    expect(result.topCategories.length).toBe(2)
    expect(result.topCategories[0]).toEqual({ name: 'Ăn uống', amount: 3500000, percent: 42 })
    // Ensure raw descriptions/wallets/IDs are NOT present
    expect((result as any).transactions).toBeUndefined()
    expect((result as any).walletId).toBeUndefined()
  })

  it('sanitizeAchievementContext extracts XP, level, and limits recent achievements', () => {
    const result = sanitizeAchievementContext({
      totalXP: 450,
      level: { level: 4 },
      recentAchievements: [
        { name: 'Khởi đầu rực rỡ', description: 'Đạt 100 XP đầu tiên' },
        { name: 'Chăm chỉ HSK', description: 'Học 50 từ vựng' },
        { name: 'Người tiết kiệm', description: 'Đạt mục tiêu ngân sách' },
        { name: 'Vận động viên', description: 'Tập 10 buổi' },
      ],
    })

    expect(result.totalXP).toBe(450)
    expect(result.level).toBe(4)
    expect(result.recentAchievements.length).toBe(3)
    expect(result.recentAchievements[0].name).toBe('Khởi đầu rực rỡ')
  })
})
