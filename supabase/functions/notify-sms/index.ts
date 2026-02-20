import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const VALID_TEMPLATE_KEYS = ['day8_reminder', 'day10_notice'];

function getSmsSecrets(): { accountSid: string; authToken: string; fromNumber: string } {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')?.trim();
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')?.trim();
  const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER')?.trim();
  if (!accountSid || !authToken) throw new Error('Missing secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN');
  if (!fromNumber) throw new Error('Missing secret: TWILIO_FROM_NUMBER');
  return { accountSid, authToken, fromNumber };
}

function getSupabaseSecrets(): { url: string; serviceRoleKey: string } {
  const url = Deno.env.get('SUPABASE_URL')?.trim();
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  if (!url || !serviceRoleKey) throw new Error('Missing secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  return { url, serviceRoleKey };
}

// Naive rate limit: job_id -> timestamps
const rateLimit = new Map<string, number[]>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;

function checkRateLimit(jobId: string): boolean {
  const now = Date.now();
  let list = rateLimit.get(jobId) ?? [];
  list = list.filter((t) => now - t < RATE_WINDOW_MS);
  if (list.length >= RATE_MAX) return false;
  list.push(now);
  rateLimit.set(jobId, list);
  return true;
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  };
}

function formatDate(val: string | null | undefined): string {
  if (!val) return 'N/A';
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'N/A';
  }
}

function renderTemplate(body: string, ctx: { member_name: string; ticket_number: string; ready_date: string; pickup_deadline: string }): string {
  return body
    .replace(/\{\{member_name\}\}/g, ctx.member_name)
    .replace(/\{\{ticket_number\}\}/g, ctx.ticket_number)
    .replace(/\{\{ready_date\}\}/g, ctx.ready_date)
    .replace(/\{\{pickup_deadline\}\}/g, ctx.pickup_deadline);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders() });
    }

    const body = await req.json().catch(() => ({}));
    const jobId = typeof body.job_id === 'string' ? body.job_id.trim() : '';
    const templateKey = typeof body.template_key === 'string' ? body.template_key.trim() : '';
    const toPhone = typeof body.to_phone === 'string' ? body.to_phone.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : null;
    const staffName = typeof body.staff_name === 'string' ? body.staff_name.trim() || null : null;

    if (!jobId) {
      return new Response(JSON.stringify({ error: 'job_id is required' }), { status: 400, headers: corsHeaders() });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(jobId)) {
      return new Response(JSON.stringify({ error: 'Invalid job_id' }), { status: 400, headers: corsHeaders() });
    }

    if (!message && !VALID_TEMPLATE_KEYS.includes(templateKey)) {
      return new Response(JSON.stringify({ error: 'Either message or template_key (day8_reminder | day10_notice) is required' }), {
        status: 400,
        headers: corsHeaders(),
      });
    }

    if (!checkRateLimit(jobId)) {
      return new Response(JSON.stringify({ error: 'Too many sends for this job. Try again in a minute.' }), {
        status: 429,
        headers: corsHeaders(),
      });
    }

    const { url, serviceRoleKey } = getSupabaseSecrets();
    const supabase = createClient(url, serviceRoleKey);

    const { data: job, error: jobError } = await supabase.from('racquet_jobs').select('id, member_name, ticket_number, ready_for_pickup_at, pickup_deadline, phone').eq('id', jobId).single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), { status: 404, headers: corsHeaders() });
    }

    const to = toPhone || (job as { phone?: string }).phone || '';
    if (!to) {
      return new Response(JSON.stringify({ error: 'No phone number for this job. Provide to_phone or ensure job has phone.' }), {
        status: 400,
        headers: corsHeaders(),
      });
    }

    const e164 = /^\+[1-9]\d{1,14}$/;
    const normalizedPhone = to.startsWith('+') ? to : `+1${to.replace(/\D/g, '')}`;
    if (!e164.test(normalizedPhone)) {
      return new Response(JSON.stringify({ error: 'Invalid phone number format' }), { status: 400, headers: corsHeaders() });
    }

    let finalMessage: string;
    if (message) {
      finalMessage = message;
    } else {
      const { data: template, error: tErr } = await supabase
        .from('message_templates')
        .select('body')
        .eq('template_key', templateKey)
        .single();

      if (tErr || !template?.body) {
        return new Response(JSON.stringify({ error: `Template not found: ${templateKey}` }), { status: 404, headers: corsHeaders() });
      }

      const j = job as { member_name?: string; ticket_number?: string; ready_for_pickup_at?: string; pickup_deadline?: string };
      finalMessage = renderTemplate(template.body, {
        member_name: j.member_name ?? 'Customer',
        ticket_number: j.ticket_number ?? 'N/A',
        ready_date: formatDate(j.ready_for_pickup_at),
        pickup_deadline: formatDate(j.pickup_deadline),
      });
    }

    const { accountSid, authToken, fromNumber } = getSmsSecrets();
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const twilioRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
      },
      body: new URLSearchParams({
        To: normalizedPhone,
        From: fromNumber,
        Body: finalMessage,
      }),
    });

    const twilioData = await twilioRes.json().catch(() => ({}));
    if (!twilioRes.ok) {
      const msg = twilioData.message || twilioData.error_message || twilioRes.statusText || 'Twilio error';
      return new Response(JSON.stringify({ error: msg }), {
        status: twilioRes.status >= 400 ? twilioRes.status : 500,
        headers: corsHeaders(),
      });
    }

    const sid = twilioData.sid || null;

    await supabase.from('status_events').insert({
      job_id: jobId,
      event_type: 'sms_sent',
      staff_name: staffName,
    });

    return new Response(JSON.stringify({ ok: true, sid }), { status: 200, headers: corsHeaders() });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal error';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders() });
  }
});
