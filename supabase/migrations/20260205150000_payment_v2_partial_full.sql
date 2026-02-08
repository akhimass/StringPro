-- Payment v2: partial + full payments, balance_due, payment_events audit

-- 1) Add amount_paid to racquet_jobs
ALTER TABLE public.racquet_jobs
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC NOT NULL DEFAULT 0;

-- 2) Backfill: existing 'paid' rows get amount_paid = amount_due
UPDATE public.racquet_jobs
SET amount_paid = amount_due
WHERE payment_status = 'paid' AND (amount_paid IS NULL OR amount_paid < amount_due);

-- 3) Drop old payment_status check and add new one (unpaid, partial, paid)
ALTER TABLE public.racquet_jobs DROP CONSTRAINT IF EXISTS racquet_jobs_payment_status_check;

ALTER TABLE public.racquet_jobs
  ADD CONSTRAINT racquet_jobs_payment_status_check
  CHECK (payment_status IN ('unpaid', 'partial', 'paid'));

-- 4) Set payment_status from amount_paid/amount_due for existing rows
UPDATE public.racquet_jobs
SET payment_status = CASE
  WHEN amount_paid >= amount_due THEN 'paid'
  WHEN amount_paid > 0 THEN 'partial'
  ELSE 'unpaid'
END
WHERE payment_status NOT IN ('unpaid', 'partial', 'paid') OR payment_status IS NULL;

-- 5) payment_events table (audit trail for each payment)
CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.racquet_jobs(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  staff_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_job_id ON public.payment_events(job_id);

-- RLS off for testing (match other tables)
ALTER TABLE public.payment_events DISABLE ROW LEVEL SECURITY;
