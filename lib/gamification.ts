import { createClient } from '@/lib/supabase/client'
import { notifyDataChanged } from '@/lib/events'
import { toast } from 'sonner'
import type { Achievement } from '@/lib/types'

import { MASTER_ACHIEVEMENTS, calculateLevelFromXP } from '@mochi/shared'
export { MASTER_ACHIEVEMENTS, calculateLevelFromXP }


export async function checkAndAwardAchievements(userId: string): Promise<number> {
  if (!userId) return 0
  const supabase = createClient()
  let newlyUnlockedCount = 0

  try {
    // 1. Try server-side RPC first
    const { data: rpcUnlocked, error: rpcError } = await supabase.rpc('check_and_unlock_achievements', {
      p_user_id: userId,
    })

    if (!rpcError && rpcUnlocked && Array.isArray(rpcUnlocked) && rpcUnlocked.length > 0) {
      for (const item of rpcUnlocked) {
        newlyUnlockedCount++
        toast.success(`🏆 Mở khóa thành tích: ${item.achievement_name}!`, {
          description: item.achievement_desc,
          duration: 4500,
        })
      }
      notifyDataChanged('all', 'achievement')
      return newlyUnlockedCount
    }

    // 2. Comprehensive Client-Side Evaluator (Fallback & Deep Validation)
    const [
      achRes,
      userAchRes,
      exercisesRes,
      weightsRes,
      weightGoalRes,
      vocabRes,
      grammarRes,
      lessonsRes,
      sessionsRes,
      reviewsRes,
      txRes,
      budgetsRes,
    ] = await Promise.all([
      supabase.from('achievements').select('*'),
      supabase.from('user_achievements').select('achievement_id').eq('user_id', userId),
      supabase.from('exercise_logs').select('log_date, calories_burned').eq('user_id', userId),
      supabase.from('weight_logs').select('log_date, weight').eq('user_id', userId).order('log_date', { ascending: false }),
      supabase.from('weight_goals').select('starting_weight, target_weight').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('hsk_vocabulary').select('memory_level').eq('user_id', userId),
      supabase.from('hsk_grammar').select('id').eq('user_id', userId),
      supabase.from('hsk_lessons').select('status').eq('user_id', userId),
      supabase.from('study_sessions').select('session_date').eq('user_id', userId),
      supabase.from('vocabulary_reviews').select('review_date, rating').eq('user_id', userId),
      supabase.from('transactions').select('transaction_date').eq('user_id', userId),
      supabase.from('budgets').select('id').eq('user_id', userId),
    ])

    const allAchievements: Achievement[] = achRes.data ?? []
    if (allAchievements.length === 0) {
      return 0
    }

    const unlockedSet = new Set((userAchRes.data ?? []).map((u: { achievement_id: string }) => u.achievement_id))

    // Pre-calculate user metric values
    const exerciseLogs = exercisesRes.data ?? []
    const exerciseCount = exerciseLogs.length
    const exerciseDates = new Set(exerciseLogs.map((e: { log_date: string }) => e.log_date))

    const weightLogs = weightsRes.data ?? []
    const weightCount = weightLogs.length
    const latestWeight = weightLogs[0]?.weight ?? null
    const weightGoal = weightGoalRes.data ?? null

    let weightGoalReached = false
    if (weightGoal && latestWeight !== null) {
      const { starting_weight, target_weight } = weightGoal
      if (starting_weight >= target_weight && latestWeight <= target_weight) weightGoalReached = true
      if (starting_weight <= target_weight && latestWeight >= target_weight) weightGoalReached = true
    }

    const vocabList = vocabRes.data ?? []
    const learnedVocabCount = vocabList.filter((v: { memory_level?: string | null }) => v.memory_level && v.memory_level !== 'not_learned').length
    const masteredVocabCount = vocabList.filter((v: { memory_level?: string | null }) => v.memory_level === 'mastered').length

    const grammarCount = (grammarRes.data ?? []).length
    const completedLessonsCount = (lessonsRes.data ?? []).filter((l: { status: string }) => l.status === 'completed' || l.status === 'mastered').length

    const studyDates = new Set([
      ...(sessionsRes.data ?? []).map((s: { session_date: string }) => s.session_date),
      ...(reviewsRes.data ?? []).map((r: { review_date: string }) => r.review_date),
    ])

    const hasPerfectQuiz = (reviewsRes.data ?? []).some((r: { rating: string }) => r.rating === 'easy')

    const txLogs = txRes.data ?? []
    const txCount = txLogs.length
    const txDates = new Set(txLogs.map((t: { transaction_date: string }) => t.transaction_date))

    const hasBudgets = (budgetsRes.data ?? []).length > 0

    const totalActiveDays = Math.max(
      exerciseDates.size,
      studyDates.size,
      txDates.size,
      weightLogs.length > 0 ? 1 : 0
    )

    // Evaluate each locked achievement
    for (const ach of allAchievements) {
      if (unlockedSet.has(ach.id)) continue

      let isConditionMet = false
      const targetVal = ach.condition_value || 1

      switch (ach.condition_type) {
        case 'exercise_count':
          isConditionMet = exerciseCount >= targetVal
          break
        case 'exercise_streak':
          isConditionMet = exerciseDates.size >= targetVal
          break
        case 'weekly_calorie_goal':
          isConditionMet = exerciseCount >= 1
          break
        case 'weight_log_count':
          isConditionMet = weightCount >= targetVal
          break
        case 'weight_goal_reached':
          isConditionMet = weightGoalReached
          break
        case 'vocab_count':
          isConditionMet = learnedVocabCount >= targetVal
          break
        case 'study_streak':
          isConditionMet = studyDates.size >= targetVal
          break
        case 'lesson_completed':
          isConditionMet = completedLessonsCount >= targetVal
          break
        case 'course_complete':
          isConditionMet = completedLessonsCount >= 1
          break
        case 'level_master':
          isConditionMet = masteredVocabCount >= 1
          break
        case 'grammar_count':
          isConditionMet = grammarCount >= targetVal || (targetVal <= 10 && grammarCount >= 1)
          break
        case 'perfect_quiz':
          isConditionMet = hasPerfectQuiz || studyDates.size >= 1
          break
        case 'transaction_count':
          isConditionMet = txCount >= targetVal
          break
        case 'expense_log_days':
          isConditionMet = txDates.size >= targetVal
          break
        case 'budget_week_ok':
        case 'budget_month_ok':
        case 'expense_reduced':
          isConditionMet = hasBudgets || txCount >= 1
          break
        case 'all_modules_day':
          isConditionMet = exerciseCount > 0 && learnedVocabCount > 0 && txCount > 0
          break
        case 'app_days':
          isConditionMet = totalActiveDays >= targetVal
          break
      }

      if (isConditionMet) {
        const { error: insErr } = await supabase.from('user_achievements').insert({
          user_id: userId,
          achievement_id: ach.id,
        })

        if (!insErr) {
          unlockedSet.add(ach.id)
          newlyUnlockedCount++
          toast.success(`🏆 Mở khóa thành tích: ${ach.name}!`, {
            description: ach.description,
            duration: 4500,
          })
        }
      }
    }

    if (newlyUnlockedCount > 0) {
      notifyDataChanged('all', 'achievement')
    }

    return newlyUnlockedCount
  } catch (e) {
    console.error('Achievement evaluation error:', e)
    return 0
  }
}

export async function awardXP(userId: string, amount: number, actionType: string, refId?: string) {
  if (!userId) return
  const supabase = createClient()
  const safeAmount = Math.max(1, Math.min(100, Math.round(amount)))

  try {
    const { data, error } = await supabase
      .from('user_xp_logs')
      .insert({
        user_id: userId,
        amount: safeAmount,
        action_type: actionType,
        reference_id: refId || null,
      })
      .select()
      .single()

    if (!error && data) {
      toast.success(`✨ +${safeAmount} XP!`, { duration: 2000 })
      notifyDataChanged('all', 'xp')
    }

    // Check achievements automatically after earning XP
    await checkAndAwardAchievements(userId)
  } catch (e) {
    console.error('Failed to award XP:', e)
  }
}
