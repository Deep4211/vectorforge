/**
 * Pure auth field validation, shared by the provider (server-side-of-the-port
 * checks) and the UI (inline form feedback) so the rules never drift. Each
 * function returns a human-readable message or `null` when valid.
 */
export interface FieldErrors {
  email?: string;
  password?: string;
  confirm?: string;
  displayName?: string;
}

/** Minimum password length (kept in one place; mirrored in the signup hint). */
export const MIN_PASSWORD_LENGTH = 8;

// Pragmatic email shape: non-empty local part, single @, dotted domain. Not RFC
// 5322 (no validator is) but rejects the mistakes users actually make.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (trimmed === '') return 'Email is required';
  if (trimmed.length > 254) return 'Email is too long';
  if (!EMAIL_RE.test(trimmed)) return 'Enter a valid email address';
  return null;
}

export function validatePassword(password: string): string | null {
  if (password === '') return 'Password is required';
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (password.length > 200) return 'Password is too long';
  // Require a mix so trivial passwords ("12345678") are rejected.
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include a letter and a number';
  }
  return null;
}

export function validateDisplayName(displayName: string): string | null {
  const trimmed = displayName.trim();
  if (trimmed.length > 60) return 'Name is too long';
  return null;
}

/** Validate a full signup form (email, password, confirmation, optional name). */
export function validateSignUp(input: {
  email: string;
  password: string;
  confirm: string;
  displayName?: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  const email = validateEmail(input.email);
  if (email) errors.email = email;
  const password = validatePassword(input.password);
  if (password) errors.password = password;
  if (input.confirm !== input.password) errors.confirm = 'Passwords do not match';
  if (input.displayName !== undefined) {
    const name = validateDisplayName(input.displayName);
    if (name) errors.displayName = name;
  }
  return errors;
}

/** True when a {@link FieldErrors} has no entries. */
export function isValid(errors: FieldErrors): boolean {
  return Object.keys(errors).length === 0;
}
