-- ============================================================
-- Mochi Life - Migration 005: XP, Gamification & Achievements
-- ============================================================

-- 1. Create XP logs table
CREATE TABLE IF NOT EXISTS public.user_xp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  action_type TEXT NOT NULL,
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_xp_logs_user ON public.user_xp_logs(user_id);

ALTER TABLE public.user_xp_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own xp logs" ON public.user_xp_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Update achievements with Vietnamese descriptions and generalized milestones (No HSK 3 hardcodes)
INSERT INTO public.achievements (code, name, description, icon, category, condition_type, condition_value) VALUES
('vocab_10', 'Bước đầu học hỏi 🈶', 'Học 10 từ vựng', '🈶', 'study', 'vocab_count', 10),
('vocab_300_gen', 'Trí nhớ phong phú 🏆', 'Học 300 từ vựng', '🏆', 'study', 'vocab_count', 300),
('course_complete', 'Hoàn thành khóa học 🎓', 'Hoàn thành 100% bài học trong một khóa học', '🎓', 'study', 'course_complete', 1),
('level_master', 'Chinh phục cấp độ 🌟', 'Thành thạo tất cả từ vựng trong khóa học', '🌟', 'study', 'level_master', 1)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon;

-- 3. Function to check and unlock achievements server-side safely
CREATE OR REPLACE FUNCTION public.check_and_unlock_achievements(p_user_id UUID)
RETURNS TABLE (
  achievement_code TEXT,
  achievement_name TEXT,
  achievement_icon TEXT,
  achievement_desc TEXT
) AS $$
DECLARE
  v_rec RECORD;
  v_curr_val INT;
  v_unlocked BOOLEAN;
BEGIN
  -- Iterate through achievements
  FOR v_rec IN SELECT * FROM public.achievements LOOP
    -- Check if already unlocked
    SELECT EXISTS (
      SELECT 1 FROM public.user_achievements
      WHERE user_id = p_user_id AND achievement_id = v_rec.id
    ) INTO v_unlocked;

    IF NOT v_unlocked THEN
      v_curr_val := 0;

      -- Calculate metric based on condition_type
      IF v_rec.condition_type = 'exercise_count' THEN
        SELECT COUNT(*)::INT INTO v_curr_val FROM public.exercise_logs WHERE user_id = p_user_id;
      ELSIF v_rec.condition_type = 'weight_log_count' THEN
        SELECT COUNT(*)::INT INTO v_curr_val FROM public.weight_logs WHERE user_id = p_user_id;
      ELSIF v_rec.condition_type = 'vocab_count' THEN
        SELECT COUNT(*)::INT INTO v_curr_val FROM public.hsk_vocabulary WHERE user_id = p_user_id AND memory_level != 'not_learned';
      ELSIF v_rec.condition_type = 'lesson_completed' THEN
        SELECT COUNT(*)::INT INTO v_curr_val FROM public.hsk_lessons WHERE user_id = p_user_id AND status = 'completed';
      ELSIF v_rec.condition_type = 'transaction_count' THEN
        SELECT COUNT(*)::INT INTO v_curr_val FROM public.transactions WHERE user_id = p_user_id;
      END IF;

      -- Unlock if target reached
      IF v_curr_val >= v_rec.condition_value AND v_rec.condition_value > 0 THEN
        INSERT INTO public.user_achievements (user_id, achievement_id)
        VALUES (p_user_id, v_rec.id)
        ON CONFLICT (user_id, achievement_id) DO NOTHING;

        achievement_code := v_rec.code;
        achievement_name := v_rec.name;
        achievement_icon := v_rec.icon;
        achievement_desc := v_rec.description;
        RETURN NEXT;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
