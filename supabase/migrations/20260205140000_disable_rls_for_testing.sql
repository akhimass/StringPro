-- Disable RLS on app tables for testing (no policy checks; anon key can do everything).
-- Re-enable and add proper policies before production.

ALTER TABLE public.racquet_jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.strings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_events DISABLE ROW LEVEL SECURITY;
