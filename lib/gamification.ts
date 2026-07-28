import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export async function checkAndAwardAchievements(userId: string) {
  const supabase = createClient()
  try {
    const { data: unlocked, error } = await supabase.rpc('check_and_unlock_achievements', { p_user_id: userId })
    if (error) {
      console.error('Error checking achievements:', error)
      return
    }

    if (unlocked && Array.isArray(unlocked)) {
      for (const item of unlocked) {
        toast.success(`🏆 Mở khóa thành tích: ${item.achievement_name}!`, {
          description: item.achievement_desc,
          duration: 4000,
        })
      }
    }
  } catch (e) {
    console.error('Achievement check failed:', e)
  }
}

export async function awardXP(userId: string, amount: number, actionType: string, refId?: string) {
  const supabase = createClient()
  try {
    await supabase.from('user_xp_logs').insert({
      user_id: userId,
      amount,
      action_type: actionType,
      reference_id: refId || null,
    })

    // Check achievements automatically after earning XP
    await checkAndAwardAchievements(userId)
  } catch (e) {
    console.error('Failed to award XP:', e)
  }
}

export function calculateLevelFromXP(totalXP: number) {
  // Level formula: Level = Math.floor(Math.sqrt(totalXP / 50)) + 1
  const level = Math.floor(Math.sqrt(totalXP / 50)) + 1
  const xpForCurrentLevel = Math.pow(level - 1, 2) * 50
  const xpForNextLevel = Math.pow(level, 2) * 50
  const currentProgressXP = totalXP - xpForCurrentLevel
  const neededXPForNextLevel = xpForNextLevel - xpForCurrentLevel
  const progressPct = neededXPForNextLevel > 0 ? Math.min(100, Math.round((currentProgressXP / neededXPForNextLevel) * 100)) : 100

  return {
    level,
    totalXP,
    xpForCurrentLevel,
    xpForNextLevel,
    currentProgressXP,
    neededXPForNextLevel,
    progressPct,
  }
}
