-- ==============================================================================
-- Migration 016: Wallet Balance Snapshots
-- ==============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.wallet_balance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance BIGINT NOT NULL,
  as_of_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compound Index for fast lookup of latest snapshot as of a given date
CREATE INDEX IF NOT EXISTS idx_wallet_snapshots_wallet_date 
  ON public.wallet_balance_snapshots(wallet_id, as_of_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_snapshots_user 
  ON public.wallet_balance_snapshots(user_id);

-- Enable RLS
ALTER TABLE public.wallet_balance_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY Users can view their own wallet snapshots
  ON public.wallet_balance_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY Users can insert their own wallet snapshots
  ON public.wallet_balance_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY Users can update their own wallet snapshots
  ON public.wallet_balance_snapshots FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY Users can delete their own wallet snapshots
  ON public.wallet_balance_snapshots FOR DELETE
  USING (auth.uid() = user_id);

-- Add to Realtime Publication if available
DO 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'wallet_balance_snapshots'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_balance_snapshots;
    END IF;
  END IF;
END ;

COMMIT;
