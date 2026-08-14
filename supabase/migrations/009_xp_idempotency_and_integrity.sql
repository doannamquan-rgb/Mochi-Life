-- Migration 009: XP Idempotency and Integrity

-- Add unique partial index for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_xp_logs_idempotency
ON public.user_xp_logs(user_id, action_type, reference_id)
WHERE reference_id IS NOT NULL;

-- Add CHECK constraint on amount (drop existing if needed, add new)
ALTER TABLE public.user_xp_logs DROP CONSTRAINT IF EXISTS user_xp_logs_amount_check;
ALTER TABLE public.user_xp_logs ADD CONSTRAINT user_xp_logs_amount_check CHECK (amount > 0 AND amount <= 100);

-- Add a useful index for recurring transactions
CREATE INDEX IF NOT EXISTS idx_transactions_recurring_id
ON public.transactions(recurring_id)
WHERE recurring_id IS NOT NULL;

-- Add index for lessons by user+course
CREATE INDEX IF NOT EXISTS idx_hsk_lessons_user_course
ON public.hsk_lessons(user_id, course_id);
