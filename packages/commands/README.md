# @vectorforge/commands

> Layer: **domain** · Status: **implemented (Sprint 3)** · Dependencies: document, geometry, shared

The command & history system (ARCHITECTURE.md §10; ENGINE_CONTRACT.md §3).
**Every** document mutation is a reversible command applied to a `SceneGraph` —
the single pathway that powers undo/redo, autosave diffs, and (via `toOp()`) the
V3 sync layer.

## Design

- **`ICommand`** — `execute` / `undo` / `redo` / `mergeWith` / `toOp`, applied
  through a `CommandContext` (`{ scene: SceneGraph }`).
- **Capture-on-execute.** Commands record their inverse ("from") state the first
  time they execute, so they compose inside a `CompositeCommand` and can be
  built without the caller knowing current scene state (CMD-1).
- **Deterministic** (CMD-7): commands depend only on their payload + the context;
  no wall-clock time or randomness.
- **`HistoryManager`** — undo/redo stacks; executing a new command clears redo
  (CMD-4); optional gesture coalescing (CMD-3); bounded depth (CMD-6).
- Selection is an editor concern (Sprint 4); commands restore _document_ state
  exactly, and the editor captures/restores selection around them.

## Commands

| Command              | Effect                                                                            |
| -------------------- | --------------------------------------------------------------------------------- |
| `CreateNodeCommand`  | add a node (undo removes)                                                         |
| `DeleteNodeCommand`  | remove a node + subtree; restores it exactly (CMD-1)                              |
| `MoveNodeCommand`    | set transform position (coalesces)                                                |
| `ResizeNodeCommand`  | set `size` (coalesces)                                                            |
| `SetPropertyCommand` | set any non-structural property (coalesces); scene guard rejects structural paths |
| `ReorderCommand`     | z-order within siblings                                                           |
| `ReparentCommand`    | move a node/subtree (cycle-checked by the scene)                                  |
| `createGroupCommand` | composite: create group + reparent children in                                    |
| `UngroupCommand`     | dissolve a group, hoisting children to its slot                                   |
| `CompositeCommand`   | atomic multi-command unit (CMD-5)                                                 |

## Usage

```ts
import { HistoryManager, MoveNodeCommand, SetPropertyCommand } from '@vectorforge/commands';
import { Vector2 } from '@vectorforge/geometry';

const history = new HistoryManager({ scene }); // scene: SceneGraph

history.execute(new MoveNodeCommand('card', new Vector2(40, 20)));
history.execute(new SetPropertyCommand('card', 'fill', '#7C5CFF'));
history.undo(); // reverts the fill
history.redo(); // re-applies it

// gesture coalescing — a whole drag collapses to one undo entry:
for (const p of dragPositions) {
  history.execute(new MoveNodeCommand('card', p), { coalesce: true });
}
```

## Testing

```bash
pnpm --filter @vectorforge/commands test   # (or `pnpm test` from the root)
```

Covers per-command invertibility (`undo(execute) === document`, incl.
delete-with-subtree and group/ungroup), redo invalidation, gesture coalescing,
composite atomicity, bounded history, determinism, and `toOp` lowering. ≥80%
coverage.

## Dependency rules

|               |                            |
| ------------- | -------------------------- |
| May import    | document, geometry, shared |
| Imported by   | editor                     |
| React allowed | ❌ no                      |

See [docs/ENGINE_CONTRACT.md §3, §6](../../docs/ENGINE_CONTRACT.md).
