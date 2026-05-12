-- Twilio messaging infrastructure for StringPro
-- * verified_phones table (anon can read, only service_role can write via verify-check)
-- * Seed pickup_ready + payment_receipt templates
-- * Vault-backed wrappers around pg_net to call Edge Functions
-- * Trigger on racquet_jobs for auto pickup_ready / payment_receipt SMS
-- * pg_cron daily job that invokes the send-reminders Edge Function
--
-- ONE-TIME VAULT SETUP (run in Supabase Dashboard SQL Editor after this migration):
--   SELECT vault.create_secret('<service_role_jwt>', 'service_role_jwt',
--     'Used by triggers and pg_cron to call edge functions');
--   The 'project_url' secret is set automatically by this migration.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE TABLE IF NOT EXISTS public.verified_phones (
  phone text PRIMARY KEY,
  verified_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.verified_phones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can check verified phones" ON public.verified_phones;
CREATE POLICY "Anyone can check verified phones"
  ON public.verified_phones FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO public.message_templates (template_key, label, subject, body) VALUES
  (
    'pickup_ready',
    'Pickup Ready',
    'Racquet ready for pickup',
    'Hi {{member_name}}, your racquet (Ticket: {{ticket_number}}) is ready for pickup at CAN-AM Elite Badminton Club. Reply STOP to opt out.'
  ),
  (
    'payment_receipt',
    'Payment Receipt',
    'Payment received',
    'Hi {{member_name}}, thanks! We received ${{amount_paid}} for ticket {{ticket_number}} on {{paid_at}}. Reply STOP to opt out. - CAN-AM Elite Badminton Club'
  )
ON CONFLICT (template_key) DO NOTHING;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.get_supabase_secret(p_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
DECLARE
  v_value text;
BEGIN
  SELECT decrypted_secret INTO v_value
  FROM vault.decrypted_secrets
  WHERE name = p_name
  ORDER BY created_at DESC
  LIMIT 1;
  RETURN v_value;
END;
$$;

REVOKE ALL ON FUNCTION private.get_supabase_secret(text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.post_edge_function(
  p_function_slug text,
  p_body jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url text;
  v_jwt text;
  v_req_id bigint;
BEGIN
  v_url := private.get_supabase_secret('project_url');
  v_jwt := private.get_supabase_secret('service_role_jwt');
  IF v_url IS NULL OR v_jwt IS NULL THEN
    RAISE NOTICE 'private.post_edge_function: vault entries missing (project_url / service_role_jwt). Skipping call to %.', p_function_slug;
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := v_url || '/functions/v1/' || p_function_slug,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_jwt,
      'apikey', v_jwt
    ),
    body := p_body,
    timeout_milliseconds := 8000
  ) INTO v_req_id;

  RETURN v_req_id;
END;
$$;

REVOKE ALL ON FUNCTION private.post_edge_function(text, jsonb) FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.post_notify_sms(p_job_id uuid, p_template_key text)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.post_edge_function(
    'notify-sms',
    jsonb_build_object('job_id', p_job_id::text, 'template_key', p_template_key)
  );
$$;

REVOKE ALL ON FUNCTION private.post_notify_sms(uuid, text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.fn_racquet_jobs_auto_sms()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_already boolean;
BEGIN
  IF NEW.status = 'ready_for_pickup'
     AND coalesce(OLD.status, '') <> 'ready_for_pickup'
     AND NEW.phone IS NOT NULL
     AND length(trim(NEW.phone)) > 0 THEN
    SELECT EXISTS (
      SELECT 1 FROM public.status_events
      WHERE job_id = NEW.id AND event_type = 'pickup_ready_sms_sent'
    ) INTO v_already;
    IF NOT v_already THEN
      PERFORM private.post_notify_sms(NEW.id, 'pickup_ready');
      INSERT INTO public.status_events (job_id, event_type, staff_name)
        VALUES (NEW.id, 'pickup_ready_sms_sent', 'system');
    END IF;
  END IF;

  IF NEW.payment_status = 'paid'
     AND coalesce(OLD.payment_status, '') <> 'paid'
     AND NEW.phone IS NOT NULL
     AND length(trim(NEW.phone)) > 0 THEN
    SELECT EXISTS (
      SELECT 1 FROM public.status_events
      WHERE job_id = NEW.id AND event_type = 'payment_receipt_sms_sent'
    ) INTO v_already;
    IF NOT v_already THEN
      PERFORM private.post_notify_sms(NEW.id, 'payment_receipt');
      INSERT INTO public.status_events (job_id, event_type, staff_name)
        VALUES (NEW.id, 'payment_receipt_sms_sent', 'system');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_racquet_jobs_auto_sms ON public.racquet_jobs;
CREATE TRIGGER trg_racquet_jobs_auto_sms
AFTER UPDATE ON public.racquet_jobs
FOR EACH ROW
EXECUTE FUNCTION public.fn_racquet_jobs_auto_sms();

CREATE OR REPLACE FUNCTION private.invoke_send_reminders()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.post_edge_function('send-reminders', '{}'::jsonb);
$$;

REVOKE ALL ON FUNCTION private.invoke_send_reminders() FROM PUBLIC;

DO $$
DECLARE v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'send_reminders_daily';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
END;
$$;

SELECT cron.schedule(
  'send_reminders_daily',
  '0 14 * * *',
  'SELECT private.invoke_send_reminders();'
);

DO $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'project_url'
  ) INTO v_exists;
  IF NOT v_exists THEN
    PERFORM vault.create_secret(
      'https://spaniwzjuywvwgdjycyr.supabase.co',
      'project_url',
      'StringPro project URL used by triggers and pg_cron to call edge functions'
    );
  END IF;
END;
$$;
