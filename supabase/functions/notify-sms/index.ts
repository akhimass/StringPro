import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const VALID_TEMPLATE_KEYS = ['day8_reminder', 'day10_notice', 'pickup_ready', 'payment_receipt'];

interface TwilioAuth {
  accountSid: string;
  username: string;
  password: string;
  messagingServiceSid: string | null;
  fromNumber: string | null;
}

function getTwilioAuth(): TwilioAuth {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')?.trim();
  if (!accountSid) throw new Error('Missing secret: TWILIO_ACCOUNT_SID');

  const apiKeySid = Deno.env.get('TWILIO_API_KEY_SID')?.trim();
  const apiKeySecret = Deno.env.get('TWILIO_API_KEY_SECRET')?.trim();
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')?.trim();

  let username: string;
  let password: string;
  if (apiKeySid && apiKeySecret) {
    username = apiKeySid;
    password = apiKeySecret;
  } else if (authToken) {
    username = accountSid;
    password = authToken;
  } else {
    throw new Error(
      'Missing Twilio credentials. Set TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET (preferred), or TWILIO_AUTH_TOKEN.'
    );
  }

  const messagingServiceSid = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID')?.trim() || null;
  const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER')?.trim() || null;
  if (!messagingServiceSid && !fromNumber) {
    throw new Error('Missing Twilio sender. Set TWILIO_MESSAGING_SERVICE_SID (preferred) or TWILIO_FROM_NUMBER.');
  }

  return { accountSid, username, password, messagingServiceSid, fromNumber };
}

function getSupabaseSecrets(): { url: string; serviceRoleKey: string } {
  const url = Deno.env.get('SUPABASE_URL')?.trim();
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  if (!url || !serviceRoleKey) throw new Error('Missing secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  return { url, serviceRoleKey };
}

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

function formatMoney(val: number | string | null | undefined): string {
  const n = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(n)) return '0.00';
  return n.toFixed(2);
}

interface TemplateCtx {
  member_name: string;
  ticket_number: string;
  ready_date: string;
  pickup_deadline: string;
  amount_paid: string;
  paid_at: string;
}

function renderTemplate(body: string, ctx: TemplateCtx): string {
  return body
    .replace(/\{\{member_name\}\}/g, ctx.member_name)
    .replace(/\{\{ticket_number\}\}/g, ctx.ticket_number)
    .replace(/\{\{ready_date\}\}/g, ctx.ready_date)
    .replace(/\{\{pickup_deadline\}\}/g, ctx.pickup_deadline)
    .replace(/\{\{amount_paid\}\}/g, ctx.amount_paid)
    .replace(/\{\{paid_at\}\}/g, ctx.paid_at);
}

const SMS_EVENT_BY_TEMPLATE: Record<string, string> = {
  day8_reminder: 'day8_reminder_sms_sent',
  day10_notice: 'day10_notice_sms_sent',
  pickup_ready: 'pickup_ready_sms_sent',
  payment_receipt: 'payment_receipt_sms_sent',
};

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
      return new Response(
        JSON.stringify({ error: `Either message or template_key (${VALID_TEMPLATE_KEYS.join(' | ')}) is required` }),
        { status: 400, headers: corsHeaders() }
      );
    }

    if (!checkRateLimit(jobId)) {
      return new Response(JSON.stringify({ error: 'Too many sends for this job. Try again in a minute.' }), {
        status: 429,
        headers: corsHeaders(),
      });
    }

    const { url, serviceRoleKey } = getSupabaseSecrets();
    const supabase = createClient(url, serviceRoleKey);

    const { data: job, error: jobError } = await supabase
      .from('racquet_jobs')
      .select(
        'id, member_name, ticket_number, ready_for_pickup_at, pickup_deadline, phone, amount_paid, paid_at, payment_status'
      )
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), { status: 404, headers: corsHeaders() });
    }

    const j = job as {
      id: string;
      phone?: string | null;
      member_name?: string | null;
      ticket_number?: string | null;
      ready_for_pickup_at?: string | null;
      pickup_deadline?: string | null;
      amount_paid?: number | null;
      paid_at?: string | null;
      payment_status?: string | null;
    };
    const to = toPhone || j.phone || '';
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

      const ctx: TemplateCtx = {
        member_name: j.member_name ?? 'Customer',
        ticket_number: j.ticket_number ?? 'N/A',
        ready_date: formatDate(j.ready_for_pickup_at),
        pickup_deadline: formatDate(j.pickup_deadline),
        amount_paid: formatMoney(j.amount_paid),
        paid_at: formatDate(j.paid_at),
      };
      finalMessage = renderTemplate(template.body as string, ctx);
    }

    const auth = getTwilioAuth();
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${auth.accountSid}/Messages.json`;
    const params = new URLSearchParams({ To: normalizedPhone, Body: finalMessage });
    if (auth.messagingServiceSid) {
      params.set('MessagingServiceSid', auth.messagingServiceSid);
    } else if (auth.fromNumber) {
      params.set('From', auth.fromNumber);
    }

    const twilioRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + btoa(`${auth.username}:${auth.password}`),
      },
      body: params,
    });

    const twilioData = await twilioRes.json().catch(() => ({}));
    if (!twilioRes.ok) {
      const msg = twilioData.message || twilioData.error_message || twilioRes.statusText || 'Twilio error';
      return new Response(JSON.stringify({ error: msg, code: twilioData.code }), {
        status: twilioRes.status >= 400 ? twilioRes.status : 500,
        headers: corsHeaders(),
      });
    }

    const sid = twilioData.sid || null;

    const eventType = SMS_EVENT_BY_TEMPLATE[templateKey] ?? 'sms_sent';
    await supabase.from('status_events').insert({
      job_id: jobId,
      event_type: eventType,
      staff_name: staffName,
    });

    return new Response(JSON.stringify({ ok: true, sid }), { status: 200, headers: corsHeaders() });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal error';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders() });
  }
});
