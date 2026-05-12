-- Server-side defense in depth: anon (public Drop-Off form) cannot insert a
-- racquet_jobs row unless the phone number has previously been verified via
-- Twilio Verify (i.e., it is present in public.verified_phones).
--
-- Authenticated staff inserts (Admin, Front Desk) bypass this check because
-- staff verifies customers in person.

CREATE OR REPLACE FUNCTION public.fn_require_verified_phone_for_anon_dropoff()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_role text := coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role', '');
BEGIN
  IF v_role = 'anon' OR v_role = '' THEN
    IF NEW.phone IS NULL OR length(trim(NEW.phone)) = 0 THEN
      RAISE EXCEPTION 'Phone number is required.'
        USING ERRCODE = '23514';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.verified_phones WHERE phone = NEW.phone
    ) THEN
      RAISE EXCEPTION 'Phone number must be verified before submitting a drop-off. Please verify your phone via the SMS code.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_require_verified_phone_for_anon_dropoff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_require_verified_phone_for_anon_dropoff() FROM anon;
REVOKE ALL ON FUNCTION public.fn_require_verified_phone_for_anon_dropoff() FROM authenticated;

DROP TRIGGER IF EXISTS trg_require_verified_phone_for_anon_dropoff ON public.racquet_jobs;
CREATE TRIGGER trg_require_verified_phone_for_anon_dropoff
BEFORE INSERT ON public.racquet_jobs
FOR EACH ROW
EXECUTE FUNCTION public.fn_require_verified_phone_for_anon_dropoff();
