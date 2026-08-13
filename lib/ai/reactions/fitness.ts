import type { SupabaseClient } from '@supabase/supabase-js'
import { todayString } from '@/lib/date-utils'
import { subDays } from 'date-fns'
import type {
  FitnessExerciseReactionFacts,
  FitnessWeightReactionFacts,
} from './types'
import { getExerciseLabel } from '@/lib/format'

// ─── Exercise Reaction Facts ─────────────────────────────────────────────────

export async function buildExerciseReactionFacts(
  supabase: SupabaseClient,
  userId: string
): Promise<FitnessExerciseReactionFacts | null> {
  const today = todayString()
  const sevenDaysAgo = today // will be computed below

  const now = new Date()
  const d7 = new Date(now)
  d7.setDate(d7.getDate() - 7)
  const d7Str = `${d7.getFullYear()}-${String(d7.getMonth() + 1).padStart(2, '0')}-${String(d7.getDate()).padStart(2, '0')}`

  const d14 = new Date(now)
  d14.setDate(d14.getDate() - 14)
  const d14Str = `${d14.getFullYear()}-${String(d14.getMonth() + 1).padStart(2, '0')}-${String(d14.getDate()).padStart(2, '0')}`

  const d30 = new Date(now)
  d30.setDate(d30.getDate() - 30)
  const d30Str = `${d30.getFullYear()}-${String(d30.getMonth() + 1).padStart(2, '0')}-${String(d30.getDate()).padStart(2, '0')}`

  const [latestRes, recentLogsRes, prevPeriodLogsRes, allLogsRes, fitnessGoalRes] = await Promise.all([
    // Latest exercise log (the one just saved)
    supabase
      .from('exercise_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    // Current 7-day logs
    supabase
      .from('exercise_logs')
      .select('log_date, duration_minutes')
      .eq('user_id', userId)
      .gte('log_date', d7Str)
      .lte('log_date', today),
    // Previous 7-day logs (days 7–14 ago)
    supabase
      .from('exercise_logs')
      .select('log_date, duration_minutes')
      .eq('user_id', userId)
      .gte('log_date', d14Str)
      .lt('log_date', d7Str),
    // Count in last 30 days (active days)
    supabase
      .from('exercise_logs')
      .select('log_date')
      .eq('user_id', userId)
      .gte('log_date', d30Str)
      .lte('log_date', today),
    // Fitness goal
    supabase
      .from('fitness_goals')
      .select('weekly_sessions')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  if (latestRes.error || !latestRes.data) return null

  const latest = latestRes.data
  const recentLogs = recentLogsRes.data ?? []
  const prevLogs = prevPeriodLogsRes.data ?? []
  const allLogs30d = allLogsRes.data ?? []
  const fitnessGoal = fitnessGoalRes.data ?? null

  // Current 7-day stats
  const sessions7d = recentLogs.length
  const minutes7d = recentLogs.reduce((sum: number, l: any) => sum + (l.duration_minutes ?? 0), 0)

  // Previous 7-day stats
  const prevSessions7d = prevLogs.length
  const prevMinutes7d = prevLogs.reduce((sum: number, l: any) => sum + (l.duration_minutes ?? 0), 0)

  // Active days in 30d (unique dates)
  const uniqueDays30d = new Set(allLogs30d.map((l: any) => l.log_date))
  const activeDays30d = uniqueDays30d.size

  // Days since last session (from prior logs, excluding today)
  const priorLogs = allLogs30d.filter((l: any) => l.log_date < today)
  let daysSinceLastSession: number | null = null
  if (priorLogs.length > 0) {
    const sorted = priorLogs.sort((a: any, b: any) => b.log_date.localeCompare(a.log_date))
    const lastDate = new Date(sorted[0].log_date)
    const todayDate = new Date(today)
    daysSinceLastSession = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
  }

  // Get all exercise logs ever (just count, for isFirstEver)
  const allTimeRes = await supabase
    .from('exercise_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  const allTimeCount = allTimeRes.count ?? 0
  const isFirstEver = allTimeCount <= 1

  // Week goal tracking
  // Current week (Sunday start)
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekStartStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`
  const weekLogsRes = await supabase
    .from('exercise_logs')
    .select('id')
    .eq('user_id', userId)
    .gte('log_date', weekStartStr)
    .lte('log_date', today)
  const weekCompleted = weekLogsRes.data?.length ?? 0

  const weeklyTarget = fitnessGoal?.weekly_sessions ?? null
  const weekGoalPercent = weeklyTarget && weeklyTarget > 0 ? (weekCompleted / weeklyTarget) * 100 : null
  const weekGoalJustMet = !!(weeklyTarget && weekCompleted === weeklyTarget)

  // Returning after break
  const returningAfterBreak = daysSinceLastSession !== null && daysSinceLastSession >= 7
  const breakDays = returningAfterBreak ? daysSinceLastSession : null

  return {
    eventType: 'exercise_logged',
    action: {
      exerciseType: latest.exercise_type,
      exerciseLabel: getExerciseLabel(latest.exercise_type),
      durationMinutes: latest.duration_minutes,
      caloriesBurned: latest.calories_burned ?? null,
      distanceKm: latest.distance_km ?? null,
      intensity: latest.intensity,
    },
    recent: {
      sessions7d,
      prevSessions7d,
      minutes7d,
      prevMinutes7d,
      daysSinceLastSession,
      activeDays30d,
    },
    goal: {
      weeklyTarget,
      weekCompleted,
      weekGoalPercent,
    },
    milestones: {
      isFirstEver,
      weekGoalJustMet,
      returningAfterBreak,
      breakDays,
    },
    projection: null,
  }
}

// ─── Weight Reaction Facts ────────────────────────────────────────────────────

export async function buildWeightReactionFacts(
  supabase: SupabaseClient,
  userId: string
): Promise<FitnessWeightReactionFacts | null> {
  const today = todayString()
  const now = new Date()

  const d7 = new Date(now)
  d7.setDate(d7.getDate() - 7)
  const d7Str = `${d7.getFullYear()}-${String(d7.getMonth() + 1).padStart(2, '0')}-${String(d7.getDate()).padStart(2, '0')}`

  const d14 = new Date(now)
  d14.setDate(d14.getDate() - 14)
  const d14Str = `${d14.getFullYear()}-${String(d14.getMonth() + 1).padStart(2, '0')}-${String(d14.getDate()).padStart(2, '0')}`

  const [top2Res, weightGoalRes, logs7dRes, logs14dRes] = await Promise.all([
    supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', userId)
      .order('log_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(2),
    supabase
      .from('weight_goals')
      .select('starting_weight, target_weight')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('weight_logs')
      .select('id')
      .eq('user_id', userId)
      .gte('log_date', d7Str)
      .lte('log_date', today),
    supabase
      .from('weight_logs')
      .select('id')
      .eq('user_id', userId)
      .gte('log_date', d14Str)
      .lt('log_date', d7Str),
  ])

  const top2 = top2Res.data ?? []
  if (top2.length === 0) return null

  const latest = top2[0]
  const prev = top2.length > 1 ? top2[1] : null
  const weightGoal = weightGoalRes.data ?? null

  const change = prev ? Number((latest.weight - prev.weight).toFixed(1)) : null
  const changeDirection: 'down' | 'up' | 'same' | null =
    change === null ? null : change < 0 ? 'down' : change > 0 ? 'up' : 'same'

  const startWeight = weightGoal?.starting_weight ?? null
  const targetWeight = weightGoal?.target_weight ?? null

  let progressPercent = 0
  let remaining: number | null = null
  if (startWeight && targetWeight && startWeight !== targetWeight) {
    progressPercent = Math.min(
      100,
      ((startWeight - latest.weight) / (startWeight - targetWeight)) * 100
    )
    remaining = Math.max(0, latest.weight - targetWeight)
  }

  const allTimeRes = await supabase
    .from('weight_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  const isFirstLog = (allTimeRes.count ?? 0) <= 1

  return {
    eventType: 'weight_logged',
    action: {
      weight: latest.weight,
      weightUnit: 'kg',
    },
    trend: {
      prevWeight: prev?.weight ?? null,
      change,
      changeDirection,
      weightLogs7d: logs7dRes.data?.length ?? 0,
      weightLogs14d: logs14dRes.data?.length ?? 0,
    },
    goal: {
      targetWeight,
      startWeight,
      progressPercent,
      remaining,
    },
    milestones: {
      isFirstLog,
    },
    projection: null,
  }
}
