
-- Add new columns to racquet_jobs for assignment, service type, tension overrides, and pickup tracking
ALTER TABLE public.racquet_jobs
  ADD COLUMN IF NOT EXISTS service_type text NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS assigned_stringer text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS racquet_max_tension_lbs numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tension_override_lbs numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tension_override_by text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tension_override_reason text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ready_for_pickup_at timestamptz DEFAULT NULL;

-- Create message_templates table
CREATE TABLE IF NOT EXISTS public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL UNIQUE,
  label text NOT NULL,
  subject text,
  body text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view message_templates" ON public.message_templates FOR SELECT USING (true);
CREATE POLICY "Anyone can insert message_templates" ON public.message_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update message_templates" ON public.message_templates FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete message_templates" ON public.message_templates FOR DELETE USING (true);

-- Seed default reminder templates
INSERT INTO public.message_templates (template_key, label, subject, body) VALUES
  ('day8_reminder', 'Day 8 Pickup Reminder', 'Your racquet is ready for pickup', 'Hi {{member_name}}, your racquet (Ticket: {{ticket_number}}) has been ready for pickup since {{ready_date}}. Please pick it up within 2 days. Thank you! - CAN-AM Elite Badminton Club'),
  ('day10_notice', 'Day 10 Final Notice', 'Final notice: Racquet pickup overdue', 'Hi {{member_name}}, your racquet (Ticket: {{ticket_number}}) pickup is now overdue. Please pick it up as soon as possible or contact us. Storage fees may apply. - CAN-AM Elite Badminton Club')
ON CONFLICT (template_key) DO NOTHING;

-- Index for pickup reminders
CREATE INDEX IF NOT EXISTS idx_racquet_jobs_ready_for_pickup_at ON public.racquet_jobs (ready_for_pickup_at) WHERE ready_for_pickup_at IS NOT NULL;
