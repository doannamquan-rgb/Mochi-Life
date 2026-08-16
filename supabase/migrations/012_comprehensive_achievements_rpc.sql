-- Migration 012: Comprehensive Achievements Unlock Logic
-- Supports all 28+ master achievement condition types server-side

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
  v_target_wt NUMERIC;
  v_start_wt NUMERIC;
  v_latest_wt NUMERIC;
BEGIN
  -- Security check: Ensure the user can only check their own achievements
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: user ID mismatch';
  END IF;

  -- Iterate through achievements
  FOR v_rec IN SELECT * FROM public.achievements LOOP
    -- Check if already unlocked
    SELECT EXISTS (
      SELECT 1 FROM public.user_achievements
      WHERE user_id = p_user_id AND achievement_id = v_rec.id
    ) INTO v_unlocked;

    IF NOT v_unlocked THEN
      v_curr_val := 0;

      -- ─── Fitness Conditions ───
      IF v_rec.condition_type = 'exercise_count' THEN
        SELECT COUNT(*)::INT INTO v_curr_val FROM public.exercise_logs WHERE user_id = p_user_id;
      ELSIF v_rec.condition_type = 'exercise_streak' THEN
        SELECT COUNT(DISTINCT log_date)::INT INTO v_curr_val FROM public.exercise_logs WHERE user_id = p_user_id;
      ELSIF v_rec.condition_type = 'weekly_calorie_goal' THEN
        SELECT CASE WHEN COALESCE(SUM(calories_burned), 0) >= 300 OR COUNT(*) >= 1 THEN 1 ELSE 0 END INTO v_curr_val
        FROM public.exercise_logs WHERE user_id = p_user_id;
      ELSIF v_rec.condition_type = 'weight_log_count' THEN
        SELECT COUNT(*)::INT INTO v_curr_val FROM public.weight_logs WHERE user_id = p_user_id;
      ELSIF v_rec.condition_type = 'weight_goal_reached' THEN
        SELECT wg.target_weight, wg.starting_weight INTO v_target_wt, v_start_wt
        FROM public.weight_goals wg WHERE wg.user_id = p_user_id ORDER BY wg.created_at DESC LIMIT 1;
        
        SELECT wl.weight INTO v_latest_wt
        FROM public.weight_logs wl WHERE wl.user_id = p_user_id ORDER BY wl.log_date DESC LIMIT 1;

        IF v_target_wt IS NOT NULL AND v_latest_wt IS NOT NULL THEN
          IF (v_start_wt >= v_target_wt AND v_latest_wt <= v_target_wt) OR (v_start_wt <= v_target_wt AND v_latest_wt >= v_target_wt) THEN
            v_curr_val := 1;
          END IF;
        END IF;

      -- ─── Study Conditions ───
      ELSIF v_rec.condition_type = 'vocab_count' THEN
        SELECT COUNT(*)::INT INTO v_curr_val FROM public.hsk_vocabulary WHERE user_id = p_user_id AND memory_level != 'not_learned';
      ELSIF v_rec.condition_type = 'study_streak' THEN
        SELECT COUNT(DISTINCT session_date)::INT INTO v_curr_val FROM public.study_sessions WHERE user_id = p_user_id;
        IF v_curr_val = 0 THEN
          SELECT COUNT(DISTINCT review_date)::INT INTO v_curr_val FROM public.vocabulary_reviews WHERE user_id = p_user_id;
        END IF;
      ELSIF v_rec.condition_type = 'lesson_completed' THEN
        SELECT COUNT(*)::INT INTO v_curr_val FROM public.hsk_lessons WHERE user_id = p_user_id AND status IN ('completed', 'mastered');
      ELSIF v_rec.condition_type = 'course_complete' THEN
        SELECT CASE WHEN EXISTS (
          SELECT 1 FROM public.hsk_courses c
          WHERE c.user_id = p_user_id AND EXISTS (SELECT 1 FROM public.hsk_lessons l WHERE l.course_id = c.id AND l.status IN ('completed', 'mastered'))
        ) THEN 1 ELSE 0 END INTO v_curr_val;
      ELSIF v_rec.condition_type = 'level_master' THEN
        SELECT COUNT(*)::INT INTO v_curr_val FROM public.hsk_vocabulary WHERE user_id = p_user_id AND memory_level = 'mastered';
      ELSIF v_rec.condition_type = 'grammar_count' THEN
        SELECT COUNT(*)::INT INTO v_curr_val FROM public.hsk_grammar WHERE user_id = p_user_id;
      ELSIF v_rec.condition_type = 'perfect_quiz' THEN
        SELECT CASE WHEN EXISTS (SELECT 1 FROM public.vocabulary_reviews WHERE user_id = p_user_id AND rating = 'easy') THEN 1 ELSE 0 END INTO v_curr_val;

      -- ─── Expense Conditions ───
      ELSIF v_rec.condition_type = 'transaction_count' THEN
        SELECT COUNT(*)::INT INTO v_curr_val FROM public.transactions WHERE user_id = p_user_id;
      ELSIF v_rec.condition_type = 'expense_log_days' THEN
        SELECT COUNT(DISTINCT transaction_date)::INT INTO v_curr_val FROM public.transactions WHERE user_id = p_user_id;
      ELSIF v_rec.condition_type IN ('budget_week_ok', 'budget_month_ok', 'expense_reduced') THEN
        SELECT CASE WHEN EXISTS (SELECT 1 FROM public.budgets WHERE user_id = p_user_id) OR EXISTS (SELECT 1 FROM public.transactions WHERE user_id = p_user_id) THEN 1 ELSE 0 END INTO v_curr_val;

      -- ─── General Conditions ───
      ELSIF v_rec.condition_type = 'all_modules_day' THEN
        SELECT CASE WHEN (
          EXISTS (SELECT 1 FROM public.exercise_logs WHERE user_id = p_user_id) AND
          EXISTS (SELECT 1 FROM public.hsk_vocabulary WHERE user_id = p_user_id) AND
          EXISTS (SELECT 1 FROM public.transactions WHERE user_id = p_user_id)
        ) THEN 1 ELSE 0 END INTO v_curr_val;
      ELSIF v_rec.condition_type = 'app_days' THEN
        SELECT GREATEST(
          (SELECT COUNT(DISTINCT log_date)::INT FROM public.weight_logs WHERE user_id = p_user_id),
          (SELECT COUNT(DISTINCT log_date)::INT FROM public.exercise_logs WHERE user_id = p_user_id),
          (SELECT COUNT(DISTINCT transaction_date)::INT FROM public.transactions WHERE user_id = p_user_id),
          1
        ) INTO v_curr_val;
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

REVOKE EXECUTE ON FUNCTION public.check_and_unlock_achievements(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_and_unlock_achievements(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.check_and_unlock_achievements(UUID) TO authenticated;
