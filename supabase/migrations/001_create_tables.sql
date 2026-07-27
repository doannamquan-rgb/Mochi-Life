-- ============================================================
-- Mochi Life - Database Migration 001
-- Creates all tables for the personal goal management app
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USER PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  height_cm NUMERIC(5,1),
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  activity_level TEXT DEFAULT 'light' CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  weight_unit TEXT DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lbs')),
  currency TEXT DEFAULT 'VND',
  timezone TEXT DEFAULT 'Asia/Ho_Chi_Minh',
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  animations_enabled BOOLEAN DEFAULT true,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WEIGHT GOALS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.weight_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  starting_weight NUMERIC(5,1) NOT NULL,
  current_weight NUMERIC(5,1),
  target_weight NUMERIC(5,1) NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_date DATE,
  daily_calorie_goal INTEGER DEFAULT 500,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WEIGHT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  weight NUMERIC(5,1) NOT NULL,
  waist_cm NUMERIC(5,1),
  hip_cm NUMERIC(5,1),
  note TEXT,
  photo_url TEXT,
  is_sample_data BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date ON public.weight_logs(user_id, log_date DESC);

-- ============================================================
-- FITNESS GOALS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fitness_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  weekly_sessions INTEGER DEFAULT 4,
  weekly_minutes INTEGER DEFAULT 150,
  weekly_calories INTEGER DEFAULT 2000,
  daily_steps INTEGER DEFAULT 8000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EXERCISE LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  exercise_type TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  calories_burned INTEGER CHECK (calories_burned >= 0),
  calories_is_estimate BOOLEAN DEFAULT true,
  intensity TEXT DEFAULT 'moderate' CHECK (intensity IN ('light', 'moderate', 'high')),
  distance_km NUMERIC(6,2),
  steps INTEGER,
  note TEXT,
  is_sample_data BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercise_logs_user_date ON public.exercise_logs(user_id, log_date DESC);

-- ============================================================
-- HSK COURSES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hsk_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  level TEXT DEFAULT 'HSK3',
  description TEXT,
  total_lessons INTEGER DEFAULT 0,
  total_vocabulary INTEGER DEFAULT 0,
  total_grammar INTEGER DEFAULT 0,
  source_url TEXT,
  is_sample_data BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HSK LESSONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hsk_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.hsk_courses(id) ON DELETE CASCADE NOT NULL,
  lesson_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  chapter TEXT,
  topic TEXT,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'needs_review', 'mastered')),
  start_date DATE,
  completion_date DATE,
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  note TEXT,
  is_sample_data BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hsk_lessons_course ON public.hsk_lessons(course_id);

-- ============================================================
-- HSK VOCABULARY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hsk_vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.hsk_lessons(id) ON DELETE SET NULL,
  hanzi TEXT NOT NULL,
  pinyin TEXT NOT NULL,
  meaning TEXT NOT NULL,
  word_type TEXT,
  example_cn TEXT,
  example_pinyin TEXT,
  example_vi TEXT,
  topic TEXT,
  memory_level TEXT DEFAULT 'not_learned' CHECK (memory_level IN ('not_learned', 'hard', 'learning', 'learned', 'mastered')),
  first_learned_at TIMESTAMPTZ,
  last_reviewed_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ DEFAULT NOW(),
  correct_count INTEGER DEFAULT 0,
  incorrect_count INTEGER DEFAULT 0,
  note TEXT,
  is_favorite BOOLEAN DEFAULT false,
  sr_interval_days INTEGER DEFAULT 0,
  sr_ease_factor NUMERIC(4,2) DEFAULT 2.50,
  sr_repetitions INTEGER DEFAULT 0,
  is_sample_data BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hsk_vocabulary_user ON public.hsk_vocabulary(user_id);
CREATE INDEX IF NOT EXISTS idx_hsk_vocabulary_lesson ON public.hsk_vocabulary(lesson_id);
CREATE INDEX IF NOT EXISTS idx_hsk_vocabulary_review ON public.hsk_vocabulary(user_id, next_review_at);

-- ============================================================
-- HSK GRAMMAR
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hsk_grammar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.hsk_lessons(id) ON DELETE SET NULL,
  structure_name TEXT NOT NULL,
  formula TEXT,
  meaning TEXT NOT NULL,
  usage_desc TEXT,
  example_cn TEXT,
  example_pinyin TEXT,
  example_vi TEXT,
  notes TEXT,
  common_mistakes TEXT,
  status TEXT DEFAULT 'not_learned' CHECK (status IN ('not_learned', 'in_progress', 'learned', 'mastered')),
  learned_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ DEFAULT NOW(),
  sr_interval_days INTEGER DEFAULT 0,
  sr_ease_factor NUMERIC(4,2) DEFAULT 2.50,
  sr_repetitions INTEGER DEFAULT 0,
  is_sample_data BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hsk_grammar_user ON public.hsk_grammar(user_id);

