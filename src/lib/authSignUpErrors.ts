import type { AuthError } from '@supabase/supabase-js';

/** User-facing copy for Supabase Auth signUp failures. */
export function formatAuthSignUpError(error: AuthError | { message?: string }): string {
  const m = (error?.message || '').toLowerCase();
  if (
    m.includes('already registered') ||
    m.includes('already been registered') ||
    m.includes('user already exists') ||
    m.includes('email address is already') ||
    m.includes('duplicate')
  ) {
    return 'That email is already registered. Use Admin → Log in with this email, or choose a different email for a new account.';
  }
  return error?.message || 'Could not create account.';
}
