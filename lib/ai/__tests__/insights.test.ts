import { describe, it, expect } from 'vitest'
import { generateDeterministicInsights } from '../insights'
import type { MochiAIContext } from '../types'

describe('Deterministic Insights Engine Tests', () => {
  it('generates study, fitness, and finance insights based on context metrics', () => {
    const context: MochiAIContext = {
      userName: 'Nam',
      currentDate: '2026-08-10',
      study: {
        activeCourse: 'HSK 3',
        courseLevel: 'HSK3',
        learnedWords: 100,
        totalWords: 300,
        dueWords: 15,
        masteredWords: 20,
        newTodayWords: 0,
        streak: 5,
        progressPercent: 33,
        todayStudyMinutes: 0,
        weakWordsCount: 2,
        weakWordsSample: [],
        studyGoal: null,
      },
      fitness: {
        currentWeight: 72.0,
        targetWeight: 68.0,
        startWeight: 75.0,
        weightChange7d: -0.5,
        weightChange14d: -1.2,
        weightProgress: 42,
        workoutsThisWeek: 1,
        weeklyWorkoutTarget: 3,
        weekMinutes: 45,
        weekCalories: 220,
        todayCalories: 0,
        todayMinutes: 0,
      },
      finance: {
        incomeThisMonth: 15000000,
        expenseThisMonth: 9000000,
        balance: 6000000,
        expenseChangePercent: 25.0,
        topCategories: [{ name: 'Ăn uống', amount: 4000000, percent: 44 }],
        budgetUsedPercent: 90,
        todayExpense: 50000,
      },
    }

    const insights = generateDeterministicInsights(context)

    expect(insights.length).toBeGreaterThan(0)
    
    // Streak protection insight (priority 90) should be at top
    const streakInsight = insights.find(i => i.title.includes('Bảo vệ chuỗi'))
    expect(streakInsight).toBeDefined()
    expect(streakInsight?.type).toBe('study')

    // Finance warning insight (expenseChangePercent > 20%)
    const financeInsight = insights.find(i => i.title.includes('Cảnh báo chi tiêu'))
    expect(financeInsight).toBeDefined()

    // Fitness workout target insight
    const fitnessInsight = insights.find(i => i.title.includes('Mục tiêu tập'))
    expect(fitnessInsight).toBeDefined()
  })

  it('handles empty / missing data gracefully without generating fake insights', () => {
    const emptyContext: MochiAIContext = {
      userName: 'Mới',
      currentDate: '2026-08-10',
    }

    const insights = generateDeterministicInsights(emptyContext)
    expect(insights).toEqual([])
  })
})
