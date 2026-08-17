import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth-context'
import { calculateBMI, estimateCalories, todayString } from '@mochi/shared'
import type { WeightGoal, WeightLog, ExerciseLog, FitnessGoal } from '@mochi/shared'

export function useFitness() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  // 1. Weight Goal
  const weightGoalQuery = useQuery({
    queryKey: ['weight-goal', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weight_goals')
        .select('*')
        .eq('user_id', userId!)
        .maybeSingle()
      if (error) throw error
      return data as WeightGoal | null
    },
  })

  // 2. Weight Logs
  const weightLogsQuery = useQuery({
    queryKey: ['weight-logs', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weight_logs')
        .select('*')
        .eq('user_id', userId!)
        .order('log_date', { ascending: false })
        .limit(30)
      if (error) throw error
      return (data || []) as WeightLog[]
    },
  })

  // 3. Exercise Logs
  const exerciseLogsQuery = useQuery({
    queryKey: ['exercise-logs', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('user_id', userId!)
        .order('log_date', { ascending: false })
        .limit(30)
      if (error) throw error
      return (data || []) as ExerciseLog[]
    },
  })

  // 4. Fitness Goal
  const fitnessGoalQuery = useQuery({
    queryKey: ['fitness-goal', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fitness_goals')
        .select('*')
        .eq('user_id', userId!)
        .maybeSingle()
      if (error) throw error
      return data as FitnessGoal | null
    },
  })

  // 5. User Profile (for height to compute BMI)
  const profileQuery = useQuery({
    queryKey: ['profile-fitness', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('height_cm, display_name')
        .eq('user_id', userId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  // 6. Add Weight Log Mutation
  const addWeightLogMutation = useMutation({
    mutationFn: async ({ weight, waist_cm, note }: { weight: number; waist_cm?: number; note?: string }) => {
      const today = todayString()
      const { data, error } = await supabase
        .from('weight_logs')
        .insert({
          user_id: userId!,
          log_date: today,
          weight,
          waist_cm: waist_cm || null,
          note: note || null,
        })
        .select()
        .single()
      if (error) throw error

      // Update current weight in weight_goals
      await supabase
        .from('weight_goals')
        .update({ current_weight: weight, updated_at: new Date().toISOString() })
        .eq('user_id', userId!)

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weight-logs', userId] })
      queryClient.invalidateQueries({ queryKey: ['weight-goal', userId] })
    },
  })

  // 7. Add Exercise Log Mutation
  const addExerciseLogMutation = useMutation({
    mutationFn: async ({
      exercise_type,
      duration_minutes,
      intensity = 'moderate',
      note,
    }: {
      exercise_type: string
      duration_minutes: number
      intensity?: 'light' | 'moderate' | 'high'
      note?: string
    }) => {
      const today = todayString()
      const calories = estimateCalories(exercise_type, duration_minutes, intensity)

      const { data, error } = await supabase
        .from('exercise_logs')
        .insert({
          user_id: userId!,
          log_date: today,
          exercise_type,
          duration_minutes,
          intensity,
          calories_burned: calories,
          calories_is_estimate: true,
          note: note || null,
        })
        .select()
        .single()
      if (error) throw error

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-logs', userId] })
    },
  })

  // Computed values
  const latestWeight = weightLogsQuery.data?.[0]?.weight || weightGoalQuery.data?.current_weight || weightGoalQuery.data?.starting_weight || 0
  const heightCm = profileQuery.data?.height_cm || 170
  const currentBMI = latestWeight > 0 && heightCm > 0 ? calculateBMI(latestWeight, heightCm) : null

  // Weekly stats
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const weeklyExerciseLogs = (exerciseLogsQuery.data || []).filter(
    l => new Date(l.log_date) >= oneWeekAgo
  )
  const weeklyMinutes = weeklyExerciseLogs.reduce((sum, l) => sum + (l.duration_minutes || 0), 0)
  const weeklyCalories = weeklyExerciseLogs.reduce((sum, l) => sum + (l.calories_burned || 0), 0)

  return {
    weightGoal: weightGoalQuery.data,
    weightLogs: weightLogsQuery.data || [],
    exerciseLogs: exerciseLogsQuery.data || [],
    fitnessGoal: fitnessGoalQuery.data,
    latestWeight,
    currentBMI,
    weeklyMinutes,
    weeklyCalories,
    weeklySessions: weeklyExerciseLogs.length,
    loading: weightLogsQuery.isLoading || exerciseLogsQuery.isLoading,
    addWeightLog: addWeightLogMutation.mutateAsync,
    addExerciseLog: addExerciseLogMutation.mutateAsync,
    refetch: () => {
      weightGoalQuery.refetch()
      weightLogsQuery.refetch()
      exerciseLogsQuery.refetch()
      fitnessGoalQuery.refetch()
    },
  }
}
