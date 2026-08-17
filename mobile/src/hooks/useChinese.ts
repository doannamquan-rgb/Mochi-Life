import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth-context'
import { queryKeys } from '../lib/query-keys'
import { calculateNextReview, isDueForReview, todayString } from '@mochi/shared'
import type { HskCourse, HskLesson, HskVocabulary, ReviewRating, UserProfile } from '@mochi/shared'

export function useChinese() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  // 1. User Profile (to get source of truth active_hsk_course_id)
  const profileQuery = useQuery({
    queryKey: queryKeys.profile(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId!)
        .maybeSingle()
      if (error) throw error
      return data as UserProfile | null
    },
  })

  // 2. All Courses
  const coursesQuery = useQuery({
    queryKey: queryKeys.hskCourses(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hsk_courses')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as HskCourse[]
    },
  })

  const courses = coursesQuery.data || []
  const preferredCourseId = profileQuery.data?.active_hsk_course_id

  // Resolve active course: profile preferred -> first course -> null
  let activeCourse: HskCourse | null = null
  if (preferredCourseId) {
    activeCourse = courses.find(c => c.id === preferredCourseId) || null
  }
  if (!activeCourse && courses.length > 0) {
    activeCourse = courses[0]
  }

  const activeCourseId = activeCourse?.id

  // Auto-sync fallback to user profile if profile has no active course
  useEffect(() => {
    if (userId && activeCourse && !profileQuery.data?.active_hsk_course_id) {
      supabase
        .from('user_profiles')
        .update({ active_hsk_course_id: activeCourse.id })
        .eq('user_id', userId)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) })
        })
    }
  }, [userId, activeCourse, profileQuery.data?.active_hsk_course_id, queryClient])

  // 3. Lessons in Active Course
  const lessonsQuery = useQuery({
    queryKey: queryKeys.hskLessons(userId, activeCourseId),
    enabled: !!userId && !!activeCourseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hsk_lessons')
        .select('*')
        .eq('user_id', userId!)
        .eq('course_id', activeCourseId!)
        .order('lesson_number', { ascending: true })
      if (error) throw error
      return (data || []) as HskLesson[]
    },
  })

  // 4. Vocabulary in Active Course (with fallback for legacy rows where course_id is NULL)
  const vocabularyQuery = useQuery({
    queryKey: queryKeys.hskVocabulary(userId, activeCourseId),
    enabled: !!userId && !!activeCourseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hsk_vocabulary')
        .select('*')
        .eq('user_id', userId!)
        .eq('course_id', activeCourseId!)
        .order('created_at', { ascending: true })
      if (error) throw error

      if (data && data.length > 0) {
        return data as HskVocabulary[]
      }

      // Fallback query for legacy vocabulary rows where course_id was not populated
      const { data: legacyData, error: legacyErr } = await supabase
        .from('hsk_vocabulary')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: true })
      if (legacyErr) throw legacyErr
      return (legacyData || []) as HskVocabulary[]
    },
  })

  // 5. Switch Course Mutation
  const switchCourseMutation = useMutation({
    mutationFn: async (newCourseId: string) => {
      if (!userId) throw new Error('Chưa đăng nhập')

      const { error } = await supabase
        .from('user_profiles')
        .update({ active_hsk_course_id: newCourseId, updated_at: new Date().toISOString() })
        .eq('user_id', userId)

      if (error) throw error
      return newCourseId
    },
    onSuccess: (newCourseId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.hskVocabulary(userId, newCourseId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.hskLessons(userId, newCourseId) })
    },
  })

  // 6. Submit Vocabulary Review (SM-2 Spaced Repetition + Study Session + XP)
  const reviewVocabMutation = useMutation({
    mutationFn: async ({
      vocab,
      rating,
    }: {
      vocab: HskVocabulary
      rating: ReviewRating
    }) => {
      if (!userId) throw new Error('Chưa đăng nhập')

      const nextSR = calculateNextReview(
        {
          interval_days: vocab.sr_interval_days || 0,
          ease_factor: vocab.sr_ease_factor || 2.5,
          repetitions: vocab.sr_repetitions || 0,
          next_review_at: new Date(vocab.next_review_at || new Date()),
        },
        rating
      )

      const isCorrect = rating === 'remembered' || rating === 'easy'
      const today = todayString()

      // Update vocabulary record
      const { error: updateError } = await supabase
        .from('hsk_vocabulary')
        .update({
          sr_interval_days: nextSR.interval_days,
          sr_ease_factor: nextSR.ease_factor,
          sr_repetitions: nextSR.repetitions,
          next_review_at: nextSR.next_review_at.toISOString(),
          last_reviewed_at: new Date().toISOString(),
          first_learned_at: vocab.first_learned_at || new Date().toISOString(),
          correct_count: (vocab.correct_count || 0) + (isCorrect ? 1 : 0),
          incorrect_count: (vocab.incorrect_count || 0) + (isCorrect ? 0 : 1),
          memory_level:
            rating === 'forgot'
              ? 'hard'
              : nextSR.repetitions > 4
              ? 'mastered'
              : 'learned',
          updated_at: new Date().toISOString(),
        })
        .eq('id', vocab.id)
        .eq('user_id', userId)

      if (updateError) throw updateError

      // Log review record
      await supabase.from('vocabulary_reviews').insert({
        user_id: userId,
        vocabulary_id: vocab.id,
        review_date: today,
        rating,
        is_correct: isCorrect,
      })

      // Award XP for review (idempotent action)
      await supabase.from('user_xp_logs').insert({
        user_id: userId,
        amount: isCorrect ? 5 : 2,
        action_type: 'vocab_review',
        reference_id: vocab.id,
      })

      // Record / update today's study session for streak calculation
      const { data: existingSession } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('session_date', today)
        .maybeSingle()

      if (existingSession) {
        await supabase
          .from('study_sessions')
          .update({
            reviewed_words_count: (existingSession.reviewed_words_count || 0) + 1,
            duration_minutes: (existingSession.duration_minutes || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSession.id)
      } else {
        await supabase.from('study_sessions').insert({
          user_id: userId,
          session_date: today,
          new_words_count: 0,
          reviewed_words_count: 1,
          duration_minutes: 2,
          is_auto_generated: true,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hskVocabulary(userId, activeCourseId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.xp(userId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.streak(userId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.studySessions(userId) })
    },
  })

  // Computed stats
  const vocabulary = vocabularyQuery.data || []
  const dueVocab = vocabulary.filter(v => isDueForReview(v.next_review_at))
  const learnedVocab = vocabulary.filter(v => v.memory_level !== 'not_learned')
  const masteredVocab = vocabulary.filter(v => v.memory_level === 'mastered')

  return {
    courses,
    activeCourse,
    activeCourseId,
    lessons: lessonsQuery.data || [],
    vocabulary,
    dueVocab,
    totalCount: vocabulary.length,
    learnedCount: learnedVocab.length,
    masteredCount: masteredVocab.length,
    dueCount: dueVocab.length,
    loading: coursesQuery.isLoading || vocabularyQuery.isLoading || profileQuery.isLoading,
    switchCourse: switchCourseMutation.mutateAsync,
    submitReview: reviewVocabMutation.mutateAsync,
    refetch: async () => {
      await Promise.all([
        coursesQuery.refetch(),
        profileQuery.refetch(),
        lessonsQuery.refetch(),
        vocabularyQuery.refetch(),
      ])
    },
  }
}
