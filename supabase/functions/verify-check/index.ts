const E164_REGEX = /^\+[1-9]\d{1,14}$/;

function getVerifySecrets(): { accountSid: string; authToken: string; verifyServiceSid: string } {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')?.trim();
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')?.trim();
  const verifyServiceSid = Deno.env.get('TWILIO_VERIFY_SERVICE_SID')?.trim();
  if (!accountSid || !authToken || !verifyServiceSid) throw new Error('Missing secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID');
  return { accountSid, authToken, verifyServiceSid };
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  };
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
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const code = typeof body.code === 'string' ? body.code.trim() : '';

    if (!phone) {
      return new Response(JSON.stringify({ error: 'phone is required' }), { status: 400, headers: corsHeaders() });
    }
    if (!E164_REGEX.test(phone)) {
      return new Response(JSON.stringify({ error: 'phone must be E.164 format' }), { status: 400, headers: corsHeaders() });
    }
    if (!code) {
      return new Response(JSON.stringify({ error: 'code is required' }), { status: 400, headers: corsHeaders() });
    }

    const { accountSid, authToken, verifyServiceSid } = getVerifySecrets();

    const url = `https://verify.twilio.com/v2/Services/${verifyServiceSid}/VerificationCheck`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
      },
      body: new URLSearchParams({ To: phone, Code: code }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data.message || data.error_message || res.statusText || 'Twilio error';
      return new Response(JSON.stringify({ error: msg }), { status: res.status >= 400 ? res.status : 500, headers: corsHeaders() });
    }

    const status = data.status || 'pending';
    return new Response(
      JSON.stringify({ ok: status === 'approved', status }),
      { status: 200, headers: corsHeaders() }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal error';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders() });
  }
});
