-- Allow anonymous read of front_desk_staff for public drop-off form (waiver section dropdown).
ALTER TABLE public.front_desk_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can select front_desk_staff" ON public.front_desk_staff;
CREATE POLICY "Public can select front_desk_staff"
  ON public.front_desk_staff FOR SELECT TO public USING (true);

-- Staff insert/update/delete: use same role check as other settings (staff only).
DROP POLICY IF EXISTS "Staff can insert front_desk_staff" ON public.front_desk_staff;
CREATE POLICY "Staff can insert front_desk_staff"
  ON public.front_desk_staff FOR INSERT WITH CHECK (public.get_my_role() IN ('admin', 'frontdesk', 'stringer'));

DROP POLICY IF EXISTS "Staff can update front_desk_staff" ON public.front_desk_staff;
CREATE POLICY "Staff can update front_desk_staff"
  ON public.front_desk_staff FOR UPDATE USING (public.get_my_role() IN ('admin', 'frontdesk', 'stringer'));

DROP POLICY IF EXISTS "Staff can delete front_desk_staff" ON public.front_desk_staff;
CREATE POLICY "Staff can delete front_desk_staff"
  ON public.front_desk_staff FOR DELETE USING (public.get_my_role() IN ('admin', 'frontdesk', 'stringer'));
