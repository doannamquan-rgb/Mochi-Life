// Pure dashboard recommendation and next-action prioritization logic.
// Shared single source of truth for both Web and Mobile clients.

import { formatVNDCompact, getPercent } from './format'

export type DashboardActionId =
  | 'review_vocab'
  | 'study_session'
  | 'complete_checklist'
  | 'log_exercise'
  | 'log_weight'
  | 'log_transaction'
  | 'first_log'
  | 'ask_ai'

export type DashboardActionDomain = 'study' | 'fitness' | 'expense' | 'checklist' | 'general'

export type DashboardFocusStatus = 'empty' | 'action' | 'completed'

export interface DashboardNextActionInput {
  today: string // YYYY-MM-DD
  // Study
  hasActiveCourse: boolean
  totalVocabulary: number
  dueVocabulary: number
  todayStudyMinutes: number
  streak: number
  // Health & Fitness
  hasWeightGoal: boolean
  latestWeightDate: string | null // YYYY-MM-DD or null
  todayExerciseMinutes: number
  weekExerciseSessions: number
  weeklySessionTarget: number | null
  // Daily Checklist
  totalChecklistCount: number
  completedChecklistCount: number
  nextChecklistItemText?: string | null
  // Finance
  todayTransactionCount: number
  monthExpense: number
  monthBudgetAmount: number | null
}

export interface DashboardActionSuggestion {
  id: DashboardActionId
  domain: DashboardActionDomain
  badge: string
  title: string
  description: string
  ctaLabel: string
  contextPill?: string
}

export interface DashboardNextActionResult {
  status: DashboardFocusStatus
  primary: DashboardActionSuggestion
  secondary: DashboardActionSuggestion[]
  checklistRemaining: number
  budgetUsedPct: number | null
}

/**
 * Computes the single highest-impact next action for today based solely on
 * observed user data, plus up to 3 secondary suggestions.
 */
