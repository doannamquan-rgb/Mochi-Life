import type { SupabaseClient } from '@supabase/supabase-js'
import type { HskCourse, HskLesson, HskVocabulary, StudySession, StudyGoal, VocabularyReview } from './types'
import { todayString, toDbDate, CalendarPeriod } from './date-utils'
import { fetchAllRows } from './supabase/fetchAllRows'

export type ChineseStats = {
  activeCourse: HskCourse | null
  allCourses: HskCourse[]
  totalVocabulary: number
  learnedVocabulary: number
  notLearnedVocabulary: number
  reviewedVocabulary: number
  masteredVocabulary: number
  dueVocabulary: number
  newTodayVocabulary: number
  totalLessons: number
  completedLessons: number
  progressPercent: number
  targetVocabulary: number
  lessons: HskLesson[]
  vocabulary: HskVocabulary[]
  todaySession: StudySession | null
  studyGoal: StudyGoal | null
  streak: number
  error: string | null
  // New period-dependent stats
  periodNewWords: number
  periodReviewCount: number
  periodReviewedWordCount: number
  periodMinutes: number
  periodSessions: number
}

import { calculateStreak } from '@mochi/shared'
export { calculateStreak }


function getPeriodBoundaries(period: CalendarPeriod): {
  startDateStr: string | null
  endDateStr: string | null
  startIso: string | null
  endExclusiveIso: string | null
} {
  if (period === 'all') {
    return { startDateStr: null, endDateStr: null, startIso: null, endExclusiveIso: null }
  }

  const now = new Date()
  const todayStr = todayString()

  if (period === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const endEx = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
    return {
      startDateStr: todayStr,
      endDateStr: todayStr,
      startIso: start.toISOString(),
      endExclusiveIso: endEx.toISOString(),
    }
  }

  if (period === 'week') {
    // 7 calendar dates inclusive of today (today - 6 to today) matching local expenses/chinese week convention
    const d = new Date(now)
    d.setDate(d.getDate() - 6)
    const startStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
    const endEx = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
    return {
      startDateStr: startStr,
      endDateStr: todayStr,
      startIso: start.toISOString(),
      endExclusiveIso: endEx.toISOString(),
    }
  }

  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    const endEx = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const startStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const endStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    return {
      startDateStr: startStr,
      endDateStr: endStr,
      startIso: start.toISOString(),
      endExclusiveIso: endEx.toISOString(),
    }
  }

  // year
  const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
  const endEx = new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0, 0)
  return {
    startDateStr: `${now.getFullYear()}-01-01`,
    endDateStr: `${now.getFullYear()}-12-31`,
    startIso: start.toISOString(),
    endExclusiveIso: endEx.toISOString(),
  }
}

