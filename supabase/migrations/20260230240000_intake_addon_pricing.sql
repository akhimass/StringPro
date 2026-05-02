-- Configurable fees for drop-off "Additional Services" (rush, grommet, grip, default stringer path).
-- Single row id = 1. Public read for drop-off; admin update.

CREATE TABLE IF NOT EXISTS public.intake_addon_pricing (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  rush_1_day_fee numeric NOT NULL DEFAULT 10,
  rush_2_hour_fee numeric NOT NULL DEFAULT 20,
  grommet_repair_fee numeric NOT NULL DEFAULT 5,
  grip_replacement_fee numeric NOT NULL DEFAULT 5,
  default_stringer_fee numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.intake_addon_pricing (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.intake_addon_pricing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read intake_addon_pricing" ON public.intake_addon_pricing;
CREATE POLICY "Public can read intake_addon_pricing"
  ON public.intake_addon_pricing FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admin can update intake_addon_pricing" ON public.intake_addon_pricing;
CREATE POLICY "Admin can update intake_addon_pricing"
  ON public.intake_addon_pricing FOR UPDATE TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

COMMENT ON TABLE public.intake_addon_pricing IS 'Singleton (id=1): rush/grommet/grip/default-stringer fees for public intake pricing.';
