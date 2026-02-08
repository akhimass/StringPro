-- Harden payment persistence: ensure racquet_jobs columns and payment_events table + index

-- 1) racquet_jobs: ensure columns exist and constraints
ALTER TABLE public.racquet_jobs
  ADD COLUMN IF NOT EXISTS amount_due NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_by_staff TEXT;

-- Ensure payment_status check includes unpaid, partial, paid
ALTER TABLE public.racquet_jobs DROP CONSTRAINT IF EXISTS racquet_jobs_payment_status_check;
ALTER TABLE public.racquet_jobs
  ADD CONSTRAINT racquet_jobs_payment_status_check
  CHECK (payment_status IN ('unpaid', 'partial', 'paid'));

-- Ensure default for payment_status
ALTER TABLE public.racquet_jobs
  ALTER COLUMN payment_status SET DEFAULT 'unpaid';

-- 2) payment_events: create if missing
CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.racquet_jobs(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  staff_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for timeline merge (job_id + created_at)
CREATE INDEX IF NOT EXISTS idx_payment_events_job_id_created_at
  ON public.payment_events(job_id, created_at);

-- Keep single-column index for lookups by job_id
CREATE INDEX IF NOT EXISTS idx_payment_events_job_id ON public.payment_events(job_id);
