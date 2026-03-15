-- Allow anonymous read of stringers for public drop-off form (stringer preference dropdown).
ALTER TABLE public.stringers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can select stringers" ON public.stringers;
CREATE POLICY "Public can select stringers"
  ON public.stringers FOR SELECT TO public USING (true);

-- Staff insert/update/delete (admin manages in Settings).
DROP POLICY IF EXISTS "Staff can insert stringers" ON public.stringers;
CREATE POLICY "Staff can insert stringers"
  ON public.stringers FOR INSERT WITH CHECK (public.get_my_role() IN ('admin', 'frontdesk', 'stringer'));

DROP POLICY IF EXISTS "Staff can update stringers" ON public.stringers;
CREATE POLICY "Staff can update stringers"
  ON public.stringers FOR UPDATE USING (public.get_my_role() IN ('admin', 'frontdesk', 'stringer'));

DROP POLICY IF EXISTS "Staff can delete stringers" ON public.stringers;
CREATE POLICY "Staff can delete stringers"
  ON public.stringers FOR DELETE USING (public.get_my_role() IN ('admin', 'frontdesk', 'stringer'));

-- Seed "Ouyang" for drop-off and manager choice (idempotent).
INSERT INTO public.stringers (name) VALUES ('Ouyang') ON CONFLICT (name) DO NOTHING;
