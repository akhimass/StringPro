-- Racquet brands: controlled list for DropOff brand dropdown. Admin manages via Settings.
-- RLS disabled for now (public read for drop-off; staff CRUD via existing auth).

CREATE TABLE IF NOT EXISTS public.racquet_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Optional: index for list ordering by name
CREATE INDEX IF NOT EXISTS idx_racquet_brands_name ON public.racquet_brands (name);

-- Seed starter set (idempotent)
INSERT INTO public.racquet_brands (name) VALUES
  ('Yonex'),
  ('Victor'),
  ('Li-Ning'),
  ('Babolat'),
  ('Wilson'),
  ('Head')
ON CONFLICT (name) DO NOTHING;
