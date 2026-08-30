-- ==============================================================================
-- Migration 015: Calorie Intake Tracking Table
-- ==============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.calorie_intake_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  calories INTEGER NOT NULL CHECK (calories > 0),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by user and date range
CREATE INDEX IF NOT EXISTS idx_calorie_intake_user_date 
  ON public.calorie_intake_entries(user_id, date DESC);

-- Enable RLS
ALTER TABLE public.calorie_intake_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY Users can view their own calorie intake entries
  ON public.calorie_intake_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY Users can insert their own calorie intake entries
  ON public.calorie_intake_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY Users can update their own calorie intake entries
  ON public.calorie_intake_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY Users can delete their own calorie intake entries
  ON public.calorie_intake_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Auto updated_at Trigger
DROP TRIGGER IF EXISTS trigger_updated_at ON public.calorie_intake_entries;
CREATE TRIGGER trigger_updated_at
  BEFORE UPDATE ON public.calorie_intake_entries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add to Realtime Publication if available
DO 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'calorie_intake_entries'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.calorie_intake_entries;
    END IF;
  END IF;
END ;

COMMIT;
