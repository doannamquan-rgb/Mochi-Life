-- ============================================================
-- Mochi Life - Migration 007: Data Sync & Course Integrity Fix
-- ============================================================

BEGIN;

-- 1. Ensure active_hsk_course_id exists in user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS active_hsk_course_id UUID REFERENCES public.hsk_courses(id) ON DELETE SET NULL;

-- 2. Ensure course_id exists in hsk_vocabulary & hsk_grammar
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

-- 4. Backfill any remaining orphan vocabulary (lesson_id is NULL and course_id is NULL)
-- Assign to the user's active_hsk_course_id or earliest course
UPDATE public.hsk_vocabulary v
SET course_id = COALESCE(
  p.active_hsk_course_id,
  (SELECT id FROM public.hsk_courses c WHERE c.user_id = v.user_id ORDER BY c.created_at ASC LIMIT 1)
)
FROM public.user_profiles p
WHERE v.user_id = p.user_id AND v.course_id IS NULL;

-- 5. Backfill default active_hsk_course_id for user_profiles if NULL
UPDATE public.user_profiles p
SET active_hsk_course_id = (
  SELECT id FROM public.hsk_courses c WHERE c.user_id = p.user_id ORDER BY c.created_at ASC LIMIT 1
)
WHERE p.active_hsk_course_id IS NULL;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_hsk_vocabulary_course ON public.hsk_vocabulary(course_id);
CREATE INDEX IF NOT EXISTS idx_hsk_grammar_course ON public.hsk_grammar(course_id);
CREATE INDEX IF NOT EXISTS idx_hsk_vocabulary_memory_level ON public.hsk_vocabulary(memory_level);

COMMIT;
