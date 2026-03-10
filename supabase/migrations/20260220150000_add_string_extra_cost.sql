-- Add per-string extra_cost for StringPro pricing (add-on cost, not labor replacement).

ALTER TABLE public.strings
  ADD COLUMN IF NOT EXISTS extra_cost numeric NOT NULL DEFAULT 0;

-- Backfill existing rows safely
UPDATE public.strings
SET extra_cost = COALESCE(extra_cost, 0);

-- Ensure there is a \"Customer supplied\" option with no added cost
INSERT INTO public.strings (name, brand, gauge, active, extra_cost)
SELECT 'Customer supplied string', 'Customer', NULL, true, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.strings
  WHERE name = 'Customer supplied string' AND brand = 'Customer'
);

