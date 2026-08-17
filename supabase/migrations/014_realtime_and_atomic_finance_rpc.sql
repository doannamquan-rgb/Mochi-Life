-- ==============================================================================
-- Migration 014: Atomic Financial Transactions RPC & Full Realtime Publication
--
-- 1. record_transaction_atomic: Creates transaction and updates wallet balance
--    within a single atomic DB transaction with row-level locks.
-- 2. delete_transaction_atomic: Reverses wallet delta and deletes transaction.
-- 3. Enables Supabase Realtime publication on all user-facing tables.
-- ==============================================================================

BEGIN;

-- ─── 1. RPC: record_transaction_atomic ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.record_transaction_atomic(
  p_user_id UUID,
  p_type TEXT,
  p_amount NUMERIC,
  p_transaction_date DATE,
  p_wallet_id UUID DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_inserted_tx RECORD;
  v_wallet RECORD;
  v_delta NUMERIC;
BEGIN
  -- 1. Security Check: Authenticated user must match requested user_id
  IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: User ID mismatch or not authenticated';
  END IF;

  -- 2. Validation
  IF p_type NOT IN ('expense', 'income') THEN
    RAISE EXCEPTION 'Invalid transaction type: %, must be expense or income', p_type;
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Transaction amount must be strictly positive';
  END IF;

  IF p_transaction_date IS NULL THEN
    RAISE EXCEPTION 'Transaction date is required';
  END IF;

  -- 3. Validate and Lock Wallet (if provided)
  IF p_wallet_id IS NOT NULL THEN
    SELECT * INTO v_wallet
    FROM public.wallets
    WHERE id = p_wallet_id AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Wallet % not found or does not belong to user', p_wallet_id;
    END IF;
  END IF;

  -- 4. Validate Category (if provided)
  IF p_category_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.expense_categories
      WHERE id = p_category_id AND user_id = p_user_id
    ) THEN
      RAISE EXCEPTION 'Category % not found or does not belong to user', p_category_id;
    END IF;
  END IF;

  -- 5. Insert Transaction
  INSERT INTO public.transactions (
    user_id,
    type,
    amount,
    transaction_date,
    wallet_id,
    category_id,
    description,
    note,
    payment_method,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    p_type,
    p_amount,
    p_transaction_date,
    p_wallet_id,
    p_category_id,
    p_description,
    p_note,
    p_payment_method,
    NOW(),
    NOW()
  )
  RETURNING * INTO v_inserted_tx;

  -- 6. Atomically update wallet balance
  IF p_wallet_id IS NOT NULL THEN
    v_delta := CASE WHEN p_type = 'income' THEN p_amount ELSE -p_amount END;

    UPDATE public.wallets
    SET
      balance = COALESCE(balance, 0) + v_delta,
      updated_at = NOW()
    WHERE id = p_wallet_id;
  END IF;

  -- 7. Return inserted transaction as JSON
  RETURN to_jsonb(v_inserted_tx);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.record_transaction_atomic(UUID, TEXT, NUMERIC, DATE, UUID, UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_transaction_atomic(UUID, TEXT, NUMERIC, DATE, UUID, UUID, TEXT, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_transaction_atomic(UUID, TEXT, NUMERIC, DATE, UUID, UUID, TEXT, TEXT, TEXT) TO authenticated;


-- ─── 2. RPC: delete_transaction_atomic ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.delete_transaction_atomic(
  p_user_id UUID,
  p_transaction_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_tx RECORD;
  v_reverse_delta NUMERIC;
BEGIN
  -- 1. Security Check
  IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: User ID mismatch or not authenticated';
  END IF;

  -- 2. Lock and fetch transaction
  SELECT * INTO v_tx
  FROM public.transactions
  WHERE id = p_transaction_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction % not found or does not belong to user', p_transaction_id;
  END IF;

  -- 3. Reverse wallet balance atomically if wallet was assigned
  IF v_tx.wallet_id IS NOT NULL THEN
    -- If deleted tx was expense, balance increases by amount; if income, balance decreases
    v_reverse_delta := CASE WHEN v_tx.type = 'expense' THEN v_tx.amount ELSE -v_tx.amount END;

    UPDATE public.wallets
    SET
      balance = COALESCE(balance, 0) + v_reverse_delta,
      updated_at = NOW()
    WHERE id = v_tx.wallet_id AND user_id = p_user_id;
  END IF;

  -- 4. Delete the transaction
  DELETE FROM public.transactions
  WHERE id = p_transaction_id AND user_id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.delete_transaction_atomic(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_transaction_atomic(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_transaction_atomic(UUID, UUID) TO authenticated;


-- ─── 3. Full Realtime Publication for Cross-Platform Sync ───────────────────────

DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'user_profiles',
    'wallets',
    'expense_categories',
    'budgets',
    'recurring_transactions',
    'transactions',
    'weight_goals',
    'weight_logs',
    'fitness_goals',
    'exercise_logs',
    'hsk_courses',
    'hsk_lessons',
    'hsk_vocabulary',
    'hsk_grammar',
    'vocabulary_reviews',
    'grammar_reviews',
    'study_sessions',
    'study_goals',
    'daily_checklists',
    'user_xp_logs',
    'user_achievements'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH tbl IN ARRAY tbls LOOP
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = tbl
      ) THEN
        IF NOT EXISTS (
          SELECT 1 FROM pg_publication_tables 
          WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
        ) THEN
          EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
          RAISE NOTICE 'Added table public.% to publication supabase_realtime', tbl;
        END IF;
      END IF;
    END LOOP;
  END IF;
END $$;

COMMIT;
