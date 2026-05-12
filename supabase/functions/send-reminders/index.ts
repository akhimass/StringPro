import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function getSupabaseSecrets(): { url: string; serviceRoleKey: string } {
  const url = Deno.env.get('SUPABASE_URL')?.trim();
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  if (!url || !serviceRoleKey) throw new Error('Missing secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  return { url, serviceRoleKey };
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  };
}

const MS_DAY = 24 * 60 * 60 * 1000;

const REMINDERS: Array<{
  templateKey: 'day8_reminder' | 'day10_notice';
  eventType: string;
  thresholdDays: number;
}> = [
  { templateKey: 'day10_notice', eventType: 'day10_notice_sms_sent', thresholdDays: 10 },
  { templateKey: 'day8_reminder', eventType: 'day8_reminder_sms_sent', thresholdDays: 8 },
];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    if (req.method !== 'POST' && req.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders() });
    }

    const { url, serviceRoleKey } = getSupabaseSecrets();
    const supabase = createClient(url, serviceRoleKey);

    const now = Date.now();
    const summary: { sent: number; skipped: number; failed: number; details: Array<Record<string, unknown>> } = {
      sent: 0,
      skipped: 0,
      failed: 0,
      details: [],
    };

    for (const r of REMINDERS) {
      const cutoffIso = new Date(now - r.thresholdDays * MS_DAY).toISOString();

      const { data: jobs, error } = await supabase
        .from('racquet_jobs')
        .select('id, phone, status, ready_for_pickup_at')
        .neq('status', 'pickup_completed')
        .not('ready_for_pickup_at', 'is', null)
        .lte('ready_for_pickup_at', cutoffIso)
        .not('phone', 'is', null);

      if (error) {
        summary.failed++;
        summary.details.push({ template: r.templateKey, error: error.message });
        continue;
      }

      for (const job of (jobs ?? []) as Array<{ id: string; phone: string | null }>) {
        if (!job.phone || job.phone.trim().length === 0) {
          summary.skipped++;
          continue;
        }

        const { data: priorEvent } = await supabase
          .from('status_events')
          .select('id')
          .eq('job_id', job.id)
          .eq('event_type', r.eventType)
          .limit(1)
          .maybeSingle();

        if (priorEvent) {
          summary.skipped++;
          continue;
        }

        const { data: invokeData, error: invokeErr } = await supabase.functions.invoke('notify-sms', {
          body: { job_id: job.id, template_key: r.templateKey, staff_name: 'cron' },
        });

        if (invokeErr || (invokeData as { error?: string } | null)?.error) {
          summary.failed++;
          summary.details.push({
            job_id: job.id,
            template: r.templateKey,
            error: invokeErr?.message ?? (invokeData as { error?: string } | null)?.error ?? 'unknown error',
          });
          continue;
        }

        summary.sent++;
      }
    }

    return new Response(JSON.stringify({ ok: true, ...summary }), { status: 200, headers: corsHeaders() });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal error';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders() });
  }
});
