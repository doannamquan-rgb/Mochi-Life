-- Migration 008: Security hardening for check_and_unlock_achievements RPC

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

-- Revoke execute from public/anon and grant to authenticated only
REVOKE EXECUTE ON FUNCTION public.check_and_unlock_achievements(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_and_unlock_achievements(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.check_and_unlock_achievements(UUID) TO authenticated;
