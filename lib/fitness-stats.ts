import type { SupabaseClient } from '@supabase/supabase-js'
import type { WeightLog, WeightGoal, ExerciseLog, FitnessGoal, CalorieIntakeEntry } from './types'
import { todayString, RollingPeriod } from './date-utils'
import { getPercent } from './format'
import { subDays } from 'date-fns'
import { fetchAllRows } from './supabase/fetchAllRows'

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
  todayIntakeCalories: number
  periodCalories: number
  periodMinutes: number
  periodSessions: number
  periodIntakeCalories: number
  calorieBalance: number
  weekSessions: number
  weekMinutes: number
  weekCalories: number
  weightGoal: WeightGoal | null
  fitnessGoal: FitnessGoal | null
  weightLogs: WeightLog[]
  exerciseLogs: ExerciseLog[]
  calorieIntakeEntries: CalorieIntakeEntry[]
  error: string | null
}

export async function fetchFitnessStats(
  supabase: SupabaseClient,
  userId: string,
  period: RollingPeriod = '30d'
): Promise<FitnessStats> {
  const today = todayString()
  let fetchError: string | null = null

  // Calculate period date filter string if not 'all' (preserving exact local behavior)
  let periodFromStr: string | null = null
  if (period !== 'all') {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '3m' ? 90 : 365
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - days)
    periodFromStr = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-${String(fromDate.getDate()).padStart(2, '0')}`
  }

  // Week start for fixed weekly metrics (Sunday start as in local source)
  const now = new Date()
  const weekStart = subDays(now, now.getDay())
  const weekStartStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`

  // Execute all required queries in parallel:
  const [
    wGoalRes,
    fGoalRes,
    top2WeightsRes,
    fixedWeekExRes,
    wLogsRes,
    exLogsRes,
    intakeLogsRes,
  ] = await Promise.all([
    // 1. Weight goal
    supabase.from('weight_goals').select('*').eq('user_id', userId).maybeSingle(),
    // 2. Fitness goal
    supabase.from('fitness_goals').select('*').eq('user_id', userId).maybeSingle(),
    // 3. Global top 2 weight logs for fixed current/prev weight (independent of period)
    supabase.from('weight_logs')
      .select('*')
      .eq('user_id', userId)
      .order('log_date', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(2),
    // 4. Fixed current-week exercise logs (protected from row limits with fetchAllRows)
    fetchAllRows<ExerciseLog>((from, to) => {
      let q = supabase.from('exercise_logs')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .gte('log_date', weekStartStr)
        .lte('log_date', today)
        .order('log_date', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
      return q.range(from, to)
    }),
    // 5. Period weight logs (protected with fetchAllRows for every period)
    fetchAllRows<WeightLog>((from, to) => {
      let q = supabase.from('weight_logs')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
      if (periodFromStr) {
        q = q.gte('log_date', periodFromStr)
      }
      q = q.order('log_date', { ascending: true })
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
      return q.range(from, to)
    }),
    // 6. Period exercise logs (protected with fetchAllRows for every period)
    fetchAllRows<ExerciseLog>((from, to) => {
      let q = supabase.from('exercise_logs')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
      if (periodFromStr) {
        q = q.gte('log_date', periodFromStr)
      }
      q = q.order('log_date', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
      return q.range(from, to)
    }),
    // 7. Period calorie intake entries
    fetchAllRows<CalorieIntakeEntry>((from, to) => {
      let q = supabase.from('calorie_intake_entries')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
      if (periodFromStr) {
        q = q.gte('date', periodFromStr)
      }
      q = q.order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
      return q.range(from, to)
    }),
  ])

  if (wGoalRes.error) fetchError = wGoalRes.error.message
  if (fGoalRes.error) fetchError = fetchError ? `${fetchError}; ${fGoalRes.error.message}` : fGoalRes.error.message
  if (top2WeightsRes.error) fetchError = fetchError ? `${fetchError}; ${top2WeightsRes.error.message}` : top2WeightsRes.error.message
  if (!fixedWeekExRes.ok) fetchError = fetchError ? `${fetchError}; ${fixedWeekExRes.error.message}` : fixedWeekExRes.error.message
  if (!wLogsRes.ok) fetchError = fetchError ? `${fetchError}; ${wLogsRes.error.message}` : wLogsRes.error.message
  if (!exLogsRes.ok) fetchError = fetchError ? `${fetchError}; ${exLogsRes.error.message}` : exLogsRes.error.message
  // Gracefully handle if intake table not yet migrated
  const intakeLogs = intakeLogsRes.ok ? intakeLogsRes.data : []

  // If any critical query failed, return error state without partial stats
  if (fetchError) {
    return {
      latestWeight: null,
      prevWeight: null,
      startWeight: null,
      targetWeight: null,
      weightChange: null,
      weightProgress: 0,
      todayCalories: 0,
      todayMinutes: 0,
      todaySessions: 0,
      todayIntakeCalories: 0,
      periodCalories: 0,
      periodMinutes: 0,
      periodSessions: 0,
      periodIntakeCalories: 0,
      calorieBalance: 0,
      weekSessions: 0,
      weekMinutes: 0,
      weekCalories: 0,
      weightGoal: null,
      fitnessGoal: null,
      weightLogs: [],
      exerciseLogs: [],
      calorieIntakeEntries: [],
      error: fetchError,
    }
  }

  const weightGoal = wGoalRes.data ?? null
  const fitnessGoal = fGoalRes.data ?? null
  const globalTop2Weights = top2WeightsRes.data ?? []

  // Fixed Weight calculations (Global, independent of period)
  const latestWeight = globalTop2Weights.length > 0 ? globalTop2Weights[0] : null
  const prevWeight = globalTop2Weights.length > 1 ? globalTop2Weights[1] : null
  const startWeight = weightGoal?.starting_weight ?? (latestWeight ? latestWeight.weight : null)
  const targetWeight = weightGoal?.target_weight ?? null

  const weightChange = latestWeight && prevWeight ? Number((latestWeight.weight - prevWeight.weight).toFixed(1)) : null

  const weightProgress = weightGoal && latestWeight && (weightGoal.starting_weight !== weightGoal.target_weight)
    ? getPercent(
        weightGoal.starting_weight - latestWeight.weight,
        weightGoal.starting_weight - weightGoal.target_weight
      )
    : 0

  // Period datasets for chart and list
  const weightLogs = wLogsRes.ok ? wLogsRes.data : []
  const exerciseLogs = exLogsRes.ok ? exLogsRes.data : []

  // Period Exercise summary calculations
  const periodCalories = exerciseLogs.reduce((sum, e) => sum + (e.calories_burned ?? 0), 0)
  const periodMinutes = exerciseLogs.reduce((sum, e) => sum + e.duration_minutes, 0)
  const periodSessions = exerciseLogs.length

  // Period Calorie Intake calculations
  const periodIntakeCalories = intakeLogs.reduce((sum, c) => sum + (c.calories || 0), 0)
  const todayIntake = intakeLogs.filter(c => c.date === today)
  const todayIntakeCalories = todayIntake.reduce((sum, c) => sum + (c.calories || 0), 0)
  const calorieBalance = periodIntakeCalories - periodCalories // Intake - Burned

  // Fixed Current-Week Exercise calculations (from fixedWeekExRes)
  const weekExerciseLogs = fixedWeekExRes.ok ? fixedWeekExRes.data : []
  const todayExercise = weekExerciseLogs.filter(e => e.log_date === today)
  const todayCalories = todayExercise.reduce((sum, e) => sum + (e.calories_burned ?? 0), 0)
  const todayMinutes = todayExercise.reduce((sum, e) => sum + e.duration_minutes, 0)
  const todaySessions = todayExercise.length

  const weekSessions = weekExerciseLogs.length
  const weekMinutes = weekExerciseLogs.reduce((sum, e) => sum + e.duration_minutes, 0)
  const weekCalories = weekExerciseLogs.reduce((sum, e) => sum + (e.calories_burned ?? 0), 0)

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
    todayIntakeCalories,
    periodCalories,
    periodMinutes,
    periodSessions,
    periodIntakeCalories,
    calorieBalance,
    weekSessions,
    weekMinutes,
    weekCalories,
    weightGoal,
    fitnessGoal,
    weightLogs,
    exerciseLogs,
    calorieIntakeEntries: intakeLogs,
    error: null,
  }
}
