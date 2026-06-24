import type { DocumentRepository, StoredDocumentMeta } from './repository';

/**
 * IndexedDB-backed {@link DocumentRepository} (ARCHITECTURE.md §11; the V1
 * storage backend — chosen over OPFS for breadth + transactional autosave).
 * A thin Promise wrapper over the callback API; the `IDBFactory` is injected
 * (defaulting to `globalThis.indexedDB`) so tests run against `fake-indexeddb`.
 */
export interface IndexedDbOptions {
  readonly factory?: IDBFactory;
  readonly dbName?: string;
  readonly storeName?: string;
}

interface DocRecord {
  id: string;
  name: string;
  vf: string;
  updatedAt: number;
}

const DEFAULT_DB = 'vectorforge';
const DEFAULT_STORE = 'documents';

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

export class IndexedDbDocumentRepository implements DocumentRepository {
  private readonly factory: IDBFactory;
  private readonly dbName: string;
  private readonly storeName: string;
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(options: IndexedDbOptions = {}) {
    const factory = options.factory ?? globalThis.indexedDB;
    if (!factory) throw new Error('IndexedDbDocumentRepository: no IndexedDB available');
    this.factory = factory;
    this.dbName = options.dbName ?? DEFAULT_DB;
    this.storeName = options.storeName ?? DEFAULT_STORE;
  }

  private open(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = this.factory.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    });
    return this.dbPromise;
  }

  private async tx<T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => Promise<T>,
  ): Promise<T> {
    const db = await this.open();
    const transaction = db.transaction(this.storeName, mode);
    const store = transaction.objectStore(this.storeName);
    const result = await run(store);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB tx failed'));
      transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB tx aborted'));
    });
    return result;
  }

  async save(id: string, vf: string, name: string, updatedAt: number): Promise<void> {
    await this.tx('readwrite', async (store) => {
      const record: DocRecord = { id, name, vf, updatedAt };
      await promisifyRequest(store.put(record));
    });
  }

  async load(id: string): Promise<string | null> {
    return this.tx('readonly', async (store) => {
      const record = await promisifyRequest(store.get(id) as IDBRequest<DocRecord | undefined>);
      return record?.vf ?? null;
    });
  }

  async list(): Promise<StoredDocumentMeta[]> {
    return this.tx('readonly', async (store) => {
      const all = await promisifyRequest(store.getAll() as IDBRequest<DocRecord[]>);
      return all
        .map(({ id, name, updatedAt }) => ({ id, name, updatedAt }))
        .sort((a, b) => b.updatedAt - a.updatedAt);
    });
  }

  async delete(id: string): Promise<void> {
    await this.tx('readwrite', async (store) => {
      await promisifyRequest(store.delete(id));
    });
  }
}
