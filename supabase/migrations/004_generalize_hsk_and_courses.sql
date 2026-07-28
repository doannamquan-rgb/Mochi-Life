-- ============================================================
-- Mochi Life - Migration 004: Generalize HSK & Course Support
-- ============================================================

-- 1. Add active_hsk_course_id to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS active_hsk_course_id UUID REFERENCES public.hsk_courses(id) ON DELETE SET NULL;

-- 2. Add course_id to hsk_vocabulary & hsk_grammar
ALTER TABLE public.hsk_vocabulary
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.hsk_courses(id) ON DELETE CASCADE;

ALTER TABLE public.hsk_grammar
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.hsk_courses(id) ON DELETE CASCADE;

-- 3. Backfill course_id from lesson_id where possible
UPDATE public.hsk_vocabulary v
SET course_id = l.course_id
FROM public.hsk_lessons l
WHERE v.lesson_id = l.id AND v.course_id IS NULL;

UPDATE public.hsk_grammar g
SET course_id = l.course_id
FROM public.hsk_lessons l
WHERE g.lesson_id = l.id AND g.course_id IS NULL;

-- 4. Create indexes for course_id
CREATE INDEX IF NOT EXISTS idx_hsk_vocabulary_course ON public.hsk_vocabulary(course_id);
CREATE INDEX IF NOT EXISTS idx_hsk_grammar_course ON public.hsk_grammar(course_id);

-- 5. Add unique constraint for recurring transaction occurrence idempotency
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS occurrence_date DATE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_recurring_occurrence
ON public.transactions(recurring_id, occurrence_date)
WHERE recurring_id IS NOT NULL AND occurrence_date IS NOT NULL;
