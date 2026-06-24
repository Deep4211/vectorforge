/**
 * The `AuthProvider` port + shared auth contracts. Lives in `shared` (the leaf
 * layer) so both the presentation layer (`ui` — auth store + forms) and the
 * infrastructure adapter (`persistence` — the local Web Crypto + IndexedDB
 * provider) depend on the same interface without crossing layer boundaries.
 *
 * Authentication is modeled as a swappable adapter (like the document
 * repository): the UI depends only on this interface, so the bundled on-device
 * provider can be replaced by a real backend (Supabase / Auth0 / a custom API)
 * without touching the screens.
 */
export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly createdAt: number;
}

export interface AuthSession {
  readonly user: AuthUser;
  /** Opaque session token (random; rotated on each sign-in). */
  readonly token: string;
  /** Epoch ms after which the session is invalid and a re-login is required. */
  readonly expiresAt: number;
}

export interface Credentials {
  readonly email: string;
  readonly password: string;
}

export interface SignUpInput {
  readonly email: string;
  readonly password: string;
  readonly displayName?: string;
}

export type AuthErrorCode =
  | 'invalid-email'
  | 'weak-password'
  | 'email-taken'
  | 'invalid-credentials'
  | 'not-authenticated'
  | 'unavailable'
  | 'unknown';

/** A typed auth failure. The UI maps `code` to a user-facing message. */
export class AuthError extends Error {
  constructor(
    readonly code: AuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/** Narrow an unknown thrown value to an {@link AuthErrorCode} (defaults to `unknown`). */
export function authErrorCode(error: unknown): AuthErrorCode {
  if (error instanceof AuthError) return error.code;
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: unknown }).code;
    if (typeof code === 'string') return code as AuthErrorCode;
  }
  return 'unknown';
}

export interface AuthProvider {
  /** Create an account and start a session. Throws {@link AuthError} `email-taken`/`invalid-email`/`weak-password`. */
  signUp(input: SignUpInput): Promise<AuthSession>;
  /** Verify credentials and start a session. Throws {@link AuthError} `invalid-credentials` (never reveals which field). */
  signIn(credentials: Credentials): Promise<AuthSession>;
  /** End the current session. Idempotent. */
  signOut(): Promise<void>;
  /** The persisted session if present and unexpired, else null (for restore-on-load). */
  getSession(): Promise<AuthSession | null>;
}
