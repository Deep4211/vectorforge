# @vectorforge/persistence

> Layer: **infrastructure** · Implementation: **Sprint 8**

Local-durable storage and the `.vf` file format. Implements the persistence
ports defined by the domain (ARCHITECTURE.md §11, §14).

## Responsibilities

- IndexedDB adapter (documents, autosave, offline op-queue, asset blobs) and a
  thin localStorage adapter (small prefs).
- Debounced, diff-based autosave with a visible status state machine.
- `.vf` reader/writer: deterministic JSON serialization, schema validation, and
  sequential idempotent migrations.
- Crash/offline recovery and last-known-good snapshots.

## Public API

Re-exported from [`src/index.ts`](./src/index.ts).

## Dependency rules

|               |                                          |
| ------------- | ---------------------------------------- |
| May import    | document, shared                         |
| Imported by   | apps/web (wired at the composition root) |
| React allowed | ❌ no                                    |

See [docs/ENGINE_CONTRACT.md §6](../../docs/ENGINE_CONTRACT.md).
