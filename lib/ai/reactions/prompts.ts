import type { ReactionFacts } from './types'

/**
 * Mochi Smart Reaction System Prompt
 *
 * This is a dedicated, narrower prompt than the main chat system prompt.
 * It focuses on the post-action reaction behavior only.
 */
export const MOCHI_REACTION_SYSTEM_PROMPT = `
Bạn là Mochi 🐱 — một AI life coach dễ thương, ấm áp và thực tế.
Nhiệm vụ của bạn: Đưa ra phản hồi ngắn gọn, cá nhân hóa SAU KHI người dùng vừa hoàn thành một hành động tốt.

NGUYÊN TẮC:
1. Luôn trả lời bằng tiếng Việt trừ khi có từ chuyên ngành.
2. Giọng điệu: ấm áp, ngắn gọn, dựa trên dữ liệu thực tế. KHÔNG dùng lời khen chung chung như "Tuyệt vời!" hay "Giỏi lắm!".
3. KHÔNG bịa đặt dữ liệu. CHỈ sử dụng các con số được cung cấp trong [DATA].
4. KHÔNG chẩn đoán bệnh, KHÔNG khuyến nghị đầu tư.
5. KHÔNG nhắc về tiêu dùng xấu hay chê chi tiêu.
6. Ngắn gọn: title ≤ 80 ký tự, message ≤ 300 ký tự, highlight ≤ 120 ký tự, nextAction ≤ 180 ký tự.
7. Sử dụng emoji vừa phải: 🐱 🌸 📚 💰 🏃 ✨ 🔥 ⚖️.

CẤU TRÚC PHẢN HỒI (JSON):
{
  "title": "Tiêu đề ngắn cho phản hồi (≤80 ký tự)",
  "message": "Phản hồi chính, cá nhân hóa từ dữ liệu (≤300 ký tự)",
  "tone": "celebrate|encourage|gentle_nudge|informative|welcome_back|milestone",
  "highlight": "Điểm nổi bật 1 dòng hoặc null (≤120 ký tự)",
  "nextAction": "Gợi ý hành động tiếp theo ngắn hoặc null (≤180 ký tự)"
}

THỨ TỰ ƯU TIÊN NỘI DUNG:
1. Ghi nhận hành động vừa làm (cụ thể con số thật)
2. Kết nối với lịch sử gần đây (7 ngày, streak, v.v.)
3. Tiến độ đến mục tiêu (nếu có)
4. Gợi ý bước tiếp theo (tùy chọn, nhẹ nhàng)

Trả về JSON hợp lệ. KHÔNG giải thích thêm ngoài JSON.
`.trim()

/**
 * Builds the data context string sent to Gemini for a given event.
 * This is what Gemini actually reads — it never sees raw DB records.
 */
