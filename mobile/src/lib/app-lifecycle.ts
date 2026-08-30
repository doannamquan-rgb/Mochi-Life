import { useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { useAuth } from './auth-context'
import { queryKeys } from './query-keys'

/**
 * Central App Lifecycle Manager for Mochi Mobile.
 * Manages foreground resync when transitioning from background -> active.
 * Throttles resyncs with a 15-second debounce to avoid request storms.
 */
export function useAppLifecycleResync() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id
  const lastResyncRef = useRef<number>(0)

  useEffect(() => {
    if (!userId) return

    // Initialize resync timestamp on mount (inside effect to avoid impure call during render)
    lastResyncRef.current = Date.now()

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        const now = Date.now()
        // Throttle resync to once every 15 seconds
        if (now - lastResyncRef.current > 15000) {
          lastResyncRef.current = now

          // 1. Trigger session auto-refresh check
          supabase.auth.getSession().catch(() => {})

          // 2. Refetch critical user-scoped queries
          queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) })
          queryClient.invalidateQueries({ queryKey: queryKeys.wallets(userId) })
          queryClient.invalidateQueries({ queryKey: queryKeys.transactions(userId) })
          queryClient.invalidateQueries({ queryKey: ['monthly-tx-aggregates', userId] })
          queryClient.invalidateQueries({ queryKey: queryKeys.weightLogs(userId) })
          queryClient.invalidateQueries({ queryKey: queryKeys.exerciseLogs(userId) })
          queryClient.invalidateQueries({ queryKey: queryKeys.hskVocabulary(userId) })
          queryClient.invalidateQueries({ queryKey: queryKeys.checklist(userId) })
          queryClient.invalidateQueries({ queryKey: queryKeys.xp(userId) })
          queryClient.invalidateQueries({ queryKey: queryKeys.streak(userId) })
          queryClient.invalidateQueries({ queryKey: queryKeys.achievements(userId) })
        }
      }
    })

    return () => {
      subscription.remove()
    }
  }, [userId, queryClient])
}
