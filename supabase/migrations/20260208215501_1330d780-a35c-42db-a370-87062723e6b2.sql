
-- Add delete policy for racquet_jobs (was missing)
CREATE POLICY "Anyone can delete racquet_jobs"
ON public.racquet_jobs FOR DELETE
USING (true);
