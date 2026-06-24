/**
 * `@vectorforge/persistence` — public API entry.
 *
 * Persistence infrastructure (ARCHITECTURE.md §11, §14): the `.vf` reader/writer
 * and migration framework, the `DocumentRepository` port with in-memory and
 * IndexedDB adapters, debounced autosave, a best-effort multi-tab lock, and the
 * `AuthProvider` port with a local (Web Crypto + IndexedDB) adapter.
 *
 * Infrastructure layer: depends on `document` + `shared` only; no editor / React.
 * Import only through this entry (ENGINE_CONTRACT.md §6 DEP-5).
 */

// .vf file format
export {
  buildVfFile,
  encodeVf,
  decodeVf,
  type VfFile,
  type VfPage,
  type VfStyles,
  type VfDocumentMeta,
  type DecodedVf,
} from './vf';

// Schema versioning + migrations
export {
  CURRENT_VF_VERSION,
  parseVersion,
  compareVersions,
  applyMigrations,
  MIGRATIONS,
  type VfVersion,
  type Migration,
  type MigrationResult,
} from './migrations';

// Document storage
export {
  type DocumentRepository,
  type StoredDocumentMeta,
  InMemoryDocumentRepository,
} from './repository';
export { IndexedDbDocumentRepository, type IndexedDbOptions } from './indexeddb-repository';
export { Autosave, type AutosaveSnapshot, type AutosaveOptions } from './autosave';
export { acquireDocumentLock, type TabLock } from './tab-lock';

// Authentication — the local (Web Crypto + IndexedDB) provider. The port +
// contracts + validation live in `shared`; re-exported here for convenience.
export { LocalAuthProvider, type LocalAuthOptions } from './auth/local-auth-provider';
export {
  type AuthProvider,
  type AuthUser,
  type AuthSession,
  type Credentials,
  type SignUpInput,
  type AuthErrorCode,
  AuthError,
  authErrorCode,
  validateEmail,
  validatePassword,
  validateSignUp,
  type FieldErrors,
} from '@vectorforge/shared';

/** Package identity (stable across the project; consumed by the app shell). */
export const PACKAGE_ID = '@vectorforge/persistence' as const;

/** Architectural layer (see docs/ENGINE_CONTRACT.md §6). */
export const LAYER = 'infrastructure' as const;
