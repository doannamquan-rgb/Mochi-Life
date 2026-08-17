import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth-context'
import { calculateLevelFromXP, calculateStreak, todayString } from '@mochi/shared'
import type { DailyChecklist, UserProfile } from '@mochi/shared'

export function useDashboardData() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  // 1. Fetch User Profile
  const profileQuery = useQuery({
    queryKey: ['profile', userId],
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

  // 2. Fetch User XP & Level
  const xpQuery = useQuery({
    queryKey: ['xp', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_xp_logs')
        .select('amount')
        .eq('user_id', userId!)
      if (error) throw error
      const totalXP = (data || []).reduce((sum, item) => sum + (item.amount || 0), 0)
      return calculateLevelFromXP(totalXP)
    },
  })

  // 3. Fetch Today's Daily Checklist
  const today = todayString()
  const checklistQuery = useQuery({
    queryKey: ['checklist', userId, today],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_checklists')
        .select('*')
        .eq('user_id', userId!)
        .eq('checklist_date', today)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return (data || []) as DailyChecklist[]
    },
  })

  // 4. Fetch Study Streak
  const streakQuery = useQuery({
    queryKey: ['study-streak', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_sessions')
        .select('session_date')
        .eq('user_id', userId!)
        .order('session_date', { ascending: false })
      if (error) throw error
      const dates = (data || []).map((s: any) => s.session_date)
      return calculateStreak(dates)
    },
  })

  // 5. Toggle Checklist Mutation
  const toggleChecklistMutation = useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      const { error } = await supabase
        .from('daily_checklists')
        .update({ is_completed, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId!)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist', userId] })
    },
  })

  // 6. Add Checklist Item Mutation
  const addChecklistMutation = useMutation({
    mutationFn: async ({ item_text, category }: { item_text: string; category: DailyChecklist['category'] }) => {
      const { error } = await supabase.from('daily_checklists').insert({
        user_id: userId!,
        checklist_date: today,
        item_text,
        category,
        is_completed: false,
        sort_order: 99,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist', userId] })
    },
  })

  return {
    profile: profileQuery.data,
    levelData: xpQuery.data,
    checklist: checklistQuery.data || [],
    streak: streakQuery.data || 0,
    loading: profileQuery.isLoading || xpQuery.isLoading || checklistQuery.isLoading,
    toggleChecklist: toggleChecklistMutation.mutateAsync,
    addChecklistItem: addChecklistMutation.mutateAsync,
    refetch: () => {
      profileQuery.refetch()
      xpQuery.refetch()
      checklistQuery.refetch()
      streakQuery.refetch()
    },
  }
}