export async function fetchChineseStats(
  supabase: SupabaseClient,
  userId: string,
  preferredCourseId?: string | null,
  period: CalendarPeriod = 'month'
): Promise<ChineseStats> {
  const today = todayString()

  // 1. Fetch user courses
  const { data: userCourses, error: courseErr } = await supabase
    .from('hsk_courses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (courseErr) {
    console.error('Error fetching HSK courses:', courseErr)
  }

  const allCourses: HskCourse[] = userCourses ?? []

  // Determine active course
  let activeCourse: HskCourse | null = null
  if (preferredCourseId) {
    activeCourse = allCourses.find(c => c.id === preferredCourseId) ?? null
  }
  if (!activeCourse && allCourses.length > 0) {
    activeCourse = allCourses[0]
  }

  let lessons: HskLesson[] = []
  let vocabulary: HskVocabulary[] = []
  let todaySession: StudySession | null = null
  let studyGoal: StudyGoal | null = null
  let fetchError: string | null = null

  if (activeCourse) {
    // Protected batch fetch for course vocabulary
    const vocabRes = await fetchAllRows<HskVocabulary>((from, to) =>
      supabase.from('hsk_vocabulary')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('course_id', activeCourse!.id)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to)
    )

    if (vocabRes.ok && vocabRes.data.length > 0) {
      vocabulary = vocabRes.data
    } else {
      // Fallback query for all user vocabulary if course_id is null in legacy DB rows
      const fallbackRes = await fetchAllRows<HskVocabulary>((from, to) =>
        supabase.from('hsk_vocabulary')
          .select('*', { count: 'exact' })
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to)
      )

      if (fallbackRes.ok && fallbackRes.data.length > 0) {
        vocabulary = fallbackRes.data
      } else if (!vocabRes.ok) {
        fetchError = vocabRes.error.message
      }
    }

    const [lessonsRes, todayRes, goalRes] = await Promise.all([
      supabase.from('hsk_lessons').select('*').eq('user_id', userId).eq('course_id', activeCourse.id).order('lesson_number').order('id'),
      supabase.from('study_sessions').select('*').eq('user_id', userId).eq('session_date', today).maybeSingle(),
      supabase.from('study_goals').select('*').eq('user_id', userId).maybeSingle(),
    ])

    if (lessonsRes.error) fetchError = lessonsRes.error.message
    lessons = lessonsRes.data ?? []
    todaySession = todayRes.data ?? null
    studyGoal = goalRes.data ?? null
  }

  // Compute period boundaries
  const boundaries = getPeriodBoundaries(period)

  // 2. Fetch study sessions for period (account-wide since study_sessions has no course_id)
  const sessionRes = await fetchAllRows<StudySession>((from, to) => {
    let q = supabase.from('study_sessions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
    if (boundaries.startDateStr && boundaries.endDateStr) {
      q = q.gte('session_date', boundaries.startDateStr).lte('session_date', boundaries.endDateStr)
    }
    q = q.order('session_date', { ascending: false }).order('created_at', { ascending: false }).order('id', { ascending: false })
    return q.range(from, to)
  })

  if (!sessionRes.ok) {
    fetchError = fetchError ? `${fetchError}; ${sessionRes.error.message}` : sessionRes.error.message
  }

  const periodSessionsArr = sessionRes.ok ? sessionRes.data : []
  const periodMinutes = periodSessionsArr.reduce((s, x) => s + (x.duration_minutes ?? 0), 0)
  const periodSessions = periodSessionsArr.length

  // 3. Vocab ID Chunking for vocabulary_reviews query
  let periodReviewCount = 0
  let periodReviewedWordCount = 0

  if (activeCourse && vocabulary.length > 0) {
    const vocabIds = vocabulary.map(v => v.id)
    const CHUNK_SIZE = 100
    const chunks: string[][] = []
    for (let i = 0; i < vocabIds.length; i += CHUNK_SIZE) {
      chunks.push(vocabIds.slice(i, i + CHUNK_SIZE))
    }

    const chunkResults = await Promise.all(
      chunks.map(chunk =>
        fetchAllRows<VocabularyReview>((from, to) => {
          let q = supabase.from('vocabulary_reviews')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .in('vocabulary_id', chunk)
          if (boundaries.startIso && boundaries.endExclusiveIso) {
            q = q.gte('created_at', boundaries.startIso).lt('created_at', boundaries.endExclusiveIso)
          }
          q = q.order('created_at', { ascending: false }).order('id', { ascending: false })
          return q.range(from, to)
        })
      )
    )

    const allReviews: VocabularyReview[] = []
    const reviewIds = new Set<string>()

    for (const res of chunkResults) {
      if (res.ok) {
        for (const rev of res.data) {
          if (!reviewIds.has(rev.id)) {
            reviewIds.add(rev.id)
            allReviews.push(rev)
          }
        }
      } else {
        fetchError = fetchError ? `${fetchError}; ${res.error.message}` : res.error.message
      }
    }

    periodReviewCount = allReviews.length
    periodReviewedWordCount = new Set(allReviews.map(r => r.vocabulary_id)).size
  }

  // 4. Calculate period new words learned
  let periodNewWords = 0
  if (vocabulary.length > 0) {
    if (period === 'all') {
      periodNewWords = vocabulary.filter(v => v.first_learned_at !== null).length
    } else if (boundaries.startIso && boundaries.endExclusiveIso) {
      periodNewWords = vocabulary.filter(v => {
        if (!v.first_learned_at) return false
        return v.first_learned_at >= boundaries.startIso! && v.first_learned_at < boundaries.endExclusiveIso!
      }).length
    }
  }

  // Calculate streak (top 60 study_sessions)
  let streak = 0
  const { data: sessions } = await supabase
    .from('study_sessions')
    .select('session_date')
    .eq('user_id', userId)
    .order('session_date', { ascending: false })
    .order('id', { ascending: false })
    .limit(60)

  if (sessions) {
    streak = calculateStreak((sessions as Array<{ session_date: string }>).map(x => x.session_date))
  }

  // Canonical calculations
  const now = new Date()
  const totalVocabulary = vocabulary.length
  const notLearnedVocabulary = vocabulary.filter(v => v.memory_level === 'not_learned').length
  const learnedVocabulary = vocabulary.filter(v => v.memory_level !== 'not_learned').length
  const masteredVocabulary = vocabulary.filter(v => v.memory_level === 'mastered').length
  const dueVocabulary = vocabulary.filter(v => v.memory_level !== 'not_learned' && new Date(v.next_review_at) <= now).length
  
  const reviewedVocabulary = vocabulary.filter(
    v => v.last_reviewed_at !== null || (v.correct_count + v.incorrect_count > 0) || v.sr_repetitions > 0
  ).length

  const newTodayVocabulary = vocabulary.filter(
    v => v.first_learned_at && v.first_learned_at.split('T')[0] === today
  ).length || (todaySession?.new_words_count ?? 0)

  const totalLessons = lessons.length
  const completedLessons = lessons.filter(l => l.status === 'completed' || l.status === 'mastered').length

  const targetVocabulary = activeCourse?.total_vocabulary && activeCourse.total_vocabulary > 0
    ? activeCourse.total_vocabulary
    : (totalVocabulary > 0 ? totalVocabulary : 1)

  const progressPercent = Math.min(100, Math.round((learnedVocabulary / targetVocabulary) * 100))

  return {
    activeCourse,
    allCourses,
    totalVocabulary,
    learnedVocabulary,
    notLearnedVocabulary,
    reviewedVocabulary,
    masteredVocabulary,
    dueVocabulary,
    newTodayVocabulary,
    totalLessons,
    completedLessons,
    progressPercent,
    targetVocabulary,
    lessons,
    vocabulary,
    todaySession,
    studyGoal,
    streak,
    error: fetchError,
    periodNewWords,
    periodReviewCount,
    periodReviewedWordCount,
    periodMinutes,
    periodSessions,
  }
}
