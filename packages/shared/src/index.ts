/**
 * `@vectorforge/shared` — public API entry.
 *
 * Cross-cutting primitives depended on by every layer. Currently: the
 * `AuthProvider` port + auth contracts and the pure auth field validation,
 * shared by the presentation layer (forms) and the infrastructure adapter
 * (the local provider) so the rules never drift across the layer boundary.
 *
 * Import only through this entry (ENGINE_CONTRACT.md §6 DEP-5).
 */
export {
  type AuthUser,
  type AuthSession,
  type Credentials,
  type SignUpInput,
  type AuthErrorCode,
  type AuthProvider,
  AuthError,
  authErrorCode,
} from './auth';
export {
  type FieldErrors,
  MIN_PASSWORD_LENGTH,
  validateEmail,
  validatePassword,
  validateDisplayName,
  validateSignUp,
  isValid,
} from './auth-validation';

/** Package identity (stable across the project; consumed by the app shell). */
export const PACKAGE_ID = '@vectorforge/shared' as const;

/** Architectural layer (see docs/ENGINE_CONTRACT.md §6). */
export const LAYER = 'cross-cutting' as const;
