// Resilient Supabase client wrapper with fallback values from Lovable Cloud
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID || 'ivlzsfadwegyblvmrzao'}.supabase.co`;

const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2bHpzZmFkd2VneWJsdm1yemFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NDQyMzQsImV4cCI6MjA4MTQyMDIzNH0.lx6k4Suv9Tkp6UHLIMePeTtoNRyZ0q-_sQClRPV0dZs';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
