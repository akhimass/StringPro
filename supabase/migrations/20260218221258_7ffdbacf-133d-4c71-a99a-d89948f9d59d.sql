
-- Create status_events table
CREATE TABLE IF NOT EXISTS public.status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.racquet_jobs(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  staff_name text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status_events_job_id ON public.status_events (job_id);

ALTER TABLE public.status_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view status_events" ON public.status_events FOR SELECT USING (true);
CREATE POLICY "Anyone can insert status_events" ON public.status_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update status_events" ON public.status_events FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete status_events" ON public.status_events FOR DELETE USING (true);

-- Create payment_events table
CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.racquet_jobs(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text,
  staff_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_job_id ON public.payment_events (job_id);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view payment_events" ON public.payment_events FOR SELECT USING (true);
CREATE POLICY "Anyone can insert payment_events" ON public.payment_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update payment_events" ON public.payment_events FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete payment_events" ON public.payment_events FOR DELETE USING (true);

-- Create job_attachments table
CREATE TABLE IF NOT EXISTS public.job_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.racquet_jobs(id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN ('intake', 'completed', 'issue')),
  url text NOT NULL,
  file_path text NOT NULL,
  uploaded_by_name text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_attachments_job_id ON public.job_attachments (job_id, created_at);

ALTER TABLE public.job_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view job_attachments" ON public.job_attachments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert job_attachments" ON public.job_attachments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update job_attachments" ON public.job_attachments FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete job_attachments" ON public.job_attachments FOR DELETE USING (true);

-- Create storage bucket for racquet photos (if not exists)
INSERT INTO storage.buckets (id, name, public) VALUES ('racquet-photos', 'racquet-photos', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read racquet-photos' AND tablename = 'objects') THEN
    CREATE POLICY "Public read racquet-photos" ON storage.objects FOR SELECT USING (bucket_id = 'racquet-photos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public upload racquet-photos' AND tablename = 'objects') THEN
    CREATE POLICY "Public upload racquet-photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'racquet-photos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public delete racquet-photos' AND tablename = 'objects') THEN
    CREATE POLICY "Public delete racquet-photos" ON storage.objects FOR DELETE USING (bucket_id = 'racquet-photos');
  END IF;
END
$$;

-- Add missing columns to racquet_jobs (payment tracking + ticket)
ALTER TABLE public.racquet_jobs
  ADD COLUMN IF NOT EXISTS amount_due numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_by_staff text,
  ADD COLUMN IF NOT EXISTS ticket_number text;
