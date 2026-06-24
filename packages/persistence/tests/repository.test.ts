import { describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import {
  IndexedDbDocumentRepository,
  InMemoryDocumentRepository,
  type DocumentRepository,
} from '@vectorforge/persistence';

function suite(name: string, make: () => DocumentRepository): void {
  describe(name, () => {
    it('saves and loads .vf text by id', async () => {
      const repo = make();
      expect(await repo.load('a')).toBeNull();
      await repo.save('a', '{"version":"1.0"}', 'Doc A', 100);
      expect(await repo.load('a')).toBe('{"version":"1.0"}');
    });

    it('replaces on re-save and lists metadata newest-first', async () => {
      const repo = make();
      await repo.save('a', 'va', 'A', 100);
      await repo.save('b', 'vb', 'B', 300);
      await repo.save('a', 'va2', 'A2', 200); // update a (newer)

      expect(await repo.load('a')).toBe('va2');
      const list = await repo.list();
      expect(list.map((m) => m.id)).toEqual(['b', 'a']); // by updatedAt desc
      expect(list[0]).toMatchObject({ id: 'b', name: 'B', updatedAt: 300 });
    });

    it('deletes a document', async () => {
      const repo = make();
      await repo.save('a', 'va', 'A', 100);
      await repo.delete('a');
      expect(await repo.load('a')).toBeNull();
      expect(await repo.list()).toEqual([]);
    });
  });
}

suite('InMemoryDocumentRepository', () => new InMemoryDocumentRepository());
suite(
  'IndexedDbDocumentRepository (fake-indexeddb)',
  () =>
    new IndexedDbDocumentRepository({ factory: new IDBFactory(), dbName: `db-${Math.random()}` }),
);
