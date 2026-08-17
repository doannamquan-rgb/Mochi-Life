import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth-context'

/**
 * Realtime synchronization hook for Mochi Mobile.
 * Subscribes to Postgres Changes for INSERT and UPDATE events filtered by user_id.
 * For DELETE operations, adheres to Option A (refetch on focus/resume).
 */
export function useRealtimeSync() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`user-sync-${userId}`)
      // 1. Transactions
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['transactions', userId] })
          queryClient.invalidateQueries({ queryKey: ['wallets', userId] })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['transactions', userId] })
          queryClient.invalidateQueries({ queryKey: ['wallets', userId] })
        }
      )
      // 2. Weight Logs
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'weight_logs', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['weight-logs', userId] })
          queryClient.invalidateQueries({ queryKey: ['weight-goal', userId] })
        }
      )
      // 3. Exercise Logs
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'exercise_logs', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['exercise-logs', userId] })
        }
      )
      // 4. Daily Checklists
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'daily_checklists', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['checklist', userId] })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'daily_checklists', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['checklist', userId] })
        }
      )
      // 5. XP Logs & Achievements
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_xp_logs', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['xp', userId] })
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_achievements', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['user-achievements', userId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, queryClient])
}
