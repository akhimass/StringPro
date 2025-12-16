-- Create strings table
CREATE TABLE public.strings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  gauge TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create racquet_jobs table
CREATE TABLE public.racquet_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  drop_in_date DATE NOT NULL,
  racquet_type TEXT,
  string_id UUID REFERENCES public.strings(id),
  string_power TEXT,
  string_tension NUMERIC,
  terms_accepted BOOLEAN DEFAULT false,
  terms_accepted_at TIMESTAMPTZ,
  status TEXT DEFAULT 'processing',
  pickup_deadline DATE,
  reminder_2_sent BOOLEAN DEFAULT false,
  reminder_3_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_racquet_jobs_status ON public.racquet_jobs(status);
CREATE INDEX idx_racquet_jobs_pickup_deadline ON public.racquet_jobs(pickup_deadline);
CREATE INDEX idx_racquet_jobs_drop_in_date ON public.racquet_jobs(drop_in_date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for racquet_jobs
CREATE TRIGGER update_racquet_jobs_updated_at
  BEFORE UPDATE ON public.racquet_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.strings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.racquet_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for strings (public read for active strings)
CREATE POLICY "Anyone can view active strings"
  ON public.strings FOR SELECT
  USING (active = true);

CREATE POLICY "Anyone can view all strings for admin"
  ON public.strings FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert strings"
  ON public.strings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update strings"
  ON public.strings FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete strings"
  ON public.strings FOR DELETE
  USING (true);

-- RLS policies for racquet_jobs (public access for now - no auth)
CREATE POLICY "Anyone can view racquet_jobs"
  ON public.racquet_jobs FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert racquet_jobs"
  ON public.racquet_jobs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update racquet_jobs"
  ON public.racquet_jobs FOR UPDATE
  USING (true);

-- Insert some default strings
INSERT INTO public.strings (name, brand, gauge, active) VALUES
  ('RPM Blast', 'Babolat', '1.25mm', true),
  ('ALU Power', 'Luxilon', '1.25mm', true),
  ('NXT', 'Wilson', '1.30mm', true),
  ('Gut', 'Babolat', '1.30mm', false);