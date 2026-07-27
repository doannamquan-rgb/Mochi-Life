-- ============================================================
-- Mochi Life - Migration 002: Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hsk_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hsk_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hsk_vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hsk_grammar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grammar_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_import_jobs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USER PROFILES POLICIES
-- ============================================================
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- HELPER: Generic user-scoped policies macro
-- ============================================================
-- We'll create policies for each table individually for clarity

-- WEIGHT GOALS
CREATE POLICY "Users manage own weight goals" ON public.weight_goals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- WEIGHT LOGS
CREATE POLICY "Users manage own weight logs" ON public.weight_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- FITNESS GOALS
CREATE POLICY "Users manage own fitness goals" ON public.fitness_goals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- EXERCISE LOGS
CREATE POLICY "Users manage own exercise logs" ON public.exercise_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- HSK COURSES
CREATE POLICY "Users manage own hsk courses" ON public.hsk_courses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- HSK LESSONS
CREATE POLICY "Users manage own hsk lessons" ON public.hsk_lessons
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- HSK VOCABULARY
CREATE POLICY "Users manage own vocabulary" ON public.hsk_vocabulary
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- HSK GRAMMAR
CREATE POLICY "Users manage own grammar" ON public.hsk_grammar
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- VOCABULARY REVIEWS
CREATE POLICY "Users manage own vocab reviews" ON public.vocabulary_reviews
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- GRAMMAR REVIEWS
CREATE POLICY "Users manage own grammar reviews" ON public.grammar_reviews
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- STUDY SESSIONS
CREATE POLICY "Users manage own study sessions" ON public.study_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- STUDY GOALS
CREATE POLICY "Users manage own study goals" ON public.study_goals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- EXPENSE CATEGORIES
CREATE POLICY "Users manage own expense categories" ON public.expense_categories
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- WALLETS
CREATE POLICY "Users manage own wallets" ON public.wallets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- TRANSACTIONS
CREATE POLICY "Users manage own transactions" ON public.transactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- BUDGETS
CREATE POLICY "Users manage own budgets" ON public.budgets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RECURRING TRANSACTIONS
CREATE POLICY "Users manage own recurring transactions" ON public.recurring_transactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- DAILY CHECKLISTS
CREATE POLICY "Users manage own checklists" ON public.daily_checklists
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ACHIEVEMENTS (read-only for all authenticated users)
CREATE POLICY "All users can view achievements" ON public.achievements
  FOR SELECT USING (auth.role() = 'authenticated');

-- USER ACHIEVEMENTS
CREATE POLICY "Users manage own user achievements" ON public.user_achievements
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- WEEKLY REVIEWS
CREATE POLICY "Users manage own weekly reviews" ON public.weekly_reviews
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- DATA IMPORT JOBS
CREATE POLICY "Users manage own import jobs" ON public.data_import_jobs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKET FOR IMAGES
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mochi-uploads',
  'mochi-uploads',
  false,
  5242880, -- 5MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users upload own files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'mochi-uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users view own files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'mochi-uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'mochi-uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
