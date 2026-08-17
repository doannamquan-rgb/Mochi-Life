-- ==============================================================================
-- Migration 013: Selective Realtime Publication for Cross-Platform Sync
-- Target Tables: transactions, weight_logs, exercise_logs, hsk_vocabulary,
--                study_sessions, daily_checklists, user_xp_logs, user_achievements
--
-- Note: Idempotent - Checks existence in pg_publication_tables before adding.
-- Does NOT blindly recreate supabase_realtime publication.
-- ==============================================================================

DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'transactions',
    'weight_logs',
    'exercise_logs',
    'hsk_vocabulary',
    'study_sessions',
    'daily_checklists',
    'user_xp_logs',
    'user_achievements'
  ];
BEGIN
  -- 1. Ensure supabase_realtime publication exists on Supabase instance
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE EXCEPTION 'Publication supabase_realtime does not exist on target database. Manual inspection required.';
  END IF;

  -- 2. Add each table if not already a member of the publication
  FOREACH tbl IN ARRAY tbls LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
      RAISE NOTICE 'Added table public.% to publication supabase_realtime', tbl;
    ELSE
      RAISE NOTICE 'Table public.% is already in publication supabase_realtime, skipping', tbl;
    END IF;
  END LOOP;
END $$;
