/**
 * The `DocumentRepository` port (ARCHITECTURE.md §4 Repository pattern): load and
 * save `.vf` text by document id. Concrete adapters (IndexedDB, and later OPFS /
 * a server) implement it; the editor/app depend only on this interface, so the
 * storage backend is swappable and tests can use the in-memory implementation.
 */
export interface StoredDocumentMeta {
  readonly id: string;
  readonly name: string;
  /** Epoch ms of the last save (caller-supplied so it stays deterministic in tests). */
  readonly updatedAt: number;
}

export interface DocumentRepository {
  /** Insert or replace the document's `.vf` text. */
  save(id: string, vf: string, name: string, updatedAt: number): Promise<void>;
  /** Return the stored `.vf` text, or null if absent. */
  load(id: string): Promise<string | null>;
  /** Metadata for every stored document, newest first. */
  list(): Promise<StoredDocumentMeta[]>;
  delete(id: string): Promise<void>;
}

interface Record_ {
  id: string;
  name: string;
  vf: string;
  updatedAt: number;
}

/** A volatile {@link DocumentRepository} for tests and ephemeral sessions. */
export class InMemoryDocumentRepository implements DocumentRepository {
  private readonly store = new Map<string, Record_>();

  save(id: string, vf: string, name: string, updatedAt: number): Promise<void> {
    this.store.set(id, { id, name, vf, updatedAt });
    return Promise.resolve();
  }

  load(id: string): Promise<string | null> {
    return Promise.resolve(this.store.get(id)?.vf ?? null);
  }

  list(): Promise<StoredDocumentMeta[]> {
    const metas = [...this.store.values()]
      .map(({ id, name, updatedAt }) => ({ id, name, updatedAt }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return Promise.resolve(metas);
  }

  delete(id: string): Promise<void> {
    this.store.delete(id);
    return Promise.resolve();
  }
}
