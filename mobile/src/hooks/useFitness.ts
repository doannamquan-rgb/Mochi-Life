import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth-context'
import { queryKeys } from '../lib/query-keys'
import { calculateBMI, estimateCalories, todayString } from '@mochi/shared'
import type { WeightGoal, WeightLog, ExerciseLog, FitnessGoal, UserProfile, CalorieIntakeEntry } from '@mochi/shared'

export function useFitness() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  // 1. Weight Goal
  const weightGoalQuery = useQuery({
    queryKey: queryKeys.weightGoal(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weight_goals')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data as WeightGoal | null
    },
  })

  // 2. Weight Logs
  const weightLogsQuery = useQuery({
    queryKey: queryKeys.weightLogs(userId),
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

  // 3. Exercise Logs (Recent 30 for UI list)
  const exerciseLogsQuery = useQuery({
    queryKey: queryKeys.exerciseLogs(userId),
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

  // 3b. Calorie Intake Entries
  const calorieIntakeQuery = useQuery({
    queryKey: ['calorie-intake', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calorie_intake_entries')
        .select('*')
        .eq('user_id', userId!)
        .order('date', { ascending: false })
        .limit(30)
      if (error) return []
      return (data || []) as CalorieIntakeEntry[]
    },
  })

  // 4. Fitness Goal
  const fitnessGoalQuery = useQuery({
    queryKey: queryKeys.fitnessGoal(userId),
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

  // 5. User Profile (for height to compute accurate BMI)
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

  // 6. Add / Update Weight Log Mutation
  const addWeightLogMutation = useMutation({
    mutationFn: async ({
      weight,
      waist_cm,
      note,
    }: {
      weight: number
      waist_cm?: number
      note?: string
    }) => {
      if (!userId) throw new Error('Chưa đăng nhập')
      if (!Number.isFinite(weight) || weight <= 0) {
        throw new Error('Cân nặng phải lớn hơn 0 kg')
      }

      const today = todayString()

      // Check for same-day weight log
      const { data: existingLog } = await supabase
        .from('weight_logs')
        .select('id')
        .eq('user_id', userId)
        .eq('log_date', today)
        .maybeSingle()

      let logData: any

      if (existingLog) {
        // Update today's existing log
        const { data, error } = await supabase
          .from('weight_logs')
          .update({
            weight,
            waist_cm: waist_cm || null,
            note: note?.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingLog.id)
          .select()
          .single()
        if (error) throw error
        logData = data
      } else {
        // Insert new log
        const { data, error } = await supabase
          .from('weight_logs')
          .insert({
            user_id: userId,
            log_date: today,
            weight,
            waist_cm: waist_cm || null,
            note: note?.trim() || null,
          })
          .select()
          .single()
        if (error) throw error
        logData = data
      }

      // Update current weight in weight_goals
      await supabase
        .from('weight_goals')
        .update({ current_weight: weight, updated_at: new Date().toISOString() })
        .eq('user_id', userId)

      // Award XP for logging weight
      await supabase.from('user_xp_logs').insert({
        user_id: userId,
        amount: 10,
        action_type: 'weight_logged',
      })

      return logData
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.weightLogs(userId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.weightGoal(userId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.xp(userId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.achievements(userId) })
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
      if (!userId) throw new Error('Chưa đăng nhập')
      if (!Number.isFinite(duration_minutes) || duration_minutes <= 0) {
        throw new Error('Thời gian tập phải lớn hơn 0 phút')
      }

      const today = todayString()
      const calories = estimateCalories(exercise_type, duration_minutes, intensity)

      const { data, error } = await supabase
        .from('exercise_logs')
        .insert({
          user_id: userId,
          log_date: today,
          exercise_type,
          duration_minutes,
          intensity,
          calories_burned: calories,
          calories_is_estimate: true,
          note: note?.trim() || null,
        })
        .select()
        .single()
      if (error) throw error

      // Award XP for exercise
      await supabase.from('user_xp_logs').insert({
        user_id: userId,
        amount: 20,
        action_type: 'exercise_logged',
      })

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.exerciseLogs(userId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.xp(userId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.achievements(userId) })
    },
  })

  // 8. Add Calorie Intake Mutation
  const addCalorieIntakeMutation = useMutation({
    mutationFn: async ({
      calories,
      note,
      date,
    }: {
      calories: number
      note?: string
      date?: string
    }) => {
      if (!userId) throw new Error('Chưa đăng nhập')
      if (!Number.isFinite(calories) || calories <= 0) {
        throw new Error('Lượng calo phải lớn hơn 0 kcal')
      }

      const targetDate = date || todayString()
      const { data, error } = await supabase
        .from('calorie_intake_entries')
        .insert({
          user_id: userId,
          date: targetDate,
          calories,
          note: note?.trim() || null,
        })
        .select()
        .single()
      if (error) throw error

      // Award XP safely
      await supabase.from('user_xp_logs').insert({
        user_id: userId,
        amount: 5,
        action_type: 'calorie_intake_logged',
        reference_id: `calorie:${targetDate}_${Date.now()}`,
      })

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calorie-intake', userId] })
      queryClient.invalidateQueries({ queryKey: queryKeys.xp(userId) })
    },
  })

  // Computed values
  const latestWeight =
    weightLogsQuery.data?.[0]?.weight ||
    weightGoalQuery.data?.current_weight ||
    weightGoalQuery.data?.starting_weight ||
    0

  const heightCm = profileQuery.data?.height_cm ?? null
  // Only calculate BMI if height is legitimately provided by user (no silent fallback)
  const currentBMI =
    latestWeight > 0 && heightCm && heightCm > 0
      ? calculateBMI(latestWeight, heightCm)
      : null

  // Weekly stats calculation (7 days inclusive)
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 6)
  oneWeekAgo.setHours(0, 0, 0, 0)

  const weeklyExerciseLogs = (exerciseLogsQuery.data || []).filter(
    l => new Date(l.log_date) >= oneWeekAgo
  )
  const weeklyMinutes = weeklyExerciseLogs.reduce((sum, l) => sum + (l.duration_minutes || 0), 0)
  const weeklyCalories = weeklyExerciseLogs.reduce((sum, l) => sum + (l.calories_burned || 0), 0)

  const today = todayString()
  const todayIntakeList = (calorieIntakeQuery.data || []).filter(c => c.date === today)
  const todayIntakeCalories = todayIntakeList.reduce((sum, c) => sum + (c.calories || 0), 0)

  const weeklyIntakeList = (calorieIntakeQuery.data || []).filter(
    c => new Date(c.date) >= oneWeekAgo
  )
  const weeklyIntakeCalories = weeklyIntakeList.reduce((sum, c) => sum + (c.calories || 0), 0)
  const weeklyCalorieBalance = weeklyIntakeCalories - weeklyCalories

  return {
    weightGoal: weightGoalQuery.data,
    weightLogs: weightLogsQuery.data || [],
    exerciseLogs: exerciseLogsQuery.data || [],
    calorieIntakeEntries: calorieIntakeQuery.data || [],
    fitnessGoal: fitnessGoalQuery.data,
    profile: profileQuery.data,
    latestWeight,
    heightCm,
    currentBMI,
    weeklyMinutes,
    weeklyCalories,
    weeklySessions: weeklyExerciseLogs.length,
    todayIntakeCalories,
    weeklyIntakeCalories,
    weeklyCalorieBalance,
    loading: weightLogsQuery.isLoading || exerciseLogsQuery.isLoading || calorieIntakeQuery.isLoading,
    addWeightLog: addWeightLogMutation.mutateAsync,
    addExerciseLog: addExerciseLogMutation.mutateAsync,
    addCalorieIntake: addCalorieIntakeMutation.mutateAsync,
    refetch: async () => {
      await Promise.all([
        weightGoalQuery.refetch(),
        weightLogsQuery.refetch(),
        exerciseLogsQuery.refetch(),
        calorieIntakeQuery.refetch(),
        fitnessGoalQuery.refetch(),
        profileQuery.refetch(),
      ])
    },
  }
}
