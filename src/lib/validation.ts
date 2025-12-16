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

export default { normalizeUSPhone, isValidEmail };
