-- Job attachments for racquet photos (intake / completed / issue)
-- NOTE: You cannot create the bucket via SQL. Create a PUBLIC bucket named "racquet-photos"
-- in Supabase Dashboard (Storage → New bucket → Public). See README.

CREATE TABLE IF NOT EXISTS public.job_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.racquet_jobs(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('intake', 'completed', 'issue')),
  url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_attachments_job_id_created_at
  ON public.job_attachments(job_id, created_at);

ALTER TABLE public.job_attachments ENABLE ROW LEVEL SECURITY;

-- Permissive policies for PUBLIC MVP (no auth/roles)
CREATE POLICY "Anyone can select job_attachments"
  ON public.job_attachments FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert job_attachments"
  ON public.job_attachments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete job_attachments"
  ON public.job_attachments FOR DELETE
  USING (true);
