# @vectorforge/commands

> Layer: **domain** · Implementation: **Sprint 3**

The command & history system. **Every** document mutation is a command — this
single pathway powers undo/redo, autosave diffs, and (V3) multiplayer
synchronization (ARCHITECTURE.md §10).

## Responsibilities

- The `ICommand` contract (`execute` / `undo` / `redo` / `mergeWith` / `toOp`).
- Concrete commands: Create, Delete, Move, Resize, SetProperty, Reorder,
  Group/Ungroup, Reparent, and `CompositeCommand`.
- The `HistoryManager`: undo/redo stacks, gesture coalescing, command merging,
  bounded depth.
- `toOp()` lowering — the serializable op representation the sync layer composes with.

## Public API

Re-exported from [`src/index.ts`](./src/index.ts).

## Dependency rules

|               |                            |
| ------------- | -------------------------- |
| May import    | document, geometry, shared |
| Imported by   | editor                     |
| React allowed | ❌ no                      |

See [docs/ENGINE_CONTRACT.md §6](../../docs/ENGINE_CONTRACT.md).
