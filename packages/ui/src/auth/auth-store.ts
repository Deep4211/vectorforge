import {
  authErrorCode,
  type AuthErrorCode,
  type AuthProvider,
  type AuthSession,
  type AuthUser,
  type Credentials,
  type SignUpInput,
} from '@vectorforge/shared';

/**
 * Auth state store (presentation concern). A tiny framework-agnostic external
 * store — like the theme store — that wraps the injected {@link AuthProvider}
 * port. `apps/web` supplies the concrete provider via {@link initAuth} at boot;
 * components read state through {@link useAuth} (useSyncExternalStore).
 *
 * Gating the whole app, the auth state lives ABOVE the editor's EditorProvider,
 * so it is a module singleton rather than React context.
 */
export type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  readonly status: AuthStatus;
  readonly user: AuthUser | null;
  /** A sign-in / sign-up / sign-out is in flight. */
  readonly busy: boolean;
  /** Last action's user-facing error message, or null. */
  readonly error: string | null;
}

const MESSAGES: Record<AuthErrorCode, string> = {
  'invalid-email': 'Enter a valid email address.',
  'weak-password': 'That password is too weak.',
  'email-taken': 'An account with this email already exists.',
  'invalid-credentials': 'Incorrect email or password.',
  'not-authenticated': 'Please sign in to continue.',
  unavailable: 'Storage is unavailable in this browser. Try disabling private mode.',
  unknown: 'Something went wrong. Please try again.',
};

let provider: AuthProvider | null = null;
let state: AuthState = { status: 'initializing', user: null, busy: false, error: null };
const listeners = new Set<() => void>();

function setState(patch: Partial<AuthState>): void {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

/** Wire the concrete provider (composition root). Call once at startup. */
export function initAuth(authProvider: AuthProvider): void {
  provider = authProvider;
}

/** Restore a persisted session on load. Moves status off `initializing`. */
export async function restoreSession(): Promise<void> {
  if (!provider) {
    setState({ status: 'unauthenticated', user: null });
    return;
  }
  try {
    const session = await provider.getSession();
    setState(
      session
        ? { status: 'authenticated', user: session.user, error: null }
        : { status: 'unauthenticated', user: null },
    );
  } catch {
    setState({ status: 'unauthenticated', user: null });
  }
}

async function run(action: (p: AuthProvider) => Promise<AuthSession>): Promise<boolean> {
  if (!provider) {
    setState({ error: MESSAGES.unavailable });
    return false;
  }
  setState({ busy: true, error: null });
  try {
    const session = await action(provider);
    setState({ status: 'authenticated', user: session.user, busy: false, error: null });
    return true;
  } catch (error: unknown) {
    setState({ busy: false, error: MESSAGES[authErrorCode(error)] });
    return false;
  }
}

/** Returns true on success (so the form can reset / the caller can react). */
export function signIn(credentials: Credentials): Promise<boolean> {
  return run((p) => p.signIn(credentials));
}

export function signUp(input: SignUpInput): Promise<boolean> {
  return run((p) => p.signUp(input));
}

export async function signOut(): Promise<void> {
  setState({ busy: true });
  try {
    await provider?.signOut();
  } finally {
    setState({ status: 'unauthenticated', user: null, busy: false, error: null });
  }
}

/** Clear a stale error (e.g. when the user edits a field or switches mode). */
export function clearAuthError(): void {
  if (state.error !== null) setState({ error: null });
}

export function getAuthState(): AuthState {
  return state;
}

export function subscribeAuth(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
