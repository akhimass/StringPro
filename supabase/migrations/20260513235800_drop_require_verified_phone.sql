-- Phone verification at Drop-Off is now optional.
-- Drop the BEFORE INSERT trigger that required verified_phones membership
-- for anon inserts. The OTP flow + verified_phones table remain available
-- so customers can still self-verify and skip OTP on future visits.

DROP TRIGGER IF EXISTS trg_require_verified_phone_for_anon_dropoff ON public.racquet_jobs;
DROP FUNCTION IF EXISTS public.fn_require_verified_phone_for_anon_dropoff();
