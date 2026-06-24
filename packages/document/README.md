# @vectorforge/document

> Layer: **domain** · Implementation: **Sprint 2**

The document model and scene graph — the single source of truth for everything
on the canvas (ARCHITECTURE.md §5, §9). All other layers read from or project
this model; only the command layer mutates it.

## Responsibilities

- The `BaseNode` hierarchy: Frame, Group, Shape (Rectangle/Ellipse/Line),
  Text, Image, and (V2) ComponentInstance.
- The id-indexed scene graph (`Map<NodeId, Node>` + parent/child links).
- Authoritative scene graph vs. virtual (layer-panel) groups.
- Traversal (render order, hit order, flatten), z-order, coordinate resolution.
- The `.vf` schema and deterministic (de)serialization.

## Public API

Re-exported from [`src/index.ts`](./src/index.ts).

## Dependency rules

|               |                                         |
| ------------- | --------------------------------------- |
| May import    | geometry, shared                        |
| Imported by   | commands, editor, renderer, persistence |
| React allowed | ❌ no                                   |

See [docs/ENGINE_CONTRACT.md §6](../../docs/ENGINE_CONTRACT.md).
