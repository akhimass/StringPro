import type { AuthError, User } from '@supabase/supabase-js';

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

/** GoTrue duplicate-email style responses (wording varies by project settings). */
export function isDuplicateOrExistingEmailSignUpError(
  error: AuthError | { message?: string; code?: string } | null | undefined
): boolean {
  if (!error) return false;
  const code = String((error as { code?: string }).code || '').toLowerCase();
  if (
    code === 'user_already_exists' ||
    code === 'email_exists' ||
    code.includes('already_registered') ||
    code.includes('identity_exists')
  ) {
    return true;
  }
  const m = (error.message || '').toLowerCase();
  return (
    m.includes('already registered') ||
    m.includes('already been registered') ||
    m.includes('user already exists') ||
    m.includes('email address is already') ||
    m.includes('duplicate')
  );
}

/**
 * After email/password signUp with "Confirm email" on, new users get a user row with identities but no session yet.
 * Obfuscated duplicate signups often return no session with an empty identities array instead.
 */
export function isEmailConfirmationPendingAfterSignUp(user: User | null | undefined): boolean {
  const ids = user?.identities;
  return Array.isArray(ids) && ids.length > 0;
}

export function formatCaughtErrorMessage(err: unknown, fallback = 'Create account failed'): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const m = (err as { message: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  return fallback;
}
