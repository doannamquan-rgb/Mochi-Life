-- ============================================================
-- Mochi Life - Migration 003: Seed Achievements
-- ============================================================

INSERT INTO public.achievements (code, name, description, icon, category, condition_type, condition_value) VALUES
-- FITNESS
('first_workout', 'Khởi động đầu tiên! 🐱', 'Ghi nhận buổi tập luyện đầu tiên', '🏃', 'fitness', 'exercise_count', 1),
('workout_10', 'Năng động là thói quen! 💪', 'Hoàn thành 10 buổi tập', '💪', 'fitness', 'exercise_count', 10),
('workout_30', 'Chiến binh bền bỉ! 🔥', 'Hoàn thành 30 buổi tập', '🔥', 'fitness', 'exercise_count', 30),
('workout_streak_7', 'Tuần luyện tập hoàn hảo! ⭐', 'Tập luyện 7 ngày liên tục', '⭐', 'fitness', 'exercise_streak', 7),
('workout_streak_30', 'Tháng bứt phá! 🌟', 'Tập luyện 30 ngày liên tục', '🌟', 'fitness', 'exercise_streak', 30),
('calorie_goal_week', 'Đốt cháy mục tiêu! 🔥', 'Đạt mục tiêu calo tuần', '🔥', 'fitness', 'weekly_calorie_goal', 1),
('first_weight_log', 'Ghi nhận đầu tiên! 📊', 'Ghi nhận cân nặng lần đầu', '📊', 'fitness', 'weight_log_count', 1),
('weight_goal_reached', 'Chạm mục tiêu! 🎯', 'Đạt cân nặng mục tiêu', '🎯', 'fitness', 'weight_goal_reached', 1),

-- STUDY
('first_word', 'Bước đầu tiên! 🈶', 'Học từ đầu tiên tiếng Trung', '🈶', 'study', 'vocab_count', 1),
('vocab_50', 'Từ vựng phong phú! 📚', 'Học 50 từ vựng', '📚', 'study', 'vocab_count', 50),
('vocab_100', 'Trăm từ rồi đó! 🎓', 'Học 100 từ vựng', '🎓', 'study', 'vocab_count', 100),
('vocab_300', 'Gần HSK 3 rồi! 🏆', 'Học 300 từ vựng HSK 3', '🏆', 'study', 'vocab_count', 300),
('study_streak_7', 'Học đều đặn 7 ngày! 🗓️', 'Học 7 ngày liên tục', '🗓️', 'study', 'study_streak', 7),
('study_streak_30', 'Tháng học chuyên cần! 🌸', 'Học 30 ngày liên tục', '🌸', 'study', 'study_streak', 30),
('first_lesson_done', 'Bài 1 hoàn thành! 🎉', 'Hoàn thành bài học đầu tiên', '🎉', 'study', 'lesson_completed', 1),
('grammar_10', 'Ngữ pháp nền tảng! ✍️', 'Học 10 điểm ngữ pháp', '✍️', 'study', 'grammar_count', 10),
('perfect_quiz', 'Quiz hoàn hảo! 💯', 'Đạt 100% trong một bài quiz', '💯', 'study', 'perfect_quiz', 1),

-- EXPENSE
('first_transaction', 'Theo dõi chi tiêu! 💰', 'Ghi nhận giao dịch đầu tiên', '💰', 'expense', 'transaction_count', 1),
('expense_30days', 'Ghi chép 30 ngày! 📝', 'Ghi chép chi tiêu 30 ngày', '📝', 'expense', 'expense_log_days', 30),
('budget_week_ok', 'Tuần không vượt ngân sách! 🌈', 'Một tuần không vượt ngân sách', '🌈', 'expense', 'budget_week_ok', 1),
('budget_month_ok', 'Tháng tiết kiệm! 🐱💰', 'Một tháng không vượt ngân sách', '🐱', 'expense', 'budget_month_ok', 1),
('save_goal', 'Tiết kiệm thành công! 🏦', 'Giảm chi tiêu 10% so với tháng trước', '🏦', 'expense', 'expense_reduced', 10),

-- GENERAL
('all_modules_day', 'Ngày hoàn hảo! ✨', 'Dùng cả 3 module trong một ngày', '✨', 'general', 'all_modules_day', 1),
('first_week', 'Tuần đầu hoàn chỉnh! 🌟', 'Dùng app đủ 7 ngày đầu tiên', '🌟', 'general', 'app_days', 7),
('mochi_fan', 'Fan Mochi cuồng nhiệt! 🐱', 'Dùng app 30 ngày', '🐱', 'general', 'app_days', 30)
ON CONFLICT (code) DO NOTHING;