export function getDashboardNextAction(
  input: DashboardNextActionInput
): DashboardNextActionResult {
  const checklistRemaining = Math.max(
    0,
    input.totalChecklistCount - input.completedChecklistCount
  )
  const budgetUsedPct =
    input.monthBudgetAmount && input.monthBudgetAmount > 0
      ? getPercent(input.monthExpense, input.monthBudgetAmount)
      : null

  const hasAnyDomainData =
    input.totalVocabulary > 0 ||
    input.latestWeightDate !== null ||
    input.weekExerciseSessions > 0 ||
    input.todayExerciseMinutes > 0 ||
    input.totalChecklistCount > 0 ||
    input.todayTransactionCount > 0 ||
    input.monthExpense > 0

  if (!hasAnyDomainData) {
    return {
      status: 'empty',
      primary: {
        id: 'first_log',
        domain: 'general',
        badge: 'Bắt đầu hôm nay',
        title: 'Ghi dữ liệu đầu tiên để Mochi đồng hành cùng bạn',
        description:
          'Bạn có thể bắt đầu bằng việc ghi cân nặng, thêm giao dịch hoặc thêm từ vựng tiếng Trung đầu tiên.',
        ctaLabel: 'Ghi cân nặng đầu tiên',
      },
      secondary: [
        {
          id: 'log_transaction',
          domain: 'expense',
          badge: 'Chi tiêu',
          title: 'Thêm giao dịch',
          description: 'Theo dõi thu chi hôm nay',
          ctaLabel: 'Thêm giao dịch',
        },
        {
          id: 'log_exercise',
          domain: 'fitness',
          badge: 'Sức khỏe & vận động',
          title: 'Thêm buổi tập',
          description: 'Ghi nhận vận động đầu tiên',
          ctaLabel: 'Thêm buổi tập',
        },
        {
          id: 'ask_ai',
          domain: 'general',
          badge: 'Mochi AI',
          title: 'Hỏi Mochi AI',
          description: 'Nhờ Mochi gợi ý kế hoạch',
          ctaLabel: 'Trò chuyện',
        },
      ],
      checklistRemaining,
      budgetUsedPct,
    }
  }

  const candidates: DashboardActionSuggestion[] = []

  // 1. Due vocabulary / streak protection
  if (input.dueVocabulary > 0) {
    const streakAtRisk = input.streak > 0 && input.todayStudyMinutes === 0
    candidates.push({
      id: 'review_vocab',
      domain: 'study',
      badge: streakAtRisk ? 'Bảo vệ chuỗi học' : 'Ưu tiên học tập',
      title: streakAtRisk
        ? `Ôn ${input.dueVocabulary} từ đến hạn để giữ chuỗi ${input.streak} ngày`
        : `Ôn ${input.dueVocabulary} từ vựng đến hạn hôm nay`,
      description: streakAtRisk
        ? `Hôm nay bạn chưa học phút nào. Ôn nhanh flashcard SM-2 để vừa nhớ lâu vừa giữ chuỗi ${input.streak} ngày.`
        : `Đang có ${input.dueVocabulary} từ đến hạn theo lịch SM-2. Ôn tập ngay để giữ trí nhớ bền vững.`,
      ctaLabel: 'Ôn flashcard ngay',
      contextPill: `${input.dueVocabulary} từ cần ôn`,
    })
  } else if (input.streak > 0 && input.todayStudyMinutes === 0 && input.hasActiveCourse) {
    candidates.push({
      id: 'study_session',
      domain: 'study',
      badge: 'Giữ chuỗi ngày',
      title: `Duy trì chuỗi học ${input.streak} ngày hôm nay`,
      description:
        'Hôm nay chưa có buổi học nào được ghi nhận. Học vài phút hoặc xem lại bài đang học để nối dài chuỗi nhé.',
      ctaLabel: 'Học tiếng Trung',
      contextPill: `Chuỗi ${input.streak} ngày`,
    })
  }

  // 2. Pending daily checklist
  if (checklistRemaining > 0) {
    candidates.push({
      id: 'complete_checklist',
      domain: 'checklist',
      badge: 'Mục tiêu hôm nay',
      title: input.nextChecklistItemText
        ? `Tiếp tục: ${input.nextChecklistItemText}`
        : `Hoàn thành ${checklistRemaining} việc còn lại hôm nay`,
      description: `Bạn đã hoàn thành ${input.completedChecklistCount}/${input.totalChecklistCount} mục trong checklist hôm nay.`,
      ctaLabel: 'Tiếp tục checklist',
      contextPill: `Còn ${checklistRemaining} việc`,
    })
  }

  // 3. Health & Exercise (weekly target behind or no workout today)
  const behindWeeklyExercise =
    input.weeklySessionTarget !== null &&
    input.weeklySessionTarget > 0 &&
    input.weekExerciseSessions < input.weeklySessionTarget

  if (input.todayExerciseMinutes === 0 && behindWeeklyExercise) {
    candidates.push({
      id: 'log_exercise',
      domain: 'fitness',
      badge: 'Sức khỏe & vận động',
      title: 'Ghi một buổi vận động hôm nay',
      description: `Tuần này bạn đã tập ${input.weekExerciseSessions}/${input.weeklySessionTarget} buổi. Thêm một buổi vận động để bám sát mục tiêu tuần.`,
      ctaLabel: 'Thêm buổi tập',
      contextPill: `${input.weekExerciseSessions}/${input.weeklySessionTarget} buổi tuần`,
    })
  }

  // 4. Weight tracking (never logged, or has weight goal and hasn't logged today)
  if (
    input.latestWeightDate === null ||
    (input.hasWeightGoal && input.latestWeightDate !== input.today)
  ) {
    candidates.push({
      id: 'log_weight',
      domain: 'fitness',
      badge: 'Sức khỏe & vận động',
      title:
        input.latestWeightDate === null
          ? 'Ghi mốc cân nặng đầu tiên'
          : 'Cập nhật cân nặng hôm nay',
      description:
        input.latestWeightDate === null
          ? 'Lưu cân nặng hiện tại để theo dõi chỉ số BMI và xu hướng sức khỏe chính xác.'
          : 'Bạn chưa ghi cân nặng hôm nay. Cập nhật nhanh để theo dõi tiến độ mục tiêu sức khỏe.',
      ctaLabel: 'Ghi cân nặng',
      contextPill: input.latestWeightDate ? 'Chưa ghi hôm nay' : 'Chưa có dữ liệu',
    })
  }

  // 5. Finance check / transaction logging
  if (input.todayTransactionCount === 0) {
    const overBudget =
      input.monthBudgetAmount !== null &&
      input.monthBudgetAmount > 0 &&
      input.monthExpense > input.monthBudgetAmount

    let description =
      'Hôm nay chưa có giao dịch nào được ghi. Cập nhật thu chi giúp số dư ví và báo cáo luôn chính xác.'
    if (overBudget && input.monthBudgetAmount !== null) {
      description = `Chi tiêu tháng này (${formatVNDCompact(input.monthExpense)}) đã vượt ngân sách ${formatVNDCompact(input.monthBudgetAmount)}. Hãy kiểm tra lại và ghi chép giao dịch cẩn thận.`
    } else if (input.monthBudgetAmount !== null && input.monthBudgetAmount > 0) {
      const remaining = Math.max(0, input.monthBudgetAmount - input.monthExpense)
      description = `Ngân sách tháng còn ${formatVNDCompact(remaining)} (${budgetUsedPct ?? 0}% đã dùng). Ghi giao dịch hôm nay nếu có phát sinh.`
    }

    candidates.push({
      id: 'log_transaction',
      domain: 'expense',
      badge: overBudget ? 'Lưu ý ngân sách' : 'Chi tiêu hôm nay',
      title: overBudget ? 'Kiểm soát chi tiêu & ghi giao dịch' : 'Ghi chép giao dịch hôm nay',
      description,
      ctaLabel: 'Thêm giao dịch',
      contextPill:
        budgetUsedPct !== null ? `${budgetUsedPct}% ngân sách` : 'Chưa ghi hôm nay',
    })
  }

  // 6. Fallback exercise suggestion if no weekly target was set and not logged today
  if (input.todayExerciseMinutes === 0 && !behindWeeklyExercise) {
    candidates.push({
      id: 'log_exercise',
      domain: 'fitness',
      badge: 'Sức khỏe & vận động',
      title: 'Dành ít phút vận động hôm nay',
      description:
        'Hôm nay chưa có hoạt động vận động nào được ghi nhận. Đi bộ, giãn cơ hoặc tập nhẹ đều giúp duy trì năng lượng.',
      ctaLabel: 'Thêm buổi tập',
      contextPill: 'Chưa tập hôm nay',
    })
  }

  if (candidates.length === 0) {
    return {
      status: 'completed',
      primary: {
        id: 'ask_ai',
        domain: 'general',
        badge: 'Hoàn thành hôm nay',
        title: 'Tuyệt vời! Bạn đã hoàn thành các việc chính hôm nay 🎉',
        description:
          'Từ vựng, checklist, sức khỏe và chi tiêu hôm nay đều đã được cập nhật. Bạn có thể hỏi Mochi AI để tổng kết hoặc lên kế hoạch ngày mai.',
        ctaLabel: 'Tổng kết cùng Mochi AI',
        contextPill: 'Đạt nhịp hôm nay',
      },
      secondary: [
        {
          id: 'review_vocab',
          domain: 'study',
          badge: 'Tiếng Trung',
          title: 'Ôn thêm từ vựng',
          description: 'Củng cố từ đã học',
          ctaLabel: 'Học tiếp',
        },
        {
          id: 'log_transaction',
          domain: 'expense',
          badge: 'Chi tiêu',
          title: 'Thêm giao dịch',
          description: 'Ghi thêm khoản thu/chi',
          ctaLabel: 'Ghi giao dịch',
        },
      ],
      checklistRemaining,
      budgetUsedPct,
    }
  }

  const [primary, ...rest] = candidates
  return {
    status: 'action',
    primary,
    secondary: rest.slice(0, 3),
    checklistRemaining,
    budgetUsedPct,
  }
}
