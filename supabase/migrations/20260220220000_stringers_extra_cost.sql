-- Add editable extra cost (price) per stringer for drop-off and pricing.
ALTER TABLE public.stringers
  ADD COLUMN IF NOT EXISTS extra_cost numeric DEFAULT 0 NOT NULL;

COMMENT ON COLUMN public.stringers.extra_cost IS 'Extra fee in dollars when this stringer is selected (e.g. 10 for +$10).';
