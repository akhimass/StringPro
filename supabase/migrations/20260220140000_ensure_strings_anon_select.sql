-- Ensure anonymous users can SELECT from strings (for public DropOff form).
-- Idempotent: safe to run even if policy already exists from 20260220100000_auth_profiles_rls.sql.

ALTER TABLE public.strings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can select strings" ON public.strings;
CREATE POLICY "Public can select strings"
  ON public.strings FOR SELECT
  TO public
  USING (true);
