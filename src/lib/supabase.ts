// Supabase client. Requires VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY at build time (e.g. in Vercel).
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const envKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined);

const hasConfig = Boolean(envUrl?.trim() && envKey?.trim());

/** Set when Supabase env vars are missing; show UI banner and do not crash. */
export const supabaseConfigError: string | null = hasConfig
  ? null
  : 'Missing Supabase config. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY in Vercel (Production).';

if (!hasConfig) {
  console.error(
    '[StringPro] Supabase config missing. Set in Vercel: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY'
  );
}

const SUPABASE_URL =
  envUrl?.trim() ||
  (import.meta.env.DEV ? `https://${(import.meta.env.VITE_SUPABASE_PROJECT_ID as string) || 'placeholder'}.supabase.co` : '');
const SUPABASE_KEY = envKey?.trim() || (import.meta.env.DEV ? '' : '');

export const supabase = createClient<Database>(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_KEY || 'placeholder',
  {
    auth: {
      // Use sessionStorage so staff (admin/frontdesk/stringer) must log in again
      // after closing the browser, but can stay signed in during a single session.
      storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
