/**
 * Read and validate Edge Function secrets.
 * Set these in Supabase Dashboard → Project Settings → Edge Functions → Secrets.
 */

export interface EnvSecrets {
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_VERIFY_SERVICE_SID: string;
  TWILIO_FROM_NUMBER: string;
  EMAIL_PROVIDER_API_KEY: string;
  EMAIL_FROM: string;
  APP_BASE_URL: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

const REQUIRED_VERIFY = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_VERIFY_SERVICE_SID'] as const;
const REQUIRED_SMS = ['TWILIO_FROM_NUMBER'] as const;
const REQUIRED_EMAIL = ['EMAIL_PROVIDER_API_KEY', 'EMAIL_FROM'] as const;
const REQUIRED_SUPABASE = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;

function getEnv(name: string): string | undefined {
  return Deno.env.get(name) ?? undefined;
}

/** Validate required keys for Verify (verify-start, verify-check). */
export function getVerifySecrets(): { accountSid: string; authToken: string; verifyServiceSid: string } {
  const accountSid = getEnv('TWILIO_ACCOUNT_SID');
  const authToken = getEnv('TWILIO_AUTH_TOKEN');
  const verifyServiceSid = getEnv('TWILIO_VERIFY_SERVICE_SID');
  for (const k of REQUIRED_VERIFY) {
    const v = getEnv(k);
    if (!v?.trim()) throw new Error(`Missing or empty secret: ${k}`);
  }
  return {
    accountSid: accountSid!,
    authToken: authToken!,
    verifyServiceSid: verifyServiceSid!,
  };
}

/** Validate required keys for SMS (notify-sms). */
export function getSmsSecrets(): { accountSid: string; authToken: string; fromNumber: string } {
  getVerifySecrets(); // same Twilio creds
  const from = getEnv('TWILIO_FROM_NUMBER');
  if (!from?.trim()) throw new Error('Missing or empty secret: TWILIO_FROM_NUMBER');
  const { accountSid, authToken } = getVerifySecrets();
  return { accountSid, authToken, fromNumber: from };
}

/** Validate required keys for Email (notify-email). */
export function getEmailSecrets(): { apiKey: string; from: string } {
  const apiKey = getEnv('EMAIL_PROVIDER_API_KEY');
  const from = getEnv('EMAIL_FROM');
  if (!apiKey?.trim()) throw new Error('Missing or empty secret: EMAIL_PROVIDER_API_KEY');
  if (!from?.trim()) throw new Error('Missing or empty secret: EMAIL_FROM');
  return { apiKey: apiKey!, from: from! };
}

/** Validate Supabase URL and service role key (for DB from Edge). */
export function getSupabaseSecrets(): { url: string; serviceRoleKey: string } {
  const url = getEnv('SUPABASE_URL');
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!url?.trim()) throw new Error('Missing or empty secret: SUPABASE_URL');
  if (!key?.trim()) throw new Error('Missing or empty secret: SUPABASE_SERVICE_ROLE_KEY');
  return { url: url!, serviceRoleKey: key! };
}
