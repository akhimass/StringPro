import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const VALID_TEMPLATE_KEYS = ['day8_reminder', 'day10_notice'];

function getEmailSecrets(): { apiKey: string; from: string } {
  const apiKey = Deno.env.get('EMAIL_PROVIDER_API_KEY')?.trim();
  const from = Deno.env.get('EMAIL_FROM')?.trim();
  if (!apiKey) throw new Error('Missing secret: EMAIL_PROVIDER_API_KEY');
  if (!from) throw new Error('Missing secret: EMAIL_FROM');
  return { apiKey, from };
}

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

function formatDate(val: string | null | undefined): string {
  if (!val) return 'N/A';
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'N/A';
  }
}

function renderTemplate(
  text: string,
  ctx: { member_name: string; ticket_number: string; ready_date: string; pickup_deadline: string }
): string {
  return text
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
    const toEmail = typeof body.to_email === 'string' ? body.to_email.trim() : '';
    const subject = typeof body.subject === 'string' ? body.subject.trim() : null;
    const bodyHtml = typeof body.body === 'string' ? body.body.trim() : null;

    if (!jobId) {
      return new Response(JSON.stringify({ error: 'job_id is required' }), { status: 400, headers: corsHeaders() });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(jobId)) {
      return new Response(JSON.stringify({ error: 'Invalid job_id' }), { status: 400, headers: corsHeaders() });
    }

    if (!bodyHtml && !VALID_TEMPLATE_KEYS.includes(templateKey)) {
      return new Response(JSON.stringify({ error: 'Either body or template_key (day8_reminder | day10_notice) is required' }), {
        status: 400,
        headers: corsHeaders(),
      });
    }

    const { url, serviceRoleKey } = getSupabaseSecrets();
    const supabase = createClient(url, serviceRoleKey);

    const { data: job, error: jobError } = await supabase
      .from('racquet_jobs')
      .select('id, member_name, ticket_number, ready_for_pickup_at, pickup_deadline, email')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), { status: 404, headers: corsHeaders() });
    }

    const j = job as { email?: string | null; member_name?: string; ticket_number?: string; ready_for_pickup_at?: string; pickup_deadline?: string };
    const to = toEmail || j.email || '';
    if (!to) {
      return new Response(JSON.stringify({ error: 'No email for this job. Provide to_email or ensure job has email.' }), {
        status: 400,
        headers: corsHeaders(),
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), { status: 400, headers: corsHeaders() });
    }

    let finalSubject: string;
    let finalBody: string;

    if (bodyHtml) {
      finalSubject = subject || 'Notification';
      finalBody = bodyHtml;
    } else {
      const { data: template, error: tErr } = await supabase
        .from('message_templates')
        .select('subject, body')
        .eq('template_key', templateKey)
        .single();

      if (tErr || !template?.body) {
        return new Response(JSON.stringify({ error: `Template not found: ${templateKey}` }), { status: 404, headers: corsHeaders() });
      }

      const ctx = {
        member_name: j.member_name ?? 'Customer',
        ticket_number: j.ticket_number ?? 'N/A',
        ready_date: formatDate(j.ready_for_pickup_at),
        pickup_deadline: formatDate(j.pickup_deadline),
      };
      finalSubject = (template as { subject?: string }).subject ? renderTemplate((template as { subject: string }).subject, ctx) : 'Your racquet is ready for pickup';
      finalBody = renderTemplate(template.body, ctx);
    }

    const { apiKey, from } = getEmailSecrets();

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: finalSubject,
        html: finalBody.replace(/\n/g, '<br>\n'),
      }),
    });

    const resendData = await resendRes.json().catch(() => ({}));

    if (!resendRes.ok) {
      const msg = resendData.message || resendData.error || resendRes.statusText || 'Email provider error';
      return new Response(JSON.stringify({ error: msg }), {
        status: resendRes.status >= 400 ? resendRes.status : 500,
        headers: corsHeaders(),
      });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders() });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal error';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders() });
  }
});
