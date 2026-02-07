-- Ticket number support for StringPro (CAN-AM)

-- 1) Add ticket_number column to racquet_jobs
ALTER TABLE public.racquet_jobs
  ADD COLUMN IF NOT EXISTS ticket_number TEXT UNIQUE;

-- 2) Counter table for monthly sequences (YYMM)
CREATE TABLE IF NOT EXISTS public.ticket_counters (
  yymm TEXT PRIMARY KEY,
  last_seq INT NOT NULL DEFAULT 0
);

-- 3) Function to generate CANAMYYMMXXX using America/Los_Angeles time
CREATE OR REPLACE FUNCTION public.generate_canam_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_yymm TEXT;
  v_new_seq INT;
BEGIN
  -- Compute YYMM in LA time
  v_yymm := to_char((now() AT TIME ZONE 'America/Los_Angeles'), 'YYMM');

  -- Atomically increment last_seq for this YYMM
  INSERT INTO public.ticket_counters (yymm, last_seq)
  VALUES (v_yymm, 1)
  ON CONFLICT (yymm)
  DO UPDATE SET last_seq = ticket_counters.last_seq + 1
  RETURNING last_seq INTO v_new_seq;

  RETURN 'CANAM' || v_yymm || lpad(v_new_seq::text, 3, '0');
END;
$$;

-- 4) BEFORE INSERT trigger on racquet_jobs to set ticket_number if missing
CREATE OR REPLACE FUNCTION public.set_racquet_job_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := public.generate_canam_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_racquet_jobs_ticket_number ON public.racquet_jobs;

CREATE TRIGGER set_racquet_jobs_ticket_number
  BEFORE INSERT ON public.racquet_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_racquet_job_ticket_number();

