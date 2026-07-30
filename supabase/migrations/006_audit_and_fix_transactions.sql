-- ============================================================
-- Mochi Life - Migration 006: Audit & Fix Transactions Schema Integrity
-- ============================================================

BEGIN;

-- 1. Audit block to inspect existing data integrity
DO $$
DECLARE
  v_null_types INTEGER;
  v_null_amounts INTEGER;
  v_invalid_types INTEGER;
  v_negative_amounts INTEGER;
BEGIN
  -- Count invalid or NULL transaction types
  SELECT COUNT(*) INTO v_null_types FROM public.transactions WHERE type IS NULL;
  SELECT COUNT(*) INTO v_null_amounts FROM public.transactions WHERE amount IS NULL;
  SELECT COUNT(*) INTO v_invalid_types FROM public.transactions WHERE type IS NOT NULL AND type NOT IN ('expense', 'income');
  SELECT COUNT(*) INTO v_negative_amounts FROM public.transactions WHERE amount IS NOT NULL AND amount < 0;

  RAISE NOTICE '=== TRANSACTIONS INTEGRITY AUDIT ===';
  RAISE NOTICE 'NULL transaction types: %', v_null_types;
  RAISE NOTICE 'NULL transaction amounts: %', v_null_amounts;
  RAISE NOTICE 'Invalid transaction types (not expense/income): %', v_invalid_types;
  RAISE NOTICE 'Negative amounts to normalize: %', v_negative_amounts;

  -- Fail safely if there are unresolvable NULL types or invalid type values
  IF v_null_types > 0 OR v_null_amounts > 0 OR v_invalid_types > 0 THEN
    RAISE EXCEPTION 'Migration aborted: Found % NULL types, % NULL amounts, % invalid types requiring manual review.',
      v_null_types, v_null_amounts, v_invalid_types;
  END IF;
END $$;

-- 2. Safe normalization of valid negative amounts to positive
UPDATE public.transactions
SET amount = ABS(amount)
WHERE amount < 0;

-- 3. Enforce NOT NULL on type and amount if not already set
ALTER TABLE public.transactions ALTER COLUMN type SET NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN amount SET NOT NULL;

-- 4. Guarded CHECK constraint for transaction type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'transactions'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%type%'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT chk_transactions_type CHECK (type IN ('expense', 'income'));
    RAISE NOTICE 'Added constraint chk_transactions_type';
  ELSE
    RAISE NOTICE 'Constraint for transactions type already exists, skipping.';
  END IF;
END $$;

-- 5. Guarded CHECK constraint for positive transaction amount
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'transactions'
      AND c.contype = 'c'
      AND (pg_get_constraintdef(c.oid) LIKE '%amount > 0%' OR pg_get_constraintdef(c.oid) LIKE '%amount >= 0%')
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT chk_transactions_positive_amount CHECK (amount > 0);
    RAISE NOTICE 'Added constraint chk_transactions_positive_amount';
  ELSE
    RAISE NOTICE 'Constraint for positive transaction amount already exists, skipping.';
  END IF;
END $$;

COMMIT;
