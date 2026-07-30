import type { SupabaseClient } from '@supabase/supabase-js'
import type { WeightLog, WeightGoal, ExerciseLog, FitnessGoal } from './types'
import { todayString, getDateRange } from './date-utils'
import { getPercent } from './format'
import { subDays } from 'date-fns'

export type FitnessStats = {
  latestWeight: WeightLog | null
  prevWeight: WeightLog | null
  startWeight: number | null
  targetWeight: number | null
  weightChange: number | null
  weightProgress: number
  todayCalories: number
  todayMinutes: number
  todaySessions: number
  periodCalories: number
  periodMinutes: number
  periodSessions: number
  weekSessions: number
  weekMinutes: number
  weekCalories: number
  weightGoal: WeightGoal | null
  fitnessGoal: FitnessGoal | null
  weightLogs: WeightLog[]
  exerciseLogs: ExerciseLog[]
  error: string | null
}

export async function fetchFitnessStats(
  supabase: SupabaseClient,
  userId: string,
  period: '7d' | '30d' | '3m' | '6m' | '1y' | 'all' = '30d'
): Promise<FitnessStats> {
  const today = todayString()
  let fetchError: string | null = null

  let weightQuery = supabase
    .from('weight_logs')
    .select('*')
    .eq('user_id', userId)
    .order('log_date', { ascending: true })

  let exerciseQuery = supabase
    .from('exercise_logs')
    .select('*')
    .eq('user_id', userId)
    .order('log_date', { ascending: false })

  if (period !== 'all') {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '3m' ? 90 : period === '6m' ? 180 : 365
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - days)
    const fromStr = fromDate.toISOString().split('T')[0]
    weightQuery = weightQuery.gte('log_date', fromStr)
    exerciseQuery = exerciseQuery.gte('log_date', fromStr)
  }

  const [wGoalRes, wLogsRes, exLogsRes, fGoalRes] = await Promise.all([
    supabase.from('weight_goals').select('*').eq('user_id', userId).maybeSingle(),
    weightQuery,
    exerciseQuery,
    supabase.from('fitness_goals').select('*').eq('user_id', userId).maybeSingle(),
  ])

  if (wLogsRes.error) fetchError = wLogsRes.error.message
  if (exLogsRes.error) fetchError = fetchError ? `${fetchError}; ${exLogsRes.error.message}` : exLogsRes.error.message

  const weightGoal = wGoalRes.data ?? null
  const fitnessGoal = fGoalRes.data ?? null
  const weightLogs = wLogsRes.data ?? []
  const exerciseLogs = exLogsRes.data ?? []

  // Weight calculations
  const latestWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1] : null
  const prevWeight = weightLogs.length > 1 ? weightLogs[weightLogs.length - 2] : null
  const startWeight = weightGoal?.starting_weight ?? (weightLogs.length > 0 ? weightLogs[0].weight : null)
  const targetWeight = weightGoal?.target_weight ?? null

  const weightChange = latestWeight && prevWeight ? Number((latestWeight.weight - prevWeight.weight).toFixed(1)) : null

  const weightProgress = weightGoal && latestWeight
    ? getPercent(
        weightGoal.starting_weight - latestWeight.weight,
        weightGoal.starting_weight - weightGoal.target_weight
      )
    : 0

  // Exercise calculations
  const todayExercise = exerciseLogs.filter(e => e.log_date === today)
  const todayCalories = todayExercise.reduce((sum, e) => sum + (e.calories_burned ?? 0), 0)
  const todayMinutes = todayExercise.reduce((sum, e) => sum + e.duration_minutes, 0)
  const todaySessions = todayExercise.length

  const periodCalories = exerciseLogs.reduce((sum, e) => sum + (e.calories_burned ?? 0), 0)
  const periodMinutes = exerciseLogs.reduce((sum, e) => sum + e.duration_minutes, 0)
  const periodSessions = exerciseLogs.length

  // Week calculations
  const now = new Date()
  const weekStart = subDays(now, now.getDay())
  const thisWeekEx = exerciseLogs.filter(e => new Date(e.log_date) >= weekStart)
  const weekSessions = thisWeekEx.length
  const weekMinutes = thisWeekEx.reduce((sum, e) => sum + e.duration_minutes, 0)
  const weekCalories = thisWeekEx.reduce((sum, e) => sum + (e.calories_burned ?? 0), 0)

  return {
    latestWeight,
    prevWeight,
    startWeight,
    targetWeight,
    weightChange,
    weightProgress,
    todayCalories,
    todayMinutes,
    todaySessions,
    periodCalories,
    periodMinutes,
    periodSessions,
    weekSessions,
    weekMinutes,
    weekCalories,
    weightGoal,
    fitnessGoal,
    weightLogs,
    exerciseLogs,
    error: fetchError,
  }
}
