import { supabase } from '@/lib/supabase';
import type { RacquetJob } from '@/types';
import { normalizeStatusKey } from '@/types';

export type ReminderTemplateKey = 'day8_reminder' | 'day10_notice';

const MS_DAY = 24 * 60 * 60 * 1000;

/** True if job has ready_for_pickup_at, pickup not completed, and >= 8 days since ready. */
export function isDay8ReminderEligible(job: RacquetJob): boolean {
  if (normalizeStatusKey(job.status) === 'pickup_completed') return false;
  const readyAt = job.ready_for_pickup_at;
  if (!readyAt) return false;
  const ready = new Date(readyAt).getTime();
  if (Number.isNaN(ready)) return false;
  return Date.now() >= ready + 8 * MS_DAY;
}

/** True if job has ready_for_pickup_at, pickup not completed, and >= 10 days since ready. */
export function isDay10ReminderEligible(job: RacquetJob): boolean {
  if (normalizeStatusKey(job.status) === 'pickup_completed') return false;
  const readyAt = job.ready_for_pickup_at;
  if (!readyAt) return false;
  const ready = new Date(readyAt).getTime();
  if (Number.isNaN(ready)) return false;
  return Date.now() >= ready + 10 * MS_DAY;
}

/**
 * Start phone verification (OTP) via Twilio Verify.
 * Phone must be E.164 (e.g. +15551234567).
 */
export async function startPhoneVerification(
  phone: string,
  channel: 'sms' | 'whatsapp' = 'sms'
): Promise<{ ok: true }> {
  const { data, error } = await supabase.functions.invoke('verify-start', {
    body: { phone, channel },
  });

  if (error) throw new Error(error.message || 'Failed to start verification');
  if (data?.error) throw new Error(data.error);
  if (!data?.ok) throw new Error('Verification start failed');
  return { ok: true };
}

/**
 * Check verification code. Returns ok: true if status === 'approved'.
 */
export async function checkPhoneVerification(
  phone: string,
  code: string
): Promise<{ ok: boolean; status: string }> {
  const { data, error } = await supabase.functions.invoke('verify-check', {
    body: { phone, code },
  });

  if (error) throw new Error(error.message || 'Failed to verify code');
  if (data?.error) throw new Error(data.error);
  return {
    ok: data?.ok === true,
    status: data?.status ?? 'pending',
  };
}

/**
 * Send SMS reminder for a job using a template (day8_reminder or day10_notice).
 */
export async function sendSmsReminder(
  jobId: string,
  templateKey: ReminderTemplateKey,
  staffName?: string | null
): Promise<{ ok: true; sid?: string }> {
  const { data, error } = await supabase.functions.invoke('notify-sms', {
    body: { job_id: jobId, template_key: templateKey, staff_name: staffName ?? null },
  });

  if (error) throw new Error(error.message || 'Failed to send SMS');
  if (data?.error) throw new Error(data.error);
  if (!data?.ok) throw new Error('SMS send failed');
  return { ok: true, sid: data.sid };
}

/**
 * Send custom tension SMS via notify-sms, then record status_event 'tension_sms_sent'.
 * Use when final tension differs from requested and manager notifies the customer.
 */
export async function sendTensionSms(
  jobId: string,
  params: { to_phone: string; message: string; staff_name: string }
): Promise<{ ok: true; sid?: string }> {
  const { data, error } = await supabase.functions.invoke('notify-sms', {
    body: {
      job_id: jobId,
      to_phone: params.to_phone,
      message: params.message,
      staff_name: params.staff_name,
    },
  });

  if (error) throw new Error(error.message || 'Failed to send tension SMS');
  if (data?.error) throw new Error(data.error);
  if (!data?.ok) throw new Error('SMS send failed');

  await supabase.from('status_events').insert({
    job_id: jobId,
    event_type: 'tension_sms_sent',
    staff_name: params.staff_name,
  });

  return { ok: true, sid: data.sid };
}

/**
 * Send email reminder for a job using a template.
 */
export async function sendEmailReminder(
  jobId: string,
  templateKey: ReminderTemplateKey
): Promise<{ ok: true }> {
  const { data, error } = await supabase.functions.invoke('notify-email', {
    body: { job_id: jobId, template_key: templateKey },
  });

  if (error) throw new Error(error.message || 'Failed to send email');
  if (data?.error) throw new Error(data.error);
  if (!data?.ok) throw new Error('Email send failed');
  return { ok: true };
}
