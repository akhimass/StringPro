-- Add payment and pricing fields for StringPro (CAN-AM implementation)

-- 1) Extend racquet_jobs with payment fields
ALTER TABLE public.racquet_jobs
  ADD COLUMN amount_due NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid',
  ADD COLUMN paid_at TIMESTAMPTZ,
  ADD COLUMN paid_by_staff TEXT;

ALTER TABLE public.racquet_jobs
  ADD CONSTRAINT racquet_jobs_payment_status_check
  CHECK (payment_status IN ('unpaid', 'paid'));

-- 2) Extend strings with price
ALTER TABLE public.strings
  ADD COLUMN price NUMERIC NOT NULL DEFAULT 0;

-- 3) Optional status_events table for audit timeline
CREATE TABLE IF NOT EXISTS public.status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.racquet_jobs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  staff_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status_events_job_id
  ON public.status_events(job_id);

ALTER TABLE public.status_events ENABLE ROW LEVEL SECURITY;

-- Allow read/insert for now (role-specific tightening can be added when auth roles are wired)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'status_events'
      AND policyname = 'Anyone can view status_events'
  ) THEN
    CREATE POLICY "Anyone can view status_events"
      ON public.status_events FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'status_events'
      AND policyname = 'Anyone can insert status_events'
  ) THEN
    CREATE POLICY "Anyone can insert status_events"
      ON public.status_events FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- 4) RLS tightening for payment fields on racquet_jobs
-- Drop the broad update policy so public clients cannot update jobs (including payment fields).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'racquet_jobs'
      AND policyname = 'Anyone can update racquet_jobs'
  ) THEN
    DROP POLICY "Anyone can update racquet_jobs" ON public.racquet_jobs;
  END IF;
END $$;

-- Only front_desk and admin roles may update racquet_jobs (including payment_* fields).
-- This assumes Supabase JWT includes a `role` claim such as 'front_desk' or 'admin'.
CREATE POLICY "Front desk and admin can update racquet_jobs"
  ON public.racquet_jobs FOR UPDATE
  USING (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('front_desk', 'admin')
  )
  WITH CHECK (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('front_desk', 'admin')
  );

