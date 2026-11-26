-- Repair the wallet snapshot migration without changing the historical migration 016.
-- Safe to run after 016 was applied, or when its syntax error rolled back its transaction.
BEGIN;

CREATE TABLE IF NOT EXISTS public.wallet_balance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance BIGINT NOT NULL,
  as_of_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_snapshots_wallet_date
  ON public.wallet_balance_snapshots(wallet_id, as_of_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_snapshots_user
  ON public.wallet_balance_snapshots(user_id);

ALTER TABLE public.wallet_balance_snapshots ENABLE ROW LEVEL SECURITY;

-- Remove any earlier policies on this table so a permissive policy cannot be ORed
-- with the ownership policies below.
DO $repair$
DECLARE
  existing_policy RECORD;
BEGIN
  FOR existing_policy IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'wallet_balance_snapshots'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.wallet_balance_snapshots', existing_policy.policyname);
  END LOOP;
END;
$repair$;

CREATE POLICY wallet_snapshots_select_own
  ON public.wallet_balance_snapshots FOR SELECT
  USING (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM public.wallets w WHERE w.id = wallet_id AND w.user_id = auth.uid()
    )
  );
CREATE POLICY wallet_snapshots_insert_own
  ON public.wallet_balance_snapshots FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM public.wallets w WHERE w.id = wallet_id AND w.user_id = auth.uid()
    )
  );
CREATE POLICY wallet_snapshots_update_own
  ON public.wallet_balance_snapshots FOR UPDATE
  USING (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM public.wallets w WHERE w.id = wallet_id AND w.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM public.wallets w WHERE w.id = wallet_id AND w.user_id = auth.uid()
    )
  );
CREATE POLICY wallet_snapshots_delete_own
  ON public.wallet_balance_snapshots FOR DELETE
  USING (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM public.wallets w WHERE w.id = wallet_id AND w.user_id = auth.uid()
    )
  );

DO $publication$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'wallet_balance_snapshots'
    ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_balance_snapshots;
  END IF;
END;
$publication$;

COMMIT;
