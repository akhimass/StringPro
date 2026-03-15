-- Stringers: list of stringers. Jobs can be assigned to a stringer.
-- Admin manages list in Settings; dashboards show stringer name.

CREATE TABLE IF NOT EXISTS public.stringers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stringers_name ON public.stringers (name);

-- Link jobs to stringer (nullable: "default" service has no assigned stringer)
ALTER TABLE public.racquet_jobs
  ADD COLUMN IF NOT EXISTS stringer_id uuid REFERENCES public.stringers (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_racquet_jobs_stringer_id ON public.racquet_jobs (stringer_id);

-- Seed one stringer for legacy "Stringer A" / specialist assignments
INSERT INTO public.stringers (name) VALUES ('Stringer A') ON CONFLICT (name) DO NOTHING;

-- Backfill: jobs that had assigned_stringer = 'A' get stringer_id for "Stringer A"
UPDATE public.racquet_jobs r
SET stringer_id = (SELECT s.id FROM public.stringers s WHERE s.name = 'Stringer A' LIMIT 1)
WHERE r.assigned_stringer = 'A' AND r.stringer_id IS NULL;
