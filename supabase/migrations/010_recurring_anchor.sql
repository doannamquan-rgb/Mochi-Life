-- Migration 010: Add anchor fields for recurring transaction date calculation
-- Prevents monthly date drift (e.g., Jan 31 → Feb 28 → Mar 28 instead of Mar 31)

-- Add anchor_day (1-31) for monthly recurrence
ALTER TABLE public.recurring_transactions ADD COLUMN IF NOT EXISTS anchor_day SMALLINT;

-- Add anchor_month (1-12) for yearly recurrence  
ALTER TABLE public.recurring_transactions ADD COLUMN IF NOT EXISTS anchor_month SMALLINT;

-- Backfill existing rows from next_due_date
UPDATE public.recurring_transactions 
SET 
  anchor_day = EXTRACT(DAY FROM next_due_date)::SMALLINT,
  anchor_month = EXTRACT(MONTH FROM next_due_date)::SMALLINT
WHERE anchor_day IS NULL;

-- Add constraints (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recurring_anchor_day_range') THEN
    ALTER TABLE public.recurring_transactions ADD CONSTRAINT recurring_anchor_day_range CHECK (anchor_day IS NULL OR (anchor_day >= 1 AND anchor_day <= 31));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recurring_anchor_month_range') THEN
    ALTER TABLE public.recurring_transactions ADD CONSTRAINT recurring_anchor_month_range CHECK (anchor_month IS NULL OR (anchor_month >= 1 AND anchor_month <= 12));
  END IF;
END $$;
