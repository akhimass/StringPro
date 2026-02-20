-- Tension enforcement: requested_tension_lbs, final_tension_lbs, and trigger to keep final consistent.
-- Backfill existing rows; trigger on INSERT/UPDATE applies default logic (min(requested, max) or override).

-- 1) Add columns to racquet_jobs
ALTER TABLE public.racquet_jobs
  ADD COLUMN IF NOT EXISTS requested_tension_lbs integer NULL,
  ADD COLUMN IF NOT EXISTS final_tension_lbs integer NULL;

-- 2) Backfill
UPDATE public.racquet_jobs
SET requested_tension_lbs = COALESCE(
  requested_tension_lbs,
  CASE WHEN string_tension IS NOT NULL THEN round(string_tension)::integer ELSE NULL END
)
WHERE requested_tension_lbs IS NULL AND string_tension IS NOT NULL;

UPDATE public.racquet_jobs
SET final_tension_lbs = COALESCE(
  final_tension_lbs,
  CASE WHEN tension_override_lbs IS NOT NULL THEN (tension_override_lbs)::integer
       WHEN requested_tension_lbs IS NOT NULL AND racquet_max_tension_lbs IS NOT NULL
       THEN LEAST(requested_tension_lbs, racquet_max_tension_lbs)
       ELSE requested_tension_lbs
  END
)
WHERE final_tension_lbs IS NULL;

-- 3) Trigger function: keep requested_tension_lbs and final_tension_lbs consistent
CREATE OR REPLACE FUNCTION public.sync_racquet_job_tension()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- If requested_tension_lbs is null and string_tension is present, set from string_tension
  IF NEW.requested_tension_lbs IS NULL AND NEW.string_tension IS NOT NULL THEN
    NEW.requested_tension_lbs := round(NEW.string_tension)::integer;
  END IF;

  -- Final tension: override wins, else min(requested, max), else requested
  IF NEW.tension_override_lbs IS NOT NULL THEN
    NEW.final_tension_lbs := (NEW.tension_override_lbs)::integer;
  ELSIF NEW.racquet_max_tension_lbs IS NOT NULL AND NEW.requested_tension_lbs IS NOT NULL THEN
    NEW.final_tension_lbs := LEAST(NEW.requested_tension_lbs, NEW.racquet_max_tension_lbs);
  ELSE
    NEW.final_tension_lbs := NEW.requested_tension_lbs;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_racquet_job_tension_trigger ON public.racquet_jobs;
CREATE TRIGGER sync_racquet_job_tension_trigger
  BEFORE INSERT OR UPDATE ON public.racquet_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_racquet_job_tension();
