-- Auth + profiles + RLS: public drop-off stays anon; staff dashboards use authenticated role from profiles.
-- 1) profiles table + trigger to auto-create on signup (default role = customer)
-- 2) Helper for RLS: current user's role from profiles
-- 3) RLS policies: profiles (own row), racquet_jobs (anon INSERT; staff SELECT/UPDATE),
--    job_attachments (anon INSERT stage='intake'; staff SELECT/INSERT/DELETE),
--    status_events, payment_events, message_templates (staff only), strings (anon SELECT)

-- ---------- 1) Profiles table ----------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'frontdesk', 'stringer')),
  full_name text
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

-- Trigger: on signup, create profile row (runs as definer so it can insert before RLS)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    'customer',
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for existing auth.users that don't have a row (e.g. created before this migration)
INSERT INTO public.profiles (id, role, full_name)
SELECT u.id, 'customer', COALESCE(u.raw_user_meta_data->>'full_name', '')
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

-- ---------- 2) RLS helper: current user's role ----------
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ---------- 3) RLS: profiles ----------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Staff may update role/full_name for promotion (admin only in practice; we allow any authenticated to update own row for simplicity, or restrict to admin later)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---------- 4) RLS: racquet_jobs ----------
ALTER TABLE public.racquet_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view racquet_jobs" ON public.racquet_jobs;
DROP POLICY IF EXISTS "Anyone can insert racquet_jobs" ON public.racquet_jobs;
DROP POLICY IF EXISTS "Anyone can update racquet_jobs" ON public.racquet_jobs;
DROP POLICY IF EXISTS "Anyone can delete racquet_jobs" ON public.racquet_jobs;

-- Anon: drop-off only (INSERT)
CREATE POLICY "Anon can insert racquet_jobs"
  ON public.racquet_jobs FOR INSERT
  TO anon
  WITH CHECK (true);

-- Staff: SELECT and UPDATE (admin, frontdesk, stringer)
CREATE POLICY "Staff can select racquet_jobs"
  ON public.racquet_jobs FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'frontdesk', 'stringer'));

CREATE POLICY "Staff can update racquet_jobs"
  ON public.racquet_jobs FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'frontdesk', 'stringer'))
  WITH CHECK (public.get_my_role() IN ('admin', 'frontdesk', 'stringer'));

-- ---------- 5) RLS: job_attachments ----------
ALTER TABLE public.job_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon can insert intake job_attachments" ON public.job_attachments;
DROP POLICY IF EXISTS "Staff can select job_attachments" ON public.job_attachments;
DROP POLICY IF EXISTS "Staff can insert job_attachments" ON public.job_attachments;
DROP POLICY IF EXISTS "Staff can delete job_attachments" ON public.job_attachments;

-- Anon: INSERT only when stage = 'intake' (drop-off intake photos)
CREATE POLICY "Anon can insert intake job_attachments"
  ON public.job_attachments FOR INSERT
  TO anon
  WITH CHECK (stage = 'intake');

-- Staff: full access
CREATE POLICY "Staff can select job_attachments"
  ON public.job_attachments FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'frontdesk', 'stringer'));

CREATE POLICY "Staff can insert job_attachments"
  ON public.job_attachments FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'frontdesk', 'stringer'));

CREATE POLICY "Staff can delete job_attachments"
  ON public.job_attachments FOR DELETE
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'frontdesk', 'stringer'));

-- ---------- 6) RLS: status_events ----------
ALTER TABLE public.status_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can select status_events" ON public.status_events;
DROP POLICY IF EXISTS "Staff can insert status_events" ON public.status_events;
DROP POLICY IF EXISTS "Staff can update status_events" ON public.status_events;

CREATE POLICY "Staff can select status_events"
  ON public.status_events FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'frontdesk', 'stringer'));

CREATE POLICY "Staff can insert status_events"
  ON public.status_events FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'frontdesk', 'stringer'));

CREATE POLICY "Staff can update status_events"
  ON public.status_events FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'frontdesk', 'stringer'))
  WITH CHECK (public.get_my_role() IN ('admin', 'frontdesk', 'stringer'));

-- ---------- 7) RLS: payment_events ----------
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can select payment_events" ON public.payment_events;
DROP POLICY IF EXISTS "Staff can insert payment_events" ON public.payment_events;
DROP POLICY IF EXISTS "Staff can update payment_events" ON public.payment_events;

CREATE POLICY "Staff can select payment_events"
  ON public.payment_events FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'frontdesk', 'stringer'));

CREATE POLICY "Staff can insert payment_events"
  ON public.payment_events FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'frontdesk', 'stringer'));

CREATE POLICY "Staff can update payment_events"
  ON public.payment_events FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'frontdesk', 'stringer'))
  WITH CHECK (public.get_my_role() IN ('admin', 'frontdesk', 'stringer'));

-- ---------- 8) RLS: message_templates ----------
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can select message_templates" ON public.message_templates;
DROP POLICY IF EXISTS "Staff can insert message_templates" ON public.message_templates;
DROP POLICY IF EXISTS "Staff can update message_templates" ON public.message_templates;

CREATE POLICY "Staff can select message_templates"
  ON public.message_templates FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'frontdesk', 'stringer'));

CREATE POLICY "Staff can insert message_templates"
  ON public.message_templates FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'frontdesk', 'stringer'));

CREATE POLICY "Staff can update message_templates"
  ON public.message_templates FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'frontdesk', 'stringer'))
  WITH CHECK (public.get_my_role() IN ('admin', 'frontdesk', 'stringer'));

-- ---------- 9) RLS: strings (anon SELECT for drop-off form; staff full access) ----------
ALTER TABLE public.strings ENABLE ROW LEVEL SECURITY;

-- Drop legacy "Anyone" policies if they exist (from initial migration)
DROP POLICY IF EXISTS "Anyone can view active strings" ON public.strings;
DROP POLICY IF EXISTS "Anyone can view all strings for admin" ON public.strings;
DROP POLICY IF EXISTS "Anyone can insert strings" ON public.strings;
DROP POLICY IF EXISTS "Anyone can update strings" ON public.strings;
DROP POLICY IF EXISTS "Anyone can delete strings" ON public.strings;

-- Anon and authenticated can read (for drop-off string picker and dashboards)
CREATE POLICY "Public can select strings"
  ON public.strings FOR SELECT
  TO public
  USING (true);

-- Only staff can modify strings catalog
CREATE POLICY "Staff can insert strings"
  ON public.strings FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'frontdesk', 'stringer'));

CREATE POLICY "Staff can update strings"
  ON public.strings FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'frontdesk', 'stringer'))
  WITH CHECK (public.get_my_role() IN ('admin', 'frontdesk', 'stringer'));

CREATE POLICY "Staff can delete strings"
  ON public.strings FOR DELETE
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'frontdesk', 'stringer'));
