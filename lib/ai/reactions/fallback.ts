import type { ReactionFacts, MochiReaction, ReactionTone } from './types'
import { formatVND } from '@/lib/format'

/**
 * Builds a deterministic fallback Mochi reaction when Gemini is unavailable or fails.
 * This ensures the feature always provides useful feedback regardless of AI status.
 */
export function buildFallbackReaction(facts: ReactionFacts): MochiReaction {
  switch (facts.eventType) {
    case 'exercise_logged':
      return buildExerciseFallback(facts)
    case 'weight_logged':
      return buildWeightFallback(facts)
    case 'transaction_expense_created':
    case 'transaction_income_created':
      return buildFinanceFallback(facts)
    case 'study_session_completed':
    case 'review_session_completed':
      return buildStudyFallback(facts)
  }
}

function buildExerciseFallback(facts: Extract<ReactionFacts, { eventType: 'exercise_logged' }>): MochiReaction {
  const { action, recent, goal, milestones } = facts
  let tone: ReactionTone = 'encourage'
  let title = `${action.exerciseLabel} ${action.durationMinutes} phút ✓`
  let message = `Đã ghi nhận ${action.durationMinutes} phút ${action.exerciseLabel.toLowerCase()} hôm nay.`
  let highlight: string | null = null
  let nextAction: string | null = null

  if (milestones.isFirstEver) {
    tone = 'celebrate'
    title = `Buổi tập đầu tiên! 🎉`
    message = `Đã ghi nhận buổi tập đầu tiên — ${action.durationMinutes} phút ${action.exerciseLabel.toLowerCase()}. Bắt đầu là bước quan trọng nhất!`
  } else if (milestones.returningAfterBreak && milestones.breakDays) {
    tone = 'welcome_back'
    title = `Bắt lại được rồi 🌱`
    message = `Đây là buổi tập đầu tiên sau ${milestones.breakDays} ngày. ${action.durationMinutes} phút là một cách tốt để nối lại thói quen.`
  } else if (milestones.weekGoalJustMet && goal.weeklyTarget) {
    tone = 'celebrate'
    title = `Đủ mục tiêu tuần rồi! ✨`
    message = `Với buổi tập này, bạn đã đủ ${goal.weekCompleted}/${goal.weeklyTarget} buổi mục tiêu tuần này!`
    highlight = `Tổng ${recent.minutes7d} phút vận động trong 7 ngày qua`
  } else {
    message = `Đã ghi ${action.durationMinutes} phút ${action.exerciseLabel.toLowerCase()}. Tuần này: ${recent.sessions7d} buổi, ${recent.minutes7d} phút tổng cộng.`
    if (goal.weeklyTarget) {
      highlight = `${goal.weekCompleted}/${goal.weeklyTarget} buổi mục tiêu tuần này`
    }
  }

  if (recent.daysSinceLastSession !== null && recent.daysSinceLastSession === 1) {
    nextAction = 'Ngày mai có thể nghỉ ngơi để cơ thể phục hồi nhé.'
  }

  return { eventType: facts.eventType, title, message, tone, highlight, nextAction, generatedBy: 'fallback' }
}

function buildWeightFallback(facts: Extract<ReactionFacts, { eventType: 'weight_logged' }>): MochiReaction {
  const { action, trend, goal } = facts
  let tone: ReactionTone = 'informative'
  let title = `Đã ghi cân nặng ${action.weight} kg`
  let message = `Cân nặng hôm nay: ${action.weight} kg đã được ghi lại.`
  let highlight: string | null = null
  let nextAction: string | null = null

  if (trend.change !== null) {
    const absChange = Math.abs(trend.change)
    if (trend.changeDirection === 'down') {
      tone = 'encourage'
      message = `Cân nặng hôm nay: ${action.weight} kg — giảm ${absChange} kg so với lần trước.`
      if (goal.remaining !== null && goal.remaining > 0) {
        highlight = `Còn ${goal.remaining.toFixed(1)} kg nữa để đạt mục tiêu`
      }
    } else if (trend.changeDirection === 'up') {
      tone = 'informative'
      message = `Cân nặng hôm nay: ${action.weight} kg — tăng ${absChange} kg so với lần trước. Tiếp tục theo dõi đều nhé.`
    }
  }

  if (!nextAction && goal.targetWeight) {
    nextAction = 'Ghi đều đặn mỗi ngày hoặc mỗi sáng để theo dõi xu hướng chính xác hơn.'
  }

  return { eventType: facts.eventType, title, message, tone, highlight, nextAction, generatedBy: 'fallback' }
}

function buildStudyFallback(facts: Extract<ReactionFacts, { eventType: 'study_session_completed' | 'review_session_completed' }>): MochiReaction {
  const { action, recent, milestones } = facts
  let tone: ReactionTone = 'encourage'
  let title = action.reviewedWordsCount > 0 ? `Xong ${action.reviewedWordsCount} từ ôn tập!` : `Học thêm ${action.newWordsCount} từ mới!`
  let message = ''
  let highlight: string | null = null
  let nextAction: string | null = null

  if (milestones.streakExtended && recent.streak > 0) {
    tone = 'celebrate'
    title = `Streak ${recent.streak} ngày! 🔥`
    message = `Bạn vừa nối streak học lên ${recent.streak} ngày liên tiếp.`
  }

  if (action.newWordsCount > 0) {
    message += ` Học thêm ${action.newWordsCount} từ mới hôm nay.`
  }
  if (action.reviewedWordsCount > 0) {
    message += ` Ôn tập ${action.reviewedWordsCount} từ xong.`
  }

  if (recent.dueWordsRemaining > 0) {
    highlight = `Còn ${recent.dueWordsRemaining} từ đến hạn ôn`
    nextAction = `Còn ${recent.dueWordsRemaining} từ đến hạn ôn — xử lý sớm để lịch SRS gọn hơn.`
  }

  return { eventType: facts.eventType, title, message: message.trim(), tone, highlight, nextAction, generatedBy: 'fallback' }
}

function buildFinanceFallback(facts: Extract<ReactionFacts, { eventType: 'transaction_expense_created' | 'transaction_income_created' }>): MochiReaction {
  const { action, budget, monthly } = facts
  let tone: ReactionTone = 'informative'
  let title = action.type === 'income' ? `+${formatVND(action.amount)} thu nhập` : `${formatVND(action.amount)} chi tiêu`
  let message = ''
  let highlight: string | null = null
  let nextAction: string | null = null

  if (action.type === 'income') {
    tone = 'celebrate'
    message = `Đã ghi nhận ${formatVND(action.amount)} thu nhập. Dòng tiền ròng tháng này: ${monthly.balance >= 0 ? '+' : ''}${formatVND(monthly.balance)}.`
  } else {
    message = `Đã ghi ${formatVND(action.amount)}${action.categoryName ? ` (${action.categoryName})` : ''}.`
    if (budget.totalBudget && budget.totalUsedPercent !== null) {
      message += ` Ngân sách tháng đang dùng ${Math.round(budget.totalUsedPercent)}%.`
      if (budget.totalUsedPercent > 90) {
        tone = 'gentle_nudge'
        highlight = `Ngân sách tháng đã dùng ${Math.round(budget.totalUsedPercent)}% — còn ${budget.daysRemainingInMonth} ngày nữa`
      }
    }
  }

  return { eventType: facts.eventType, title, message, tone, highlight, nextAction, generatedBy: 'fallback' }
}
