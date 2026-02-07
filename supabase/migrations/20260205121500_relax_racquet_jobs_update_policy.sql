-- Temporary RLS relaxation for racquet_jobs updates while roles are not fully implemented.
-- Required for Admin "Mark as Paid" and status updates to work (anon key must be able to UPDATE racquet_jobs).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'racquet_jobs'
      AND policyname = 'Front desk and admin can update racquet_jobs'
  ) THEN
    DROP POLICY "Front desk and admin can update racquet_jobs" ON public.racquet_jobs;
  END IF;
END $$;

-- Restore permissive MVP-style update policy so Admin UI continues to work.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'racquet_jobs'
      AND policyname = 'Anyone can update racquet_jobs'
  ) THEN
    CREATE POLICY "Anyone can update racquet_jobs"
      ON public.racquet_jobs FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

