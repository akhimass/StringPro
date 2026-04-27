-- Combined staff role: front desk + stringer (both dashboards; not Manager).
-- 1) Extend profiles.role CHECK
-- 2) role_is_staff() for RLS (includes new role)
-- 3) Recreate staff policies to use role_is_staff(get_my_role())

CREATE OR REPLACE FUNCTION public.role_is_staff(r text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(r, '') IN ('admin', 'frontdesk', 'stringer', 'frontdesk_stringer');
$$;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('customer', 'admin', 'frontdesk', 'stringer', 'frontdesk_stringer'));

-- ---------- racquet_jobs ----------
DROP POLICY IF EXISTS "Staff can select racquet_jobs" ON public.racquet_jobs;
CREATE POLICY "Staff can select racquet_jobs"
  ON public.racquet_jobs FOR SELECT
  TO authenticated
  USING (public.role_is_staff(public.get_my_role()));

DROP POLICY IF EXISTS "Staff can update racquet_jobs" ON public.racquet_jobs;
CREATE POLICY "Staff can update racquet_jobs"
  ON public.racquet_jobs FOR UPDATE
  TO authenticated
  USING (public.role_is_staff(public.get_my_role()))
  WITH CHECK (public.role_is_staff(public.get_my_role()));

-- ---------- job_attachments ----------
DROP POLICY IF EXISTS "Staff can select job_attachments" ON public.job_attachments;
CREATE POLICY "Staff can select job_attachments"
  ON public.job_attachments FOR SELECT
  TO authenticated
  USING (public.role_is_staff(public.get_my_role()));

DROP POLICY IF EXISTS "Staff can insert job_attachments" ON public.job_attachments;
CREATE POLICY "Staff can insert job_attachments"
  ON public.job_attachments FOR INSERT
  TO authenticated
  WITH CHECK (public.role_is_staff(public.get_my_role()));

DROP POLICY IF EXISTS "Staff can delete job_attachments" ON public.job_attachments;
CREATE POLICY "Staff can delete job_attachments"
  ON public.job_attachments FOR DELETE
  TO authenticated
  USING (public.role_is_staff(public.get_my_role()));

-- ---------- status_events ----------
DROP POLICY IF EXISTS "Staff can select status_events" ON public.status_events;
CREATE POLICY "Staff can select status_events"
  ON public.status_events FOR SELECT
  TO authenticated
  USING (public.role_is_staff(public.get_my_role()));

DROP POLICY IF EXISTS "Staff can insert status_events" ON public.status_events;
CREATE POLICY "Staff can insert status_events"
  ON public.status_events FOR INSERT
  TO authenticated
  WITH CHECK (public.role_is_staff(public.get_my_role()));

DROP POLICY IF EXISTS "Staff can update status_events" ON public.status_events;
CREATE POLICY "Staff can update status_events"
  ON public.status_events FOR UPDATE
  TO authenticated
  USING (public.role_is_staff(public.get_my_role()))
  WITH CHECK (public.role_is_staff(public.get_my_role()));

-- ---------- payment_events ----------
DROP POLICY IF EXISTS "Staff can select payment_events" ON public.payment_events;
CREATE POLICY "Staff can select payment_events"
  ON public.payment_events FOR SELECT
  TO authenticated
  USING (public.role_is_staff(public.get_my_role()));

DROP POLICY IF EXISTS "Staff can insert payment_events" ON public.payment_events;
CREATE POLICY "Staff can insert payment_events"
  ON public.payment_events FOR INSERT
  TO authenticated
  WITH CHECK (public.role_is_staff(public.get_my_role()));

DROP POLICY IF EXISTS "Staff can update payment_events" ON public.payment_events;
CREATE POLICY "Staff can update payment_events"
  ON public.payment_events FOR UPDATE
  TO authenticated
  USING (public.role_is_staff(public.get_my_role()))
  WITH CHECK (public.role_is_staff(public.get_my_role()));

-- ---------- message_templates ----------
DROP POLICY IF EXISTS "Staff can select message_templates" ON public.message_templates;
CREATE POLICY "Staff can select message_templates"
  ON public.message_templates FOR SELECT
  TO authenticated
  USING (public.role_is_staff(public.get_my_role()));

DROP POLICY IF EXISTS "Staff can insert message_templates" ON public.message_templates;
CREATE POLICY "Staff can insert message_templates"
  ON public.message_templates FOR INSERT
  TO authenticated
  WITH CHECK (public.role_is_staff(public.get_my_role()));

DROP POLICY IF EXISTS "Staff can update message_templates" ON public.message_templates;
CREATE POLICY "Staff can update message_templates"
  ON public.message_templates FOR UPDATE
  TO authenticated
  USING (public.role_is_staff(public.get_my_role()))
  WITH CHECK (public.role_is_staff(public.get_my_role()));

-- ---------- strings ----------
DROP POLICY IF EXISTS "Staff can insert strings" ON public.strings;
CREATE POLICY "Staff can insert strings"
  ON public.strings FOR INSERT
  TO authenticated
  WITH CHECK (public.role_is_staff(public.get_my_role()));

DROP POLICY IF EXISTS "Staff can update strings" ON public.strings;
CREATE POLICY "Staff can update strings"
  ON public.strings FOR UPDATE
  TO authenticated
  USING (public.role_is_staff(public.get_my_role()))
  WITH CHECK (public.role_is_staff(public.get_my_role()));

DROP POLICY IF EXISTS "Staff can delete strings" ON public.strings;
CREATE POLICY "Staff can delete strings"
  ON public.strings FOR DELETE
  TO authenticated
  USING (public.role_is_staff(public.get_my_role()));

-- ---------- front_desk_staff ----------
DROP POLICY IF EXISTS "Staff can insert front_desk_staff" ON public.front_desk_staff;
CREATE POLICY "Staff can insert front_desk_staff"
  ON public.front_desk_staff FOR INSERT
  WITH CHECK (public.role_is_staff(public.get_my_role()));

DROP POLICY IF EXISTS "Staff can update front_desk_staff" ON public.front_desk_staff;
CREATE POLICY "Staff can update front_desk_staff"
  ON public.front_desk_staff FOR UPDATE
  USING (public.role_is_staff(public.get_my_role()));

DROP POLICY IF EXISTS "Staff can delete front_desk_staff" ON public.front_desk_staff;
CREATE POLICY "Staff can delete front_desk_staff"
  ON public.front_desk_staff FOR DELETE
  USING (public.role_is_staff(public.get_my_role()));

-- ---------- stringers ----------
DROP POLICY IF EXISTS "Staff can insert stringers" ON public.stringers;
CREATE POLICY "Staff can insert stringers"
  ON public.stringers FOR INSERT
  WITH CHECK (public.role_is_staff(public.get_my_role()));

DROP POLICY IF EXISTS "Staff can update stringers" ON public.stringers;
CREATE POLICY "Staff can update stringers"
  ON public.stringers FOR UPDATE
  USING (public.role_is_staff(public.get_my_role()));

DROP POLICY IF EXISTS "Staff can delete stringers" ON public.stringers;
CREATE POLICY "Staff can delete stringers"
  ON public.stringers FOR DELETE
  USING (public.role_is_staff(public.get_my_role()));
