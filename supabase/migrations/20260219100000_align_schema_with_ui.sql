-- Align DB schema with Lovable UI: racquet_jobs columns, status_events, payment_events,
-- job_attachments, payment rollup trigger. Keep everything public (no auth); disable RLS.

-- 1) racquet_jobs: add any missing columns (safe for existing data)
ALTER TABLE public.racquet_jobs
  ADD COLUMN IF NOT EXISTS ticket_number text,
  ADD COLUMN IF NOT EXISTS service_type text NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS assigned_stringer text,
  ADD COLUMN IF NOT EXISTS racquet_max_tension_lbs integer,
  ADD COLUMN IF NOT EXISTS tension_override_lbs numeric,
  ADD COLUMN IF NOT EXISTS tension_override_by text,
  ADD COLUMN IF NOT EXISTS tension_override_reason text,
  ADD COLUMN IF NOT EXISTS ready_for_pickup_at timestamptz,
  ADD COLUMN IF NOT EXISTS amount_due numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_by_staff text;

-- Ensure NOT NULL and defaults for payment columns (backfill then alter)
UPDATE public.racquet_jobs SET amount_due = COALESCE(amount_due, 0) WHERE amount_due IS NULL;
UPDATE public.racquet_jobs SET amount_paid = COALESCE(amount_paid, 0) WHERE amount_paid IS NULL;
UPDATE public.racquet_jobs SET payment_status = COALESCE(payment_status, 'unpaid') WHERE payment_status IS NULL OR payment_status NOT IN ('unpaid','partial','paid');
UPDATE public.racquet_jobs SET service_type = COALESCE(service_type, 'default') WHERE service_type IS NULL;

ALTER TABLE public.racquet_jobs
  ALTER COLUMN amount_due SET NOT NULL,
  ALTER COLUMN amount_due SET DEFAULT 0,
  ALTER COLUMN amount_paid SET NOT NULL,
  ALTER COLUMN amount_paid SET DEFAULT 0,
  ALTER COLUMN payment_status SET NOT NULL,
  ALTER COLUMN payment_status SET DEFAULT 'unpaid',
  ALTER COLUMN service_type SET DEFAULT 'default';

-- Drop old payment_status check if it only allowed unpaid/paid; add full check
ALTER TABLE public.racquet_jobs DROP CONSTRAINT IF EXISTS racquet_jobs_payment_status_check;
ALTER TABLE public.racquet_jobs
  ADD CONSTRAINT racquet_jobs_payment_status_check
  CHECK (payment_status IN ('unpaid', 'partial', 'paid'));

-- Optional: service_type check (do not break legacy data)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'racquet_jobs_service_type_check') THEN
    ALTER TABLE public.racquet_jobs ADD CONSTRAINT racquet_jobs_service_type_check
    CHECK (service_type IN ('default', 'specialist'));
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Unique ticket_number (partial: only non-null; allows multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_racquet_jobs_ticket_number_unique
  ON public.racquet_jobs (ticket_number) WHERE (ticket_number IS NOT NULL AND ticket_number <> '');

-- 2) status_events: create if missing, index (job_id, created_at), disable RLS
CREATE TABLE IF NOT EXISTS public.status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.racquet_jobs(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  staff_name text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status_events_job_id ON public.status_events (job_id);
CREATE INDEX IF NOT EXISTS idx_status_events_job_id_created_at ON public.status_events (job_id, created_at);

ALTER TABLE public.status_events DISABLE ROW LEVEL SECURITY;

-- 3) payment_events: create if missing, check(amount > 0), index, disable RLS
CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.racquet_jobs(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  payment_method text,
  staff_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Backfill any invalid amounts so CHECK can be added
UPDATE public.payment_events SET amount = 0.01 WHERE amount IS NULL OR amount <= 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_events_amount_positive') THEN
    ALTER TABLE public.payment_events ADD CONSTRAINT payment_events_amount_positive CHECK (amount > 0);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_payment_events_job_id ON public.payment_events (job_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_job_id_created_at ON public.payment_events (job_id, created_at);

ALTER TABLE public.payment_events DISABLE ROW LEVEL SECURITY;

-- 4) Payment rollup trigger: on INSERT into payment_events, update racquet_jobs
CREATE OR REPLACE FUNCTION public.sync_racquet_job_payment_on_payment_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_due numeric;
  v_paid numeric;
  v_new_paid numeric;
  v_status text;
BEGIN
  SELECT COALESCE(amount_due, 0), COALESCE(amount_paid, 0) INTO v_due, v_paid
  FROM public.racquet_jobs WHERE id = NEW.job_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_new_paid := COALESCE(v_paid, 0) + NEW.amount;

  IF v_due IS NULL OR v_due <= 0 THEN
    v_status := 'unpaid';
    IF v_new_paid > 0 THEN v_status := 'paid'; END IF;
  ELSIF v_new_paid >= v_due THEN
    v_status := 'paid';
  ELSIF v_new_paid > 0 THEN
    v_status := 'partial';
  ELSE
    v_status := 'unpaid';
  END IF;

  UPDATE public.racquet_jobs
  SET
    amount_paid = v_new_paid,
    payment_status = v_status,
    paid_at = CASE WHEN (v_status = 'paid' AND paid_at IS NULL) THEN now() ELSE paid_at END,
    paid_by_staff = CASE WHEN (v_status = 'paid' AND paid_by_staff IS NULL) THEN NEW.staff_name ELSE paid_by_staff END
  WHERE id = NEW.job_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_payment_events_insert_sync_job ON public.payment_events;
CREATE TRIGGER after_payment_events_insert_sync_job
  AFTER INSERT ON public.payment_events
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_racquet_job_payment_on_payment_event();

-- 5) job_attachments: create if missing, index, disable RLS
CREATE TABLE IF NOT EXISTS public.job_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.racquet_jobs(id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN ('intake', 'completed', 'issue')),
  url text NOT NULL,
  file_path text NOT NULL,
  uploaded_by_name text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_attachments_job_id ON public.job_attachments (job_id);
CREATE INDEX IF NOT EXISTS idx_job_attachments_job_id_created_at ON public.job_attachments (job_id, created_at);

ALTER TABLE public.job_attachments DISABLE ROW LEVEL SECURITY;

-- 6) message_templates: create if missing (app uses template_key, label, subject, body)
CREATE TABLE IF NOT EXISTS public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL UNIQUE,
  label text NOT NULL,
  subject text,
  body text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.message_templates (template_key, label, subject, body) VALUES
  ('day8_reminder', 'Day 8 Pickup Reminder', 'Your racquet is ready for pickup', 'Hi {{member_name}}, your racquet (Ticket: {{ticket_number}}) has been ready for pickup since {{ready_date}}. Please pick it up within 2 days. Thank you! - CAN-AM Elite Badminton Club'),
  ('day10_notice', 'Day 10 Final Notice', 'Final notice: Racquet pickup overdue', 'Hi {{member_name}}, your racquet (Ticket: {{ticket_number}}) pickup is now overdue. Please pick it up as soon as possible or contact us. Storage fees may apply. - CAN-AM Elite Badminton Club')
ON CONFLICT (template_key) DO NOTHING;

ALTER TABLE public.message_templates DISABLE ROW LEVEL SECURITY;

-- Ensure racquet_jobs and strings RLS stay disabled (idempotent)
ALTER TABLE public.racquet_jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.strings DISABLE ROW LEVEL SECURITY;
