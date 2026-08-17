import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth-context'
import { queryKeys } from '../lib/query-keys'

/**
 * Realtime synchronization hook for Mochi Mobile.
 * Subscribes to Postgres Changes for INSERT, UPDATE, and DELETE events filtered by user_id.
 * Seamlessly propagates mutations between Web and Mobile clients.
 */
export function useRealtimeSync() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`mochi-sync-${userId}`)
      // 1. User Profiles (active course, display name, height, theme)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_profiles', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) })
        }
      )
      // 2. Wallets
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.wallets(userId) })
        }
      )
      // 3. Transactions
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.transactions(userId) })
          queryClient.invalidateQueries({ queryKey: queryKeys.wallets(userId) })
          queryClient.invalidateQueries({ queryKey: ['monthly-tx-aggregates', userId] })
          queryClient.invalidateQueries({ queryKey: queryKeys.budgets(userId) })
        }
      )
      // 4. Expense Categories & Budgets
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expense_categories', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.categories(userId) })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'budgets', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.budgets(userId) })
        }
      )
      // 5. Weight Goals & Logs
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'weight_logs', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.weightLogs(userId) })
          queryClient.invalidateQueries({ queryKey: queryKeys.weightGoal(userId) })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'weight_goals', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.weightGoal(userId) })
        }
      )
      // 6. Exercise Logs & Fitness Goals
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'exercise_logs', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.exerciseLogs(userId) })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fitness_goals', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.fitnessGoal(userId) })
        }
      )
      // 7. Chinese Courses & Vocabulary
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hsk_courses', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.hskCourses(userId) })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hsk_vocabulary', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.hskVocabulary(userId) })
        }
      )
      // 8. Study Sessions & Vocabulary Reviews
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'study_sessions', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.streak(userId) })
          queryClient.invalidateQueries({ queryKey: queryKeys.studySessions(userId) })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vocabulary_reviews', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.hskVocabulary(userId) })
          queryClient.invalidateQueries({ queryKey: queryKeys.streak(userId) })
        }
      )
      // 9. Daily Checklists
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_checklists', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.checklist(userId) })
        }
      )
      // 10. XP Logs & Achievements
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_xp_logs', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.xp(userId) })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_achievements', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.achievements(userId) })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, queryClient])
}
