import {
  IndexedDbDocumentRepository,
  LocalAuthProvider,
  type DocumentRepository,
} from '@vectorforge/persistence';
import type { AuthProvider } from '@vectorforge/shared';

/**
 * The infrastructure adapters selected at the composition root (UI-5): the local
 * (Web Crypto + IndexedDB) auth provider and the IndexedDB document repository.
 * Injectable so tests can substitute in-memory / fake-indexeddb implementations.
 */
export interface AppServices {
  readonly authProvider: AuthProvider;
  readonly repository: DocumentRepository;
}

export function createDefaultServices(): AppServices {
  return {
    authProvider: new LocalAuthProvider(),
    repository: new IndexedDbDocumentRepository(),
  };
}
