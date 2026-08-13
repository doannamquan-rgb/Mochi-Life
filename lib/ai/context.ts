import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchChineseStats } from '@/lib/chinese-stats'
import { fetchFitnessStats } from '@/lib/fitness-stats'
import { fetchFinanceStats } from '@/lib/finance-stats'
import { calculateLevelFromXP } from '@/lib/gamification'
import { sanitizeStudyContext, sanitizeFitnessContext, sanitizeFinanceContext, sanitizeAchievementContext } from './privacy'
import type { ContextDomain, StudyAIContext, FitnessAIContext, FinanceAIContext, AchievementAIContext, MochiAIContext } from './types'

export function detectContextDomains(message: string): ContextDomain[] {
  const msg = message.toLowerCase()
  const domains = new Set<ContextDomain>()

  if (/học|từ vựng|tiếng trung|hsk|bài học|flashcard|quiz/.test(msg)) domains.add('study')
  if (/tập|gym|chạy|cân nặng|giảm cân|kg|calo|bài tập|thể thao/.test(msg)) domains.add('fitness')
  if (/tiền|chi tiêu|thu nhập|tháng này|ngân sách|giao dịch|chi phí|danh mục/.test(msg)) domains.add('finance')
  if (/thành tích|xp|level|cấp độ|danh hiệu|huy hiệu/.test(msg)) domains.add('achievements')
  if (/lịch|sự kiện|hôm nay|kế hoạch/.test(msg)) domains.add('calendar')
  if (/đánh giá|tổng quan|tuần này|bản tin|gợi ý/.test(msg)) domains.add('general')

  if (domains.size === 0) {
    domains.add('general')
  }

  return Array.from(domains)
}

export async function buildStudyContext(supabase: SupabaseClient, userId: string, courseId?: string): Promise<StudyAIContext | null> {
  try {
    const stats = await fetchChineseStats(supabase, userId, courseId || '')
    return sanitizeStudyContext(stats)
  } catch (err) {
    console.error('Error building study context:', err)
    return null
  }
}

export async function buildFitnessContext(supabase: SupabaseClient, userId: string): Promise<FitnessAIContext | null> {
  try {
    const stats = await fetchFitnessStats(supabase, userId)
    return sanitizeFitnessContext(stats)
  } catch (err) {
    console.error('Error building fitness context:', err)
    return null
  }
}

export async function buildFinanceContext(supabase: SupabaseClient, userId: string): Promise<FinanceAIContext | null> {
  try {
    const stats = await fetchFinanceStats(supabase, userId)
    return sanitizeFinanceContext(stats)
  } catch (err) {
    console.error('Error building finance context:', err)
    return null
  }
}

export async function buildAchievementContext(supabase: SupabaseClient, userId: string): Promise<AchievementAIContext | null> {
  try {
    // 1. Calculate total XP from user_xp_logs table
    const { data: xpLogs } = await supabase
      .from('user_xp_logs')
      .select('amount')
      .eq('user_id', userId)

    const totalXP = (xpLogs ?? []).reduce((sum, log) => sum + (log.amount ?? 0), 0)
    const levelInfo = calculateLevelFromXP(totalXP)

    // 2. Fetch recent unlocked achievements
    const { data: userAchievements } = await supabase
      .from('user_achievements')
      .select('unlocked_at, achievements(id, name, description)')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false })
      .limit(3)

    const recentAchievements = (userAchievements ?? []).map((ua: any) => ({
      name: ua.achievements?.name ?? '',
      description: ua.achievements?.description ?? '',
    }))

    return sanitizeAchievementContext({
      totalXP,
      level: levelInfo,
      recentAchievements,
    })
  } catch (err) {
    console.error('Error building achievement context:', err)
    return null
  }
}

export async function buildContextForDomains(
  supabase: SupabaseClient,
  userId: string,
  domains: ContextDomain[],
  profile: { display_name?: string | null }
): Promise<MochiAIContext> {
  const context: MochiAIContext = {
    userName: profile.display_name?.split(' ').slice(-1)[0] ?? 'bạn',
    currentDate: new Date().toISOString().split('T')[0],
  }

  const loadAll = domains.includes('general')
  const promises: Promise<void>[] = []

  if (loadAll || domains.includes('study')) {
    promises.push(buildStudyContext(supabase, userId).then(c => { if (c) context.study = c }))
  }
  if (loadAll || domains.includes('fitness')) {
    promises.push(buildFitnessContext(supabase, userId).then(c => { if (c) context.fitness = c }))
  }
  if (loadAll || domains.includes('finance')) {
    promises.push(buildFinanceContext(supabase, userId).then(c => { if (c) context.finance = c }))
  }
  if (loadAll || domains.includes('achievements')) {
    promises.push(buildAchievementContext(supabase, userId).then(c => { if (c) context.achievements = c }))
  }

  await Promise.all(promises)
  return context
}
