// Helpers for validating and normalizing user input
export function normalizeUSPhone(input: string): string | null {
  if (!input) return null;
  // Remove all non-digit characters
  const digits = input.replace(/\D/g, '');

  // Accept formats: XXXXXXXXXX, 1XXXXXXXXXX, +1XXXXXXXXXX
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // Sometimes input like +11234567890 becomes digits length 11 with leading 1 already handled
  return null;
}

export function isValidEmail(email: string): boolean {
  if (!email) return false;
  // Simple email regex for validation purposes
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/** Same upper bound as drop-off customer email in the schema. */
export const EMAIL_MAX_LENGTH = 255;

/** Minimum length for staff account passwords (sign up). */
export const STAFF_PASSWORD_MIN_LENGTH = 8;

/** Maximum length for staff account passwords (sign up). */
export const STAFF_PASSWORD_MAX_LENGTH = 128;

/** Shown near password fields on staff sign up. */
export const STAFF_PASSWORD_REQUIREMENTS_HINT =
  'At least 8 characters, including one lowercase letter, one uppercase letter, and one number.';

/**
 * Returns an error message if the password does not meet staff sign-up rules, or null if valid.
 */
export function staffSignupPasswordError(password: string): string | null {
  if (!password || password.length < STAFF_PASSWORD_MIN_LENGTH) {
    return `Use at least ${STAFF_PASSWORD_MIN_LENGTH} characters.`;
  }
  if (password.length > STAFF_PASSWORD_MAX_LENGTH) {
    return `Use at most ${STAFF_PASSWORD_MAX_LENGTH} characters.`;
  }
  if (!/[a-z]/.test(password)) {
    return 'Include at least one lowercase letter.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Include at least one uppercase letter.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Include at least one number.';
  }
  return null;
}

export default { normalizeUSPhone, isValidEmail };