export function buildReactionContext(facts: ReactionFacts): string {
  switch (facts.eventType) {
    case 'exercise_logged':
      return `[DATA — Buổi tập vừa ghi]
Loại: ${facts.action.exerciseLabel} (${facts.action.exerciseType})
Thời gian: ${facts.action.durationMinutes} phút
Cường độ: ${facts.action.intensity}
${facts.action.caloriesBurned ? `Calo: ${facts.action.caloriesBurned} kcal` : ''}
${facts.action.distanceKm ? `Quãng đường: ${facts.action.distanceKm} km` : ''}

[Lịch sử 7 ngày qua]
Số buổi: ${facts.recent.sessions7d} (tuần trước: ${facts.recent.prevSessions7d})
Tổng thời gian: ${facts.recent.minutes7d} phút
${facts.recent.daysSinceLastSession !== null ? `Nghỉ trước đó: ${facts.recent.daysSinceLastSession} ngày` : 'Đây là buổi đầu tiên'}
Ngày tập trong 30 ngày qua: ${facts.recent.activeDays30d}

[Mục tiêu tuần]
Mục tiêu: ${facts.goal.weeklyTarget ?? 'Chưa đặt'} buổi/tuần
Đã đạt tuần này: ${facts.goal.weekCompleted} buổi

[Cột mốc]
Lần đầu tập: ${facts.milestones.isFirstEver}
Đã đạt mục tiêu tuần: ${facts.milestones.weekGoalJustMet}
Quay lại sau break: ${facts.milestones.returningAfterBreak}${facts.milestones.breakDays ? ` (${facts.milestones.breakDays} ngày)` : ''}`

    case 'weight_logged':
      return `[DATA — Cân nặng vừa ghi]
Cân nặng: ${facts.action.weight} kg
${facts.trend.prevWeight ? `Lần trước: ${facts.trend.prevWeight} kg (thay đổi: ${facts.trend.change && facts.trend.change > 0 ? '+' : ''}${facts.trend.change} kg)` : 'Đây là lần đầu'}

[Tiến độ mục tiêu]
Điểm bắt đầu: ${facts.goal.startWeight ?? 'N/A'} kg
Mục tiêu: ${facts.goal.targetWeight ?? 'Chưa đặt'} kg
Đã đạt: ${Math.round(facts.goal.progressPercent)}%
${facts.goal.remaining !== null ? `Còn lại: ${facts.goal.remaining.toFixed(1)} kg` : ''}

[Thói quen ghi cân]
Số lần ghi trong 7 ngày: ${facts.trend.weightLogs7d}
Số lần ghi trong 14 ngày: ${facts.trend.weightLogs14d}

[Cột mốc]
Lần đầu ghi cân: ${facts.milestones.isFirstLog}`

    case 'study_session_completed':
    case 'review_session_completed':
      return `[DATA — Phiên học vừa xong]
Từ mới học: ${facts.action.newWordsCount}
Từ ôn tập: ${facts.action.reviewedWordsCount}
Thời gian: ${facts.action.durationMinutes} phút
${facts.action.lessonName ? `Bài học: ${facts.action.lessonName}` : ''}

[Lịch sử gần đây]
Streak hiện tại: ${facts.recent.streak} ngày liên tiếp
Ngày học trong 7 ngày qua: ${facts.recent.studyDays7d} (tuần trước: ${facts.recent.prevStudyDays7d})
Từ đến hạn ôn còn lại: ${facts.recent.dueWordsRemaining}
Đã học tổng: ${facts.recent.totalLearned}/${facts.recent.totalVocabulary} từ (${Math.round(facts.recent.progressPercent)}%)

[Mục tiêu]
Từ mới/ngày: ${facts.goal.dailyNewWordsTarget ?? 'Chưa đặt'}
Từ ôn/ngày: ${facts.goal.dailyReviewTarget ?? 'Chưa đặt'}
Phút/ngày: ${facts.goal.dailyMinutesTarget ?? 'Chưa đặt'}

[Cột mốc]
Phiên đầu tiên: ${facts.milestones.isFirstSession}
Streak vừa được kéo dài: ${facts.milestones.streakExtended}
Xóa sạch hàng chờ ôn: ${facts.milestones.reviewQueueCleared}`

    case 'transaction_expense_created':
    case 'transaction_income_created':
      return `[DATA — Giao dịch vừa ghi]
Loại: ${facts.action.type === 'expense' ? 'Chi tiêu' : 'Thu nhập'}
Số tiền: ${facts.action.amount.toLocaleString('vi-VN')}₫
${facts.action.categoryName ? `Danh mục: ${facts.action.categoryIcon ?? ''} ${facts.action.categoryName}` : 'Danh mục: Chưa phân loại'}

[Tổng quan tháng này]
Chi tiêu: ${facts.monthly.expenseThisMonth.toLocaleString('vi-VN')}₫
${facts.monthly.incomePrevMonth > 0 ? `Thu nhập: ${facts.monthly.incomeThisMonth.toLocaleString('vi-VN')}₫` : ''}
Dòng tiền ròng: ${facts.monthly.balance >= 0 ? '+' : ''}${facts.monthly.balance.toLocaleString('vi-VN')}₫
${facts.monthly.expenseChangePercent !== null ? `So với tháng trước: ${facts.monthly.expenseChangePercent >= 0 ? '+' : ''}${Math.round(facts.monthly.expenseChangePercent)}%` : ''}

[Ngân sách]
${facts.budget.totalBudget ? `Ngân sách tháng: ${facts.budget.totalBudget.toLocaleString('vi-VN')}₫ (đã dùng: ${facts.budget.totalUsedPercent !== null ? Math.round(facts.budget.totalUsedPercent) + '%' : 'N/A'})` : 'Chưa đặt ngân sách'}
Còn ${facts.budget.daysRemainingInMonth} ngày trong tháng
${facts.category.categoryBudget ? `Ngân sách danh mục: ${facts.category.categoryBudget.toLocaleString('vi-VN')}₫ (đã dùng: ${facts.category.categoryBudgetUsedPercent !== null ? Math.round(facts.category.categoryBudgetUsedPercent) + '%' : 'N/A'})` : ''}

[Cảnh báo]
Vượt ngân sách tháng: ${facts.milestones.budgetExceeded}
Danh mục gần hết ngân sách (≥80%): ${facts.milestones.categoryBudgetNearLimit}`
  }
}
