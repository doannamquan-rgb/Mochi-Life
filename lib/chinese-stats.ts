import type { SupabaseClient } from '@supabase/supabase-js'
import type { HskCourse, HskLesson, HskVocabulary, StudySession, StudyGoal } from './types'
import { todayString } from './date-utils'

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
}

export async function fetchChineseStats(
  supabase: SupabaseClient,
  userId: string,
  preferredCourseId?: string | null
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
    // Attempt fetching vocab with course_id first
    let vocabRes = await supabase
      .from('hsk_vocabulary')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', activeCourse.id)

    // Fallback: If course_id column fails or returns 0 rows due to legacy rows with course_id IS NULL
    if (vocabRes.error || (!vocabRes.data || vocabRes.data.length === 0)) {
      // Try querying by joining lesson_id or fetching all user vocabulary as fallback
      const fallbackRes = await supabase
        .from('hsk_vocabulary')
        .select('*')
        .eq('user_id', userId)

      if (!fallbackRes.error && fallbackRes.data && fallbackRes.data.length > 0) {
        vocabulary = fallbackRes.data
      } else if (vocabRes.error && fallbackRes.error) {
        fetchError = vocabRes.error.message || fallbackRes.error.message
      } else {
        vocabulary = vocabRes.data ?? []
      }
    } else {
      vocabulary = vocabRes.data ?? []
    }

    const [lessonsRes, todayRes, goalRes] = await Promise.all([
      supabase.from('hsk_lessons').select('*').eq('user_id', userId).eq('course_id', activeCourse.id).order('lesson_number'),
      supabase.from('study_sessions').select('*').eq('user_id', userId).eq('session_date', today).maybeSingle(),
      supabase.from('study_goals').select('*').eq('user_id', userId).maybeSingle(),
    ])

    if (lessonsRes.error) fetchError = lessonsRes.error.message
    lessons = lessonsRes.data ?? []
    todaySession = todayRes.data ?? null
    studyGoal = goalRes.data ?? null
  }

  // Calculate streak
  let streak = 0
  const { data: sessions } = await supabase
    .from('study_sessions')
    .select('session_date')
    .eq('user_id', userId)
    .order('session_date', { ascending: false })
    .limit(60)

  if (sessions) {
    const dateSet = new Set((sessions as Array<{ session_date: string }>).map(x => x.session_date))
    const d = new Date()
    while (true) {
      const ds = d.toISOString().split('T')[0]
      if (dateSet.has(ds)) {
        streak++
        d.setDate(d.getDate() - 1)
      } else break
    }
  }

  // Canonical calculations
  const now = new Date()
  const totalVocabulary = vocabulary.length
  const notLearnedVocabulary = vocabulary.filter(v => v.memory_level === 'not_learned').length
  const learnedVocabulary = vocabulary.filter(v => v.memory_level !== 'not_learned').length
  const masteredVocabulary = vocabulary.filter(v => v.memory_level === 'mastered').length
  const dueVocabulary = vocabulary.filter(v => v.memory_level !== 'not_learned' && new Date(v.next_review_at) <= now).length
  
  // Reviewed words: last_reviewed_at IS NOT NULL OR correct+incorrect > 0 OR sr_repetitions > 0
  const reviewedVocabulary = vocabulary.filter(
    v => v.last_reviewed_at !== null || (v.correct_count + v.incorrect_count > 0) || v.sr_repetitions > 0
  ).length

  // New today words: first_learned_at is today OR todaySession.new_words_count
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
  }
}