-- ============================================================
-- VOCABULARY REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vocabulary_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vocabulary_id UUID REFERENCES public.hsk_vocabulary(id) ON DELETE CASCADE NOT NULL,
  review_date TIMESTAMPTZ DEFAULT NOW(),
  rating TEXT CHECK (rating IN ('forgot', 'hard', 'remembered', 'easy')) NOT NULL,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vocab_reviews_user ON public.vocabulary_reviews(user_id, review_date DESC);

-- ============================================================
-- GRAMMAR REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.grammar_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  grammar_id UUID REFERENCES public.hsk_grammar(id) ON DELETE CASCADE NOT NULL,
  review_date TIMESTAMPTZ DEFAULT NOW(),
  rating TEXT CHECK (rating IN ('forgot', 'hard', 'remembered', 'easy')) NOT NULL,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STUDY SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_date DATE NOT NULL,
  new_words_count INTEGER DEFAULT 0,
  reviewed_words_count INTEGER DEFAULT 0,
  grammar_points_count INTEGER DEFAULT 0,
  lessons_completed INTEGER DEFAULT 0,
  duration_minutes INTEGER DEFAULT 0,
  lesson_name TEXT,
  quiz_score NUMERIC(5,2),
  note TEXT,
  is_auto_generated BOOLEAN DEFAULT false,
  is_sample_data BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_date ON public.study_sessions(user_id, session_date DESC);

-- ============================================================
-- STUDY GOALS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.study_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  daily_new_words INTEGER DEFAULT 10,
  daily_review_words INTEGER DEFAULT 20,
  daily_minutes INTEGER DEFAULT 30,
  current_hsk_level TEXT DEFAULT 'HSK3',
  current_proficiency TEXT DEFAULT 'beginner',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EXPENSE CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('expense', 'income')) NOT NULL,
  icon TEXT DEFAULT 'circle',
  color TEXT DEFAULT '#B8A089',
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  is_sample_data BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_user ON public.expense_categories(user_id, type);

-- ============================================================
-- WALLETS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'cash' CHECK (type IN ('cash', 'bank', 'ewallet', 'credit_card', 'other')),
  balance BIGINT DEFAULT 0,
  icon TEXT DEFAULT 'wallet',
  color TEXT DEFAULT '#B8A089',
  is_default BOOLEAN DEFAULT false,
  is_sample_data BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RECURRING TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.recurring_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('expense', 'income')) NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')) NOT NULL,
  next_due_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  note TEXT,
  is_sample_data BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('expense', 'income')) NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  transaction_date DATE NOT NULL,
  transaction_time TIME,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
  payment_method TEXT,
  description TEXT,
  note TEXT,
  receipt_url TEXT,
  recurring_id UUID REFERENCES public.recurring_transactions(id) ON DELETE SET NULL,
  is_sample_data BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(user_id, type);

-- ============================================================
-- BUDGETS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  is_total_budget BOOLEAN DEFAULT false,
  alert_50 BOOLEAN DEFAULT true,
  alert_80 BOOLEAN DEFAULT true,
  alert_90 BOOLEAN DEFAULT true,
  alert_100 BOOLEAN DEFAULT true,
  cycle_start_day INTEGER DEFAULT 1 CHECK (cycle_start_day >= 1 AND cycle_start_day <= 28),
  is_sample_data BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category_id, month, year)
);

-- ============================================================
-- DAILY CHECKLISTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.daily_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  checklist_date DATE NOT NULL,
  item_text TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  category TEXT CHECK (category IN ('fitness', 'study', 'expense', 'other')) DEFAULT 'other',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_checklists_user_date ON public.daily_checklists(user_id, checklist_date);

-- ============================================================
-- ACHIEVEMENTS (global definitions)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏆',
  category TEXT CHECK (category IN ('fitness', 'study', 'expense', 'general')) DEFAULT 'general',
  condition_type TEXT NOT NULL,
  condition_value INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USER ACHIEVEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- ============================================================
-- WEEKLY REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  what_went_well TEXT,
  what_blocked TEXT,
  improvement_plan TEXT,
  top_priority TEXT,
  auto_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- ============================================================
-- DATA IMPORT JOBS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.data_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source_url TEXT,
  source_type TEXT CHECK (source_type IN ('csv', 'json', 'manual', 'paste', 'url')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  lessons_imported INTEGER DEFAULT 0,
  vocabulary_imported INTEGER DEFAULT 0,
  grammar_imported INTEGER DEFAULT 0,
  error_message TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'user_profiles', 'weight_goals', 'weight_logs', 'fitness_goals', 'exercise_logs',
    'hsk_courses', 'hsk_lessons', 'hsk_vocabulary', 'hsk_grammar',
    'study_sessions', 'study_goals', 'expense_categories', 'wallets',
    'transactions', 'budgets', 'recurring_transactions', 'daily_checklists',
    'weekly_reviews', 'data_import_jobs'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trigger_updated_at ON public.%I;
       CREATE TRIGGER trigger_updated_at
       BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();',
      t, t
    );
  END LOOP;
END;
$$;

-- ============================================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
