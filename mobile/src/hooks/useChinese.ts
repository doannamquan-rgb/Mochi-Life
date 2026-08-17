import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth-context'
import { calculateNextReview, isDueForReview, todayString } from '@mochi/shared'
import type { HskCourse, HskLesson, HskVocabulary, ReviewRating } from '@mochi/shared'

export function useChinese() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  // 1. All Courses
  const coursesQuery = useQuery({
    queryKey: ['hsk-courses', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hsk_courses')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data || []) as HskCourse[]
    },
  })

  // 2. Active Course
  const activeCourse = coursesQuery.data?.[0] || null
  const activeCourseId = activeCourse?.id

  // 3. Lessons in Active Course
  const lessonsQuery = useQuery({
    queryKey: ['hsk-lessons', userId, activeCourseId],
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

  // 4. Vocabulary in Active Course
  const vocabularyQuery = useQuery({
    queryKey: ['hsk-vocab', userId, activeCourseId],
    enabled: !!userId && !!activeCourseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hsk_vocabulary')
        .select('*')
        .eq('user_id', userId!)
        .eq('course_id', activeCourseId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data || []) as HskVocabulary[]
    },
  })

  // 5. Submit Vocabulary Review (SM-2 Spaced Repetition)
  const reviewVocabMutation = useMutation({
    mutationFn: async ({
      vocab,
      rating,
    }: {
      vocab: HskVocabulary
      rating: ReviewRating
    }) => {
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
          memory_level: nextSR.repetitions === 0 ? 'hard' : nextSR.repetitions > 4 ? 'mastered' : 'learning',
          updated_at: new Date().toISOString(),
        })
        .eq('id', vocab.id)
        .eq('user_id', userId!)

      if (updateError) throw updateError

      // Log review record
      await supabase.from('vocabulary_reviews').insert({
        user_id: userId!,
        vocabulary_id: vocab.id,
        review_date: today,
        rating,
        is_correct: isCorrect,
      })

      // Award XP for review
      await supabase.from('user_xp_logs').insert({
        user_id: userId!,
        amount: isCorrect ? 5 : 2,
        action_type: 'vocab_review',
        reference_id: vocab.id,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hsk-vocab', userId] })
      queryClient.invalidateQueries({ queryKey: ['xp', userId] })
    },
  })

  // Computed stats
  const vocabulary = vocabularyQuery.data || []
  const dueVocab = vocabulary.filter(v => isDueForReview(v.next_review_at))
  const learnedVocab = vocabulary.filter(v => v.memory_level !== 'not_learned')
  const masteredVocab = vocabulary.filter(v => v.memory_level === 'mastered')

  return {
    courses: coursesQuery.data || [],
    activeCourse,
    lessons: lessonsQuery.data || [],
    vocabulary,
    dueVocab,
    totalCount: vocabulary.length,
    learnedCount: learnedVocab.length,
    masteredCount: masteredVocab.length,
    dueCount: dueVocab.length,
    loading: coursesQuery.isLoading || vocabularyQuery.isLoading,
    submitReview: reviewVocabMutation.mutateAsync,
    refetch: () => {
      coursesQuery.refetch()
      lessonsQuery.refetch()
      vocabularyQuery.refetch()
    },
  }
}
