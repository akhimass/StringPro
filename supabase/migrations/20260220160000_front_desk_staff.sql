-- Front desk staff: list of staff who can receive drop-offs. Used in waiver section and stored on job.
-- Admin manages list in Settings; anon can read for drop-off form.

CREATE TABLE IF NOT EXISTS public.front_desk_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_front_desk_staff_name ON public.front_desk_staff (name);

-- Seed initial options
INSERT INTO public.front_desk_staff (name) VALUES
  ('Manager'),
  ('Front Desk Member A')
ON CONFLICT (name) DO NOTHING;

-- Record which front desk person received the drop-off
ALTER TABLE public.racquet_jobs
  ADD COLUMN IF NOT EXISTS drop_off_by_staff text;

-- Allow anon to read front_desk_staff for public drop-off form (if RLS is enabled later)
-- For now table is created; RLS can be added in a separate migration if needed.
