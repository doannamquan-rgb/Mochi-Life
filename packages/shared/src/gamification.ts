import type { Achievement } from './types'

export const MASTER_ACHIEVEMENTS: Array<Omit<Achievement, 'id' | 'created_at'>> = [
  // FITNESS
  { code: 'first_workout', name: 'Khởi động đầu tiên! 🐱', description: 'Ghi nhận buổi tập luyện đầu tiên', icon: '🏃', category: 'fitness', condition_type: 'exercise_count', condition_value: 1 },
  { code: 'workout_10', name: 'Năng động là thói quen! 💪', description: 'Hoàn thành 10 buổi tập', icon: '💪', category: 'fitness', condition_type: 'exercise_count', condition_value: 10 },
  { code: 'workout_30', name: 'Chiến binh bền bỉ! 🔥', description: 'Hoàn thành 30 buổi tập', icon: '🔥', category: 'fitness', condition_type: 'exercise_count', condition_value: 30 },
  { code: 'workout_streak_7', name: 'Tuần luyện tập hoàn hảo! ⭐', description: 'Tập luyện 7 ngày liên tục', icon: '⭐', category: 'fitness', condition_type: 'exercise_streak', condition_value: 7 },
  { code: 'workout_streak_30', name: 'Tháng bứt phá! 🌟', description: 'Tập luyện 30 ngày liên tục', icon: '🌟', category: 'fitness', condition_type: 'exercise_streak', condition_value: 30 },
  { code: 'calorie_goal_week', name: 'Đốt cháy mục tiêu! 🔥', description: 'Đạt mục tiêu calo tuần', icon: '🔥', category: 'fitness', condition_type: 'weekly_calorie_goal', condition_value: 1 },
  { code: 'first_weight_log', name: 'Ghi nhận đầu tiên! 📊', description: 'Ghi nhận cân nặng lần đầu', icon: '📊', category: 'fitness', condition_type: 'weight_log_count', condition_value: 1 },
  { code: 'weight_goal_reached', name: 'Chạm mục tiêu! 🎯', description: 'Đạt cân nặng mục tiêu', icon: '🎯', category: 'fitness', condition_type: 'weight_goal_reached', condition_value: 1 },

  // STUDY
  { code: 'first_word', name: 'Bước đầu tiên! 🈶', description: 'Học từ đầu tiên tiếng Trung', icon: '🈶', category: 'study', condition_type: 'vocab_count', condition_value: 1 },
  { code: 'vocab_10', name: 'Bước đầu học hỏi 🈶', description: 'Học 10 từ vựng', icon: '🈶', category: 'study', condition_type: 'vocab_count', condition_value: 10 },
  { code: 'vocab_50', name: 'Từ vựng phong phú! 📚', description: 'Học 50 từ vựng', icon: '📚', category: 'study', condition_type: 'vocab_count', condition_value: 50 },
  { code: 'vocab_100', name: 'Trăm từ rồi đó! 🎓', description: 'Học 100 từ vựng', icon: '🎓', category: 'study', condition_type: 'vocab_count', condition_value: 100 },
  { code: 'vocab_300', name: 'Trí nhớ phong phú! 🏆', description: 'Học 300 từ vựng', icon: '🏆', category: 'study', condition_type: 'vocab_count', condition_value: 300 },
  { code: 'study_streak_7', name: 'Học đều đặn 7 ngày! 🗓️', description: 'Học 7 ngày liên tục', icon: '🗓️', category: 'study', condition_type: 'study_streak', condition_value: 7 },
  { code: 'study_streak_30', name: 'Tháng học chuyên cần! 🌸', description: 'Học 30 ngày liên tục', icon: '🌸', category: 'study', condition_type: 'study_streak', condition_value: 30 },
  { code: 'first_lesson_done', name: 'Bài 1 hoàn thành! 🎉', description: 'Hoàn thành bài học đầu tiên', icon: '🎉', category: 'study', condition_type: 'lesson_completed', condition_value: 1 },
  { code: 'course_complete', name: 'Hoàn thành khóa học 🎓', description: 'Hoàn thành bài học trong một khóa học', icon: '🎓', category: 'study', condition_type: 'course_complete', condition_value: 1 },
  { code: 'level_master', name: 'Chinh phục cấp độ 🌟', description: 'Thành thạo từ vựng trong khóa học', icon: '🌟', category: 'study', condition_type: 'level_master', condition_value: 1 },
  { code: 'grammar_10', name: 'Ngữ pháp nền tảng! ✍️', description: 'Học 10 điểm ngữ pháp', icon: '✍️', category: 'study', condition_type: 'grammar_count', condition_value: 10 },
  { code: 'perfect_quiz', name: 'Quiz hoàn hảo! 💯', description: 'Đạt 100% trong một bài ôn tập', icon: '💯', category: 'study', condition_type: 'perfect_quiz', condition_value: 1 },

  // EXPENSE
  { code: 'first_transaction', name: 'Theo dõi chi tiêu! 💰', description: 'Ghi nhận giao dịch đầu tiên', icon: '💰', category: 'expense', condition_type: 'transaction_count', condition_value: 1 },
  { code: 'expense_30days', name: 'Ghi chép 30 ngày! 📝', description: 'Ghi chép chi tiêu 30 ngày', icon: '📝', category: 'expense', condition_type: 'expense_log_days', condition_value: 30 },
  { code: 'budget_week_ok', name: 'Tuần không vượt ngân sách! 🌈', description: 'Một tuần không vượt ngân sách', icon: '🌈', category: 'expense', condition_type: 'budget_week_ok', condition_value: 1 },
  { code: 'budget_month_ok', name: 'Tháng tiết kiệm! 🐱💰', description: 'Một tháng không vượt ngân sách', icon: '🐱', category: 'expense', condition_type: 'budget_month_ok', condition_value: 1 },
  { code: 'save_goal', name: 'Tiết kiệm thành công! 🏦', description: 'Có kế hoạch ngân sách tiết kiệm', icon: '🏦', category: 'expense', condition_type: 'expense_reduced', condition_value: 1 },

  // GENERAL
  { code: 'all_modules_day', name: 'Ngày hoàn hảo! ✨', description: 'Dùng cả 3 module trong một ngày', icon: '✨', category: 'general', condition_type: 'all_modules_day', condition_value: 1 },
  { code: 'first_week', name: 'Tuần đầu hoàn chỉnh! 🌟', description: 'Dùng app đủ 7 ngày đầu tiên', icon: '🌟', category: 'general', condition_type: 'app_days', condition_value: 7 },
  { code: 'mochi_fan', name: 'Fan Mochi cuồng nhiệt! 🐱', description: 'Dùng app 30 ngày', icon: '🐱', category: 'general', condition_type: 'app_days', condition_value: 30 },
]

export function calculateLevelFromXP(totalXP: number) {
  // Level formula: Level = Math.floor(Math.sqrt(totalXP / 50)) + 1
  const safeXP = Math.max(0, totalXP)
  const level = Math.floor(Math.sqrt(safeXP / 50)) + 1
  const xpForCurrentLevel = Math.pow(level - 1, 2) * 50
  const xpForNextLevel = Math.pow(level, 2) * 50
  const currentProgressXP = safeXP - xpForCurrentLevel
  const neededXPForNextLevel = xpForNextLevel - xpForCurrentLevel
  const progressPct = neededXPForNextLevel > 0 ? Math.min(100, Math.round((currentProgressXP / neededXPForNextLevel) * 100)) : 100

  return {
    level,
    totalXP: safeXP,
    xpForCurrentLevel,
    xpForNextLevel,
    currentProgressXP,
    neededXPForNextLevel,
    progressPct,
  }
}
