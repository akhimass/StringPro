-- Trigger function should never be callable as an RPC.
REVOKE ALL ON FUNCTION public.fn_racquet_jobs_auto_sms() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_racquet_jobs_auto_sms() FROM anon;
REVOKE ALL ON FUNCTION public.fn_racquet_jobs_auto_sms() FROM authenticated;
