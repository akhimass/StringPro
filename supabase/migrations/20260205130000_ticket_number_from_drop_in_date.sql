-- Ticket number YYMM based on drop-off date (not current date)

-- Function: generate CANAMYYMMXXX using the job's drop_in_date
CREATE OR REPLACE FUNCTION public.generate_canam_ticket_number_for_date(p_date date)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_yymm TEXT;
  v_new_seq INT;
BEGIN
  -- YYMM from the drop-off date (e.g. March 3 2026 -> 2603)
  v_yymm := to_char(p_date, 'YYMM');

  -- Atomically increment last_seq for this YYMM
  INSERT INTO public.ticket_counters (yymm, last_seq)
  VALUES (v_yymm, 1)
  ON CONFLICT (yymm)
  DO UPDATE SET last_seq = ticket_counters.last_seq + 1
  RETURNING last_seq INTO v_new_seq;

  RETURN 'CANAM' || v_yymm || lpad(v_new_seq::text, 3, '0');
END;
$$;

-- Trigger: use drop_in_date for ticket number (not current time)
CREATE OR REPLACE FUNCTION public.set_racquet_job_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := public.generate_canam_ticket_number_for_date(NEW.drop_in_date);
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger already exists; function body is updated above
-- No need to recreate trigger
