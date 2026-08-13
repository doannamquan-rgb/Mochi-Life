import type { SupabaseClient } from '@supabase/supabase-js'
import { todayString } from '@/lib/date-utils'
import type { StudySessionReactionFacts } from './types'

export async function buildStudyReactionFacts(
  supabase: SupabaseClient,
  userId: string,
  eventType: 'study_session_completed' | 'review_session_completed'
): Promise<StudySessionReactionFacts | null> {
  const today = todayString()
  const now = new Date()

  const d7 = new Date(now)
  d7.setDate(d7.getDate() - 7)
  const d7Str = `${d7.getFullYear()}-${String(d7.getMonth() + 1).padStart(2, '0')}-${String(d7.getDate()).padStart(2, '0')}`

  const d14 = new Date(now)
  d14.setDate(d14.getDate() - 14)
  const d14Str = `${d14.getFullYear()}-${String(d14.getMonth() + 1).padStart(2, '0')}-${String(d14.getDate()).padStart(2, '0')}`

  // Fetch: latest study session, sessions in 7d, sessions in prev 7d, active course stats, study goal
  const [latestSessionRes, sessions7dRes, prevSessions7dRes, studyGoalRes, profileRes] = await Promise.all([
    supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('study_sessions')
      .select('session_date')
      .eq('user_id', userId)
      .gte('session_date', d7Str)
      .lte('session_date', today),
    supabase
      .from('study_sessions')
      .select('session_date')
      .eq('user_id', userId)
      .gte('session_date', d14Str)
      .lt('session_date', d7Str),
    supabase
      .from('study_goals')
      .select('daily_new_words, daily_review_words, daily_minutes')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('user_profiles')
      .select('active_hsk_course_id')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  if (latestSessionRes.error || !latestSessionRes.data) return null

  const latest = latestSessionRes.data
  const sessions7d = sessions7dRes.data ?? []
  const prevSessions7d = prevSessions7dRes.data ?? []
  const studyGoal = studyGoalRes.data ?? null
  const activeCourseId = profileRes.data?.active_hsk_course_id ?? null

  // Study days (unique dates)
  const studyDays7d = new Set(sessions7d.map((s: any) => s.session_date)).size
  const prevStudyDays7d = new Set(prevSessions7d.map((s: any) => s.session_date)).size

  // Streak calculation: count consecutive days backward from today
  const allSessionsRes = await supabase
    .from('study_sessions')
    .select('session_date')
    .eq('user_id', userId)
    .order('session_date', { ascending: false })
  const allDates = [...new Set((allSessionsRes.data ?? []).map((s: any) => s.session_date as string))].sort().reverse()

  let streak = 0
  let cursor = new Date(today)
  for (const dateStr of allDates) {
    const cursorStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
    if (dateStr === cursorStr) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else if (dateStr < cursorStr) {
      break
    }
  }

  // Active course vocabulary stats
  let dueWordsRemaining = 0
  let totalLearned = 0
  let totalVocabulary = 0

  if (activeCourseId) {
    const [dueRes, learnedRes, totalRes] = await Promise.all([
      supabase
        .from('hsk_vocabulary')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('course_id', activeCourseId)
        .lte('next_review_at', new Date().toISOString()),
      supabase
        .from('hsk_vocabulary')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('course_id', activeCourseId)
        .neq('memory_level', 'not_learned'),
      supabase
        .from('hsk_vocabulary')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('course_id', activeCourseId),
    ])
    dueWordsRemaining = dueRes.count ?? 0
    totalLearned = learnedRes.count ?? 0
    totalVocabulary = totalRes.count ?? 0
  }

  const progressPercent = totalVocabulary > 0 ? (totalLearned / totalVocabulary) * 100 : 0

  // Compute avg words per active day
  const totalNewWords7d = sessions7d.reduce((sum: number, _: any) => sum, 0)
  const avgWordsPerActiveDay = studyDays7d > 0 ? totalNewWords7d / studyDays7d : null

  // Milestones
  const isFirstSession = allDates.length <= 1
  const streakExtended = streak > 1
  const weeklyGoalMet = studyGoal ? studyDays7d >= 5 : false // 5 days/week is considered "met"
  const reviewQueueCleared = dueWordsRemaining === 0

  return {
    eventType,
    action: {
      newWordsCount: latest.new_words_count,
      reviewedWordsCount: latest.reviewed_words_count,
      durationMinutes: latest.duration_minutes,
      lessonName: latest.lesson_name ?? null,
    },
    recent: {
      streak,
      studyDays7d,
      prevStudyDays7d,
      dueWordsRemaining,
      totalLearned,
      totalVocabulary,
      progressPercent,
      avgWordsPerActiveDay,
    },
    goal: {
      dailyNewWordsTarget: studyGoal?.daily_new_words ?? null,
      dailyReviewTarget: studyGoal?.daily_review_words ?? null,
      dailyMinutesTarget: studyGoal?.daily_minutes ?? null,
    },
    milestones: {
      isFirstSession,
      streakExtended,
      weeklyGoalMet,
      reviewQueueCleared,
    },
    projection: null,
  }
}
