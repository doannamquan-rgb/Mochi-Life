-- Migration 011: Transactional, Safe User Data Restore RPC
-- Restores all 23 user-owned tables in strict dependency order inside a single transaction.
-- Enforces auth.uid() matching, rewrites user_id on all rows, and rolls back atomically on failure.

CREATE OR REPLACE FUNCTION public.restore_user_data(
  p_user_id UUID,
  p_backup_data JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_table_data JSONB;
  v_row JSONB;
  v_restored_counts JSONB := '{}'::JSONB;
  v_count INT;
  v_ach_id UUID;
  v_ach_code TEXT;
BEGIN
  -- Security check: Ensure the caller is restoring their own data
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: user ID mismatch';
  END IF;

  IF p_backup_data IS NULL OR jsonb_typeof(p_backup_data) != 'object' THEN
    RAISE EXCEPTION 'Invalid backup data payload';
  END IF;

  -- ─── 1. CLEAN UP CURRENT USER DATA (Reverse Dependency Order) ───────────────
  
  -- Clear FK references on user_profiles first
  UPDATE public.user_profiles SET active_hsk_course_id = NULL WHERE user_id = p_user_id;

  DELETE FROM public.user_xp_logs WHERE user_id = p_user_id;
  DELETE FROM public.data_import_jobs WHERE user_id = p_user_id;
  DELETE FROM public.weekly_reviews WHERE user_id = p_user_id;
  DELETE FROM public.user_achievements WHERE user_id = p_user_id;
  DELETE FROM public.daily_checklists WHERE user_id = p_user_id;
  DELETE FROM public.budgets WHERE user_id = p_user_id;
  DELETE FROM public.transactions WHERE user_id = p_user_id;
  DELETE FROM public.recurring_transactions WHERE user_id = p_user_id;
  DELETE FROM public.wallets WHERE user_id = p_user_id;
  DELETE FROM public.expense_categories WHERE user_id = p_user_id;
  DELETE FROM public.study_goals WHERE user_id = p_user_id;
  DELETE FROM public.study_sessions WHERE user_id = p_user_id;
  DELETE FROM public.grammar_reviews WHERE user_id = p_user_id;
  DELETE FROM public.vocabulary_reviews WHERE user_id = p_user_id;
  DELETE FROM public.hsk_grammar WHERE user_id = p_user_id;
  DELETE FROM public.hsk_vocabulary WHERE user_id = p_user_id;
  DELETE FROM public.hsk_lessons WHERE user_id = p_user_id;
  DELETE FROM public.hsk_courses WHERE user_id = p_user_id;
  DELETE FROM public.exercise_logs WHERE user_id = p_user_id;
  DELETE FROM public.fitness_goals WHERE user_id = p_user_id;
  DELETE FROM public.weight_logs WHERE user_id = p_user_id;
  DELETE FROM public.weight_goals WHERE user_id = p_user_id;

  -- ─── 2. INSERT BACKUP DATA (Forward Dependency Order) ───────────────────────

  -- 1) hsk_courses
  v_table_data := p_backup_data->'hsk_courses';
  v_count := 0;
  IF v_table_data IS NOT NULL AND jsonb_typeof(v_table_data) = 'array' THEN
    FOR v_row IN SELECT * FROM jsonb_array_elements(v_table_data) LOOP
      INSERT INTO public.hsk_courses (id, user_id, name, level, description, total_vocabulary, total_lessons, is_sample_data, created_at, updated_at)
      VALUES (
        COALESCE((v_row->>'id')::UUID, gen_random_uuid()),
        p_user_id,
        COALESCE(v_row->>'name', 'Khóa học tiếng Trung'),
        COALESCE(v_row->>'level', 'HSK3'),
        v_row->>'description',
        COALESCE((v_row->>'total_vocabulary')::INT, 0),
        COALESCE((v_row->>'total_lessons')::INT, 0),
        COALESCE((v_row->>'is_sample_data')::BOOLEAN, false),
        COALESCE((v_row->>'created_at')::TIMESTAMPTZ, NOW()),
        COALESCE((v_row->>'updated_at')::TIMESTAMPTZ, NOW())
      ) ON CONFLICT (id) DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END IF;
  v_restored_counts := jsonb_set(v_restored_counts, '{hsk_courses}', to_jsonb(v_count));

  -- 2) user_profiles
  v_table_data := p_backup_data->'user_profiles';
  IF v_table_data IS NOT NULL AND jsonb_typeof(v_table_data) = 'array' AND jsonb_array_length(v_table_data) > 0 THEN
    v_row := v_table_data->0;
    INSERT INTO public.user_profiles (user_id, display_name, avatar_url, height_cm, theme, active_hsk_course_id, is_sample_data, updated_at)
    VALUES (
      p_user_id,
      v_row->>'display_name',
      v_row->>'avatar_url',
      (v_row->>'height_cm')::NUMERIC,
      COALESCE(v_row->>'theme', 'light'),
      (v_row->>'active_hsk_course_id')::UUID,
      COALESCE((v_row->>'is_sample_data')::BOOLEAN, false),
      NOW()
    ) ON CONFLICT (user_id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      avatar_url = EXCLUDED.avatar_url,
      height_cm = EXCLUDED.height_cm,
      theme = EXCLUDED.theme,
      active_hsk_course_id = EXCLUDED.active_hsk_course_id,
      updated_at = NOW();
    v_restored_counts := jsonb_set(v_restored_counts, '{user_profiles}', '1'::JSONB);
  END IF;

  -- 3) weight_goals
  v_table_data := p_backup_data->'weight_goals';
  IF v_table_data IS NOT NULL AND jsonb_typeof(v_table_data) = 'array' AND jsonb_array_length(v_table_data) > 0 THEN
    v_row := v_table_data->0;
    INSERT INTO public.weight_goals (id, user_id, starting_weight, target_weight, start_date, target_date, daily_calorie_goal, is_sample_data, created_at, updated_at)
    VALUES (
      COALESCE((v_row->>'id')::UUID, gen_random_uuid()),
      p_user_id,
      COALESCE((v_row->>'starting_weight')::NUMERIC, 60),
      COALESCE((v_row->>'target_weight')::NUMERIC, 55),
      COALESCE((v_row->>'start_date')::DATE, CURRENT_DATE),
      (v_row->>'target_date')::DATE,
      (v_row->>'daily_calorie_goal')::INT,
      COALESCE((v_row->>'is_sample_data')::BOOLEAN, false),
      COALESCE((v_row->>'created_at')::TIMESTAMPTZ, NOW()),
      NOW()
    ) ON CONFLICT (user_id) DO UPDATE SET
      starting_weight = EXCLUDED.starting_weight,
      target_weight = EXCLUDED.target_weight,
      start_date = EXCLUDED.start_date,
      target_date = EXCLUDED.target_date,
      daily_calorie_goal = EXCLUDED.daily_calorie_goal,
      updated_at = NOW();
    v_restored_counts := jsonb_set(v_restored_counts, '{weight_goals}', '1'::JSONB);
  END IF;

  -- 4) weight_logs
  v_table_data := p_backup_data->'weight_logs';
  v_count := 0;
  IF v_table_data IS NOT NULL AND jsonb_typeof(v_table_data) = 'array' THEN
    FOR v_row IN SELECT * FROM jsonb_array_elements(v_table_data) LOOP
      INSERT INTO public.weight_logs (id, user_id, weight, log_date, note, photo_url, is_sample_data, created_at)
      VALUES (
        COALESCE((v_row->>'id')::UUID, gen_random_uuid()),
        p_user_id,
        COALESCE((v_row->>'weight')::NUMERIC, 60),
        COALESCE((v_row->>'log_date')::DATE, CURRENT_DATE),
        v_row->>'note',
        v_row->>'photo_url',
        COALESCE((v_row->>'is_sample_data')::BOOLEAN, false),
        COALESCE((v_row->>'created_at')::TIMESTAMPTZ, NOW())
      ) ON CONFLICT (user_id, log_date) DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END IF;
  v_restored_counts := jsonb_set(v_restored_counts, '{weight_logs}', to_jsonb(v_count));

  -- 5) fitness_goals
  v_table_data := p_backup_data->'fitness_goals';
  IF v_table_data IS NOT NULL AND jsonb_typeof(v_table_data) = 'array' AND jsonb_array_length(v_table_data) > 0 THEN
    v_row := v_table_data->0;
    INSERT INTO public.fitness_goals (id, user_id, weekly_sessions, weekly_minutes, weekly_calories, daily_steps, is_sample_data, created_at, updated_at)
    VALUES (
      COALESCE((v_row->>'id')::UUID, gen_random_uuid()),
      p_user_id,
      COALESCE((v_row->>'weekly_sessions')::INT, 3),
      COALESCE((v_row->>'weekly_minutes')::INT, 150),
      COALESCE((v_row->>'weekly_calories')::INT, 1000),
      COALESCE((v_row->>'daily_steps')::INT, 8000),
      COALESCE((v_row->>'is_sample_data')::BOOLEAN, false),
      COALESCE((v_row->>'created_at')::TIMESTAMPTZ, NOW()),
      NOW()
    ) ON CONFLICT (user_id) DO UPDATE SET
      weekly_sessions = EXCLUDED.weekly_sessions,
      weekly_minutes = EXCLUDED.weekly_minutes,
      weekly_calories = EXCLUDED.weekly_calories,
      daily_steps = EXCLUDED.daily_steps,
      updated_at = NOW();
    v_restored_counts := jsonb_set(v_restored_counts, '{fitness_goals}', '1'::JSONB);
  END IF;

  -- 6) exercise_logs
  v_table_data := p_backup_data->'exercise_logs';
  v_count := 0;
  IF v_table_data IS NOT NULL AND jsonb_typeof(v_table_data) = 'array' THEN
    FOR v_row IN SELECT * FROM jsonb_array_elements(v_table_data) LOOP
      INSERT INTO public.exercise_logs (id, user_id, exercise_type, duration_minutes, calories_burned, distance_km, intensity, log_date, note, is_sample_data, created_at)
      VALUES (
        COALESCE((v_row->>'id')::UUID, gen_random_uuid()),
        p_user_id,
        COALESCE(v_row->>'exercise_type', 'other'),
        COALESCE((v_row->>'duration_minutes')::INT, 30),
        (v_row->>'calories_burned')::INT,
        (v_row->>'distance_km')::NUMERIC,
        COALESCE(v_row->>'intensity', 'medium'),
        COALESCE((v_row->>'log_date')::DATE, CURRENT_DATE),
        v_row->>'note',
        COALESCE((v_row->>'is_sample_data')::BOOLEAN, false),
        COALESCE((v_row->>'created_at')::TIMESTAMPTZ, NOW())
      ) ON CONFLICT (id) DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END IF;
  v_restored_counts := jsonb_set(v_restored_counts, '{exercise_logs}', to_jsonb(v_count));

  -- 7) hsk_lessons
  v_table_data := p_backup_data->'hsk_lessons';
  v_count := 0;
  IF v_table_data IS NOT NULL AND jsonb_typeof(v_table_data) = 'array' THEN
    FOR v_row IN SELECT * FROM jsonb_array_elements(v_table_data) LOOP
      INSERT INTO public.hsk_lessons (id, user_id, course_id, lesson_number, title, description, status, vocabulary_count, is_sample_data, created_at, updated_at)
      VALUES (
        COALESCE((v_row->>'id')::UUID, gen_random_uuid()),
        p_user_id,
        (v_row->>'course_id')::UUID,
        COALESCE((v_row->>'lesson_number')::INT, 1),
        COALESCE(v_row->>'title', 'Bài học'),
        v_row->>'description',
        COALESCE(v_row->>'status', 'not_started'),
        COALESCE((v_row->>'vocabulary_count')::INT, 0),
        COALESCE((v_row->>'is_sample_data')::BOOLEAN, false),
        COALESCE((v_row->>'created_at')::TIMESTAMPTZ, NOW()),
        COALESCE((v_row->>'updated_at')::TIMESTAMPTZ, NOW())
      ) ON CONFLICT (id) DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END IF;
  v_restored_counts := jsonb_set(v_restored_counts, '{hsk_lessons}', to_jsonb(v_count));

  -- 8) hsk_vocabulary
  v_table_data := p_backup_data->'hsk_vocabulary';
  v_count := 0;
  IF v_table_data IS NOT NULL AND jsonb_typeof(v_table_data) = 'array' THEN
    FOR v_row IN SELECT * FROM jsonb_array_elements(v_table_data) LOOP
      INSERT INTO public.hsk_vocabulary (
        id, user_id, course_id, lesson_id, hanzi, pinyin, meaning, memory_level, 
        sr_interval, sr_ease_factor, sr_repetitions, next_review_at, last_reviewed_at, 
        correct_count, incorrect_count, example_sentence, example_pinyin, example_meaning, 
        first_learned_at, is_sample_data, created_at, updated_at
      ) VALUES (
        COALESCE((v_row->>'id')::UUID, gen_random_uuid()),
        p_user_id,
        (v_row->>'course_id')::UUID,
        (v_row->>'lesson_id')::UUID,
        COALESCE(v_row->>'hanzi', ''),
        COALESCE(v_row->>'pinyin', ''),
        COALESCE(v_row->>'meaning', ''),
        COALESCE(v_row->>'memory_level', 'not_learned'),
        COALESCE((v_row->>'sr_interval')::INT, 1),
        COALESCE((v_row->>'sr_ease_factor')::NUMERIC, 2.5),
        COALESCE((v_row->>'sr_repetitions')::INT, 0),
        COALESCE((v_row->>'next_review_at')::TIMESTAMPTZ, NOW()),
        (v_row->>'last_reviewed_at')::TIMESTAMPTZ,
        COALESCE((v_row->>'correct_count')::INT, 0),
        COALESCE((v_row->>'incorrect_count')::INT, 0),
        v_row->>'example_sentence',
        v_row->>'example_pinyin',
        v_row->>'example_meaning',
        (v_row->>'first_learned_at')::TIMESTAMPTZ,
        COALESCE((v_row->>'is_sample_data')::BOOLEAN, false),
        COALESCE((v_row->>'created_at')::TIMESTAMPTZ, NOW()),
        COALESCE((v_row->>'updated_at')::TIMESTAMPTZ, NOW())
      ) ON CONFLICT (id) DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END IF;
  v_restored_counts := jsonb_set(v_restored_counts, '{hsk_vocabulary}', to_jsonb(v_count));

  -- 9) hsk_grammar
  v_table_data := p_backup_data->'hsk_grammar';
  v_count := 0;
  IF v_table_data IS NOT NULL AND jsonb_typeof(v_table_data) = 'array' THEN
    FOR v_row IN SELECT * FROM jsonb_array_elements(v_table_data) LOOP
      INSERT INTO public.hsk_grammar (
        id, user_id, course_id, lesson_id, title, structure, explanation, examples,
        mastery_level, is_sample_data, created_at, updated_at
      ) VALUES (
        COALESCE((v_row->>'id')::UUID, gen_random_uuid()),
        p_user_id,
        (v_row->>'course_id')::UUID,
        (v_row->>'lesson_id')::UUID,
        COALESCE(v_row->>'title', 'Ngữ pháp'),
        COALESCE(v_row->>'structure', ''),
        COALESCE(v_row->>'explanation', ''),
        COALESCE(v_row->'examples', '[]'::JSONB),
        COALESCE(v_row->>'mastery_level', 'learning'),
        COALESCE((v_row->>'is_sample_data')::BOOLEAN, false),
        COALESCE((v_row->>'created_at')::TIMESTAMPTZ, NOW()),
        COALESCE((v_row->>'updated_at')::TIMESTAMPTZ, NOW())
      ) ON CONFLICT (id) DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END IF;
  v_restored_counts := jsonb_set(v_restored_counts, '{hsk_grammar}', to_jsonb(v_count));

  -- 10) vocabulary_reviews
  v_table_data := p_backup_data->'vocabulary_reviews';
  v_count := 0;
  IF v_table_data IS NOT NULL AND jsonb_typeof(v_table_data) = 'array' THEN
    FOR v_row IN SELECT * FROM jsonb_array_elements(v_table_data) LOOP
      INSERT INTO public.vocabulary_reviews (id, user_id, vocabulary_id, rating, review_date, is_sample_data, created_at)
      VALUES (
        COALESCE((v_row->>'id')::UUID, gen_random_uuid()),
        p_user_id,
        (v_row->>'vocabulary_id')::UUID,
        COALESCE((v_row->>'rating')::INT, 3),
        COALESCE((v_row->>'review_date')::DATE, CURRENT_DATE),
        COALESCE((v_row->>'is_sample_data')::BOOLEAN, false),
        COALESCE((v_row->>'created_at')::TIMESTAMPTZ, NOW())
      ) ON CONFLICT (id) DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END IF;
  v_restored_counts := jsonb_set(v_restored_counts, '{vocabulary_reviews}', to_jsonb(v_count));

  -- 11) grammar_reviews
  v_table_data := p_backup_data->'grammar_reviews';
  v_count := 0;
  IF v_table_data IS NOT NULL AND jsonb_typeof(v_table_data) = 'array' THEN
    FOR v_row IN SELECT * FROM jsonb_array_elements(v_table_data) LOOP
      INSERT INTO public.grammar_reviews (id, user_id, grammar_id, rating, review_date, is_sample_data, created_at)
      VALUES (
        COALESCE((v_row->>'id')::UUID, gen_random_uuid()),
        p_user_id,
        (v_row->>'grammar_id')::UUID,
        COALESCE((v_row->>'rating')::INT, 3),
        COALESCE((v_row->>'review_date')::DATE, CURRENT_DATE),
        COALESCE((v_row->>'is_sample_data')::BOOLEAN, false),
        COALESCE((v_row->>'created_at')::TIMESTAMPTZ, NOW())
      ) ON CONFLICT (id) DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END IF;
  v_restored_counts := jsonb_set(v_restored_counts, '{grammar_reviews}', to_jsonb(v_count));

  -- 12) study_sessions
  v_table_data := p_backup_data->'study_sessions';
  v_count := 0;
  IF v_table_data IS NOT NULL AND jsonb_typeof(v_table_data) = 'array' THEN
    FOR v_row IN SELECT * FROM jsonb_array_elements(v_table_data) LOOP
      INSERT INTO public.study_sessions (id, user_id, session_date, duration_minutes, new_words_count, reviewed_words_count, note, is_sample_data, created_at)
      VALUES (
        COALESCE((v_row->>'id')::UUID, gen_random_uuid()),
        p_user_id,
        COALESCE((v_row->>'session_date')::DATE, CURRENT_DATE),
        COALESCE((v_row->>'duration_minutes')::INT, 20),
        COALESCE((v_row->>'new_words_count')::INT, 0),
        COALESCE((v_row->>'reviewed_words_count')::INT, 0),
        v_row->>'note',
        COALESCE((v_row->>'is_sample_data')::BOOLEAN, false),
        COALESCE((v_row->>'created_at')::TIMESTAMPTZ, NOW())
      ) ON CONFLICT (id) DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END IF;
  v_restored_counts := jsonb_set(v_restored_counts, '{study_sessions}', to_jsonb(v_count));

  -- 13) study_goals
  v_table_data := p_backup_data->'study_goals';
  IF v_table_data IS NOT NULL AND jsonb_typeof(v_table_data) = 'array' AND jsonb_array_length(v_table_data) > 0 THEN
    v_row := v_table_data->0;
    INSERT INTO public.study_goals (id, user_id, daily_new_words, daily_review_words, daily_minutes, is_sample_data, created_at, updated_at)
    VALUES (
      COALESCE((v_row->>'id')::UUID, gen_random_uuid()),
      p_user_id,
      COALESCE((v_row->>'daily_new_words')::INT, 10),
      COALESCE((v_row->>'daily_review_words')::INT, 20),
      COALESCE((v_row->>'daily_minutes')::INT, 30),
      COALESCE((v_row->>'is_sample_data')::BOOLEAN, false),
      COALESCE((v_row->>'created_at')::TIMESTAMPTZ, NOW()),
      NOW()
    ) ON CONFLICT (user_id) DO UPDATE SET
      daily_new_words = EXCLUDED.daily_new_words,
      daily_review_words = EXCLUDED.daily_review_words,
      daily_minutes = EXCLUDED.daily_minutes,
      updated_at = NOW();
    v_restored_counts := jsonb_set(v_restored_counts, '{study_goals}', '1'::JSONB);
  END IF;

  -- 14) expense_categories
  v_table_data := p_backup_data->'expense_categories';
  v_count := 0;
  IF v_table_data IS NOT NULL AND jsonb_typeof(v_table_data) = 'array' THEN
    FOR v_row IN SELECT * FROM jsonb_array_elements(v_table_data) LOOP
      INSERT INTO public.expense_categories (id, user_id, name, icon, color, type, is_default, sort_order, created_at)
      VALUES (
        COALESCE((v_row->>'id')::UUID, gen_random_uuid()),
        p_user_id,
        COALESCE(v_row->>'name', 'Danh mục'),
        COALESCE(v_row->>'icon', '🍜'),
        COALESCE(v_row->>'color', '#FF7A5C'),
        COALESCE(v_row->>'type', 'expense'),
        COALESCE((v_row->>'is_default')::BOOLEAN, false),
        COALESCE((v_row->>'sort_order')::INT, 0),
        COALESCE((v_row->>'created_at')::TIMESTAMPTZ, NOW())
      ) ON CONFLICT (id) DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END IF;
  v_restored_counts := jsonb_set(v_restored_counts, '{expense_categories}', to_jsonb(v_count));

  -- 15) wallets
  v_table_data := p_backup_data->'wallets';
  v_count := 0;
  IF v_table_data IS NOT NULL AND jsonb_typeof(v_table_data) = 'array' THEN
    FOR v_row IN SELECT * FROM jsonb_array_elements(v_table_data) LOOP
      INSERT INTO public.wallets (id, user_id, name, icon, balance, is_default, created_at)
      VALUES (
        COALESCE((v_row->>'id')::UUID, gen_random_uuid()),
        p_user_id,
        COALESCE(v_row->>'name', 'Ví'),
        COALESCE(v_row->>'icon', '💳'),
        COALESCE((v_row->>'balance')::BIGINT, 0),
        COALESCE((v_row->>'is_default')::BOOLEAN, false),
        COALESCE((v_row->>'created_at')::TIMESTAMPTZ, NOW())
      ) ON CONFLICT (id) DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END IF;
  v_restored_counts := jsonb_set(v_restored_counts, '{wallets}', to_jsonb(v_count));

  -- 16) recurring_transactions
  v_table_data := p_backup_data->'recurring_transactions';
  v_count := 0;
  IF v_table_data IS NOT NULL AND jsonb_typeof(v_table_data) = 'array' THEN
    FOR v_row IN SELECT * FROM jsonb_array_elements(v_table_data) LOOP
      INSERT INTO public.recurring_transactions (
        id, user_id, type, amount, category_id, wallet_id, description,
        frequency, next_due_date, is_active, note, anchor_day, anchor_month,
        is_sample_data, created_at, updated_at
      ) VALUES (
        COALESCE((v_row->>'id')::UUID, gen_random_uuid()),
        p_user_id,
        COALESCE(v_row->>'type', 'expense'),
        COALESCE((v_row->>'amount')::BIGINT, 10000),
        (v_row->>'category_id')::UUID,
        (v_row->>'wallet_id')::UUID,
        COALESCE(v_row->>'description', 'Giao dịch định kỳ'),
        COALESCE(v_row->>'frequency', 'monthly'),
        COALESCE((v_row->>'next_due_date')::DATE, CURRENT_DATE),
        COALESCE((v_row->>'is_active')::BOOLEAN, true),
        v_row->>'note',
        (v_row->>'anchor_day')::SMALLINT,
        (v_row->>'anchor_month')::SMALLINT,
        COALESCE((v_row->>'is_sample_data')::BOOLEAN, false),
        COALESCE((v_row->>'created_at')::TIMESTAMPTZ, NOW()),
        COALESCE((v_row->>'updated_at')::TIMESTAMPTZ, NOW())
      ) ON CONFLICT (id) DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END IF;
  v_restored_counts := jsonb_set(v_restored_counts, '{recurring_transactions}', to_jsonb(v_count));

  -- 17) transactions
  v_table_data := p_backup_data->'transactions';
  v_count := 0;
  IF v_table_data IS NOT NULL AND jsonb_typeof(v_table_data) = 'array' THEN
    FOR v_row IN SELECT * FROM jsonb_array_elements(v_table_data) LOOP
      INSERT INTO public.transactions (
        id, user_id, category_id, wallet_id, amount, type, description,
        transaction_date, receipt_url, note, recurring_id, occurrence_date,
        is_sample_data, created_at
      ) VALUES (
        COALESCE((v_row->>'id')::UUID, gen_random_uuid()),
        p_user_id,
        (v_row->>'category_id')::UUID,
        (v_row->>'wallet_id')::UUID,
        COALESCE((v_row->>'amount')::BIGINT, 0),
        COALESCE(v_row->>'type', 'expense'),
        COALESCE(v_row->>'description', 'Chi tiêu'),
        COALESCE((v_row->>'transaction_date')::DATE, CURRENT_DATE),
        v_row->>'receipt_url',
        v_row->>'note',
        (v_row->>'recurring_id')::UUID,
        (v_row->>'occurrence_date')::DATE,
        COALESCE((v_row->>'is_sample_data')::BOOLEAN, false),
        COALESCE((v_row->>'created_at')::TIMESTAMPTZ, NOW())
      ) ON CONFLICT (id) DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END IF;
  v_restored_counts := jsonb_set(v_restored_counts, '{transactions}', to_jsonb(v_count));

  -- 18) budgets
  v_table_data := p_backup_data->'budgets';
  v_count := 0;
  IF v_table_data IS NOT NULL AND jsonb_typeof(v_table_data) = 'array' THEN
    FOR v_row IN SELECT * FROM jsonb_array_elements(v_table_data) LOOP
      INSERT INTO public.budgets (id, user_id, category_id, amount, month, year, created_at, updated_at)
      VALUES (
        COALESCE((v_row->>'id')::UUID, gen_random_uuid()),
        p_user_id,
        (v_row->>'category_id')::UUID,
        COALESCE((v_row->>'amount')::BIGINT, 0),
        COALESCE((v_row->>'month')::INT, EXTRACT(MONTH FROM CURRENT_DATE)::INT),
        COALESCE((v_row->>'year')::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT),
        COALESCE((v_row->>'created_at')::TIMESTAMPTZ, NOW()),
        COALESCE((v_row->>'updated_at')::TIMESTAMPTZ, NOW())
      ) ON CONFLICT (user_id, category_id, month, year) DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END IF;
  v_restored_counts := jsonb_set(v_restored_counts, '{budgets}', to_jsonb(v_count));

  -- 19) daily_checklists
  v_table_data := p_backup_data->'daily_checklists';
  v_count := 0;
  IF v_table_data IS NOT NULL AND jsonb_typeof(v_table_data) = 'array' THEN
    FOR v_row IN SELECT * FROM jsonb_array_elements(v_table_data) LOOP
      INSERT INTO public.daily_checklists (id, user_id, title, is_completed, checklist_date, sort_order, created_at)
      VALUES (
        COALESCE((v_row->>'id')::UUID, gen_random_uuid()),
        p_user_id,
        COALESCE(v_row->>'title', 'Checklist'),
        COALESCE((v_row->>'is_completed')::BOOLEAN, false),
        COALESCE((v_row->>'checklist_date')::DATE, CURRENT_DATE),
        COALESCE((v_row->>'sort_order')::INT, 0),
        COALESCE((v_row->>'created_at')::TIMESTAMPTZ, NOW())
      ) ON CONFLICT (id) DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END IF;
  v_restored_counts := jsonb_set(v_restored_counts, '{daily_checklists}', to_jsonb(v_count));

  -- 20) user_achievements (Map by code if present, otherwise direct achievement_id)
  v_table_data := p_backup_data->'user_achievements';
  v_count := 0;
  IF v_table_data IS NOT NULL AND jsonb_typeof(v_table_data) = 'array' THEN
    FOR v_row IN SELECT * FROM jsonb_array_elements(v_table_data) LOOP
      v_ach_code := v_row->>'achievement_code';
      v_ach_id := (v_row->>'achievement_id')::UUID;
      
      -- If achievement_code exists, look up ID from current DB
      IF v_ach_code IS NOT NULL THEN
        SELECT id INTO v_ach_id FROM public.achievements WHERE code = v_ach_code LIMIT 1;
      END IF;

      IF v_ach_id IS NOT NULL THEN
        INSERT INTO public.user_achievements (id, user_id, achievement_id, unlocked_at)
        VALUES (
          COALESCE((v_row->>'id')::UUID, gen_random_uuid()),
          p_user_id,
          v_ach_id,
          COALESCE((v_row->>'unlocked_at')::TIMESTAMPTZ, NOW())
        ) ON CONFLICT (user_id, achievement_id) DO NOTHING;
        v_count := v_count + 1;
      END IF;
    END LOOP;
  END IF;
  v_restored_counts := jsonb_set(v_restored_counts, '{user_achievements}', to_jsonb(v_count));

  -- 21) weekly_reviews
  v_table_data := p_backup_data->'weekly_reviews';
  v_count := 0;
  IF v_table_data IS NOT NULL AND jsonb_typeof(v_table_data) = 'array' THEN
    FOR v_row IN SELECT * FROM jsonb_array_elements(v_table_data) LOOP
      INSERT INTO public.weekly_reviews (id, user_id, week_start, summary, goals_met, notes, created_at)
      VALUES (
        COALESCE((v_row->>'id')::UUID, gen_random_uuid()),
        p_user_id,
        COALESCE((v_row->>'week_start')::DATE, CURRENT_DATE),
        COALESCE(v_row->'summary', '{}'::JSONB),
        COALESCE(v_row->'goals_met', '{}'::JSONB),
        v_row->>'notes',
        COALESCE((v_row->>'created_at')::TIMESTAMPTZ, NOW())
      ) ON CONFLICT (user_id, week_start) DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END IF;
  v_restored_counts := jsonb_set(v_restored_counts, '{weekly_reviews}', to_jsonb(v_count));

  -- 22) data_import_jobs
  v_table_data := p_backup_data->'data_import_jobs';
  v_count := 0;
  IF v_table_data IS NOT NULL AND jsonb_typeof(v_table_data) = 'array' THEN
    FOR v_row IN SELECT * FROM jsonb_array_elements(v_table_data) LOOP
      INSERT INTO public.data_import_jobs (id, user_id, source_url, status, total_items, imported_items, error_message, created_at, completed_at)
      VALUES (
        COALESCE((v_row->>'id')::UUID, gen_random_uuid()),
        p_user_id,
        COALESCE(v_row->>'source_url', ''),
        COALESCE(v_row->>'status', 'completed'),
        COALESCE((v_row->>'total_items')::INT, 0),
        COALESCE((v_row->>'imported_items')::INT, 0),
        v_row->>'error_message',
        COALESCE((v_row->>'created_at')::TIMESTAMPTZ, NOW()),
        (v_row->>'completed_at')::TIMESTAMPTZ
      ) ON CONFLICT (id) DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END IF;
  v_restored_counts := jsonb_set(v_restored_counts, '{data_import_jobs}', to_jsonb(v_count));

  -- 23) user_xp_logs
  v_table_data := p_backup_data->'user_xp_logs';
  v_count := 0;
  IF v_table_data IS NOT NULL AND jsonb_typeof(v_table_data) = 'array' THEN
    FOR v_row IN SELECT * FROM jsonb_array_elements(v_table_data) LOOP
      INSERT INTO public.user_xp_logs (id, user_id, amount, action_type, reference_id, created_at)
      VALUES (
        COALESCE((v_row->>'id')::UUID, gen_random_uuid()),
        p_user_id,
        LEAST(100, GREATEST(1, COALESCE((v_row->>'amount')::INT, 10))),
        COALESCE(v_row->>'action_type', 'legacy_import'),
        v_row->>'reference_id',
        COALESCE((v_row->>'created_at')::TIMESTAMPTZ, NOW())
      ) ON CONFLICT (id) DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END IF;
  v_restored_counts := jsonb_set(v_restored_counts, '{user_xp_logs}', to_jsonb(v_count));

  RETURN jsonb_build_object(
    'success', true,
    'counts', v_restored_counts
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoke from public/anon, grant to authenticated only
REVOKE EXECUTE ON FUNCTION public.restore_user_data(UUID, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.restore_user_data(UUID, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.restore_user_data(UUID, JSONB) TO authenticated;
