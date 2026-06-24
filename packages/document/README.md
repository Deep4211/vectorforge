# @vectorforge/document

> Layer: **domain** · Status: **implemented (Sprint 2)** · Dependencies: geometry, shared

The authoritative document model and scene graph — the single source of truth
for everything on the canvas (ARCHITECTURE.md §5, §9; ENGINE_CONTRACT.md §1).
Every other layer reads from or projects this model; only the command layer
(Sprint 3) mutates it (DOC-2).

## Design

- **Immutable node values, mutable container.** Nodes are immutable readonly
  data; the `SceneGraph` is the authoritative id-indexed `Map` that mutations
  _replace_ nodes in (never edit) and bump a `version` (ARCHITECTURE.md §4.4,
  §5.7). This is what the Sprint 3 commands will wrap.
- **Hierarchy as a discriminated union.** `SceneNode = FrameNode | GroupNode |
RectangleNode | EllipseNode | LineNode | TextNode | ImageNode` over a shared
  `BaseNode` — the §5.2 hierarchy expressed as idiomatic, serialization-friendly
  data (reconciliation with the §5.3 `abstract class` sketch).
- **Sibling order is z-order** (no separate `zIndex` field to desync,
  ARCHITECTURE.md §5.8).
- **Effective lock/visibility are computed** from ancestors; a node's own flags
  are never overwritten, so they're restorable (PRD / DOC).
- **Local coordinates** (DOC-5): each node's `transform` is local; the
  `SceneGraph` resolves world matrices through ancestors (cached).

## Public API

| Export                                                                                                            | Summary                                          |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `SceneNode` + `FrameNode`/`GroupNode`/`RectangleNode`/`EllipseNode`/`LineNode`/`TextNode`/`ImageNode`, `BaseNode` | node types                                       |
| `createFrame`/`createGroup`/`createRectangle`/`createEllipse`/`createLine`/`createText`/`createImage`             | factories (defaults, DOC-8 names, DOC-11 clamps) |
| `withName`/`withTransform`/`withVisibility`/`withLocked`/`withOpacity`/`withMetadata`                             | immutable base-field updates                     |
| `SceneGraph`                                                                                                      | the authoritative container (below)              |
| `createSequentialIdGenerator`, `IdGenerator`                                                                      | deterministic node ids                           |
| `serializeNode`/`deserializeNode`/`serializeDocument`/`parseDocument`/`stableStringify`                           | deterministic, validated serialization           |
| `SerializedDocument`/`SerializedNode`/`TreeNode`, `SCHEMA_VERSION`                                                | wire/projection types                            |

### `SceneGraph`

```ts
import { SceneGraph, createFrame, createRectangle } from '@vectorforge/document';

const g = SceneGraph.empty();
g.add(createFrame({ id: 'home', size: { w: 390, h: 844 } }));
g.add(createRectangle({ id: 'card', size: { w: 342, h: 156 } }), 'home');

g.childrenOf('home'); // ['card']
g.flatten(); // render order (back-to-front)
g.hitOrder(); // front-to-back
g.worldMatrix('card'); // ancestor-composed transform (cached)
g.worldBounds('card'); // world AABB
g.bringToFront('card'); // z-order
g.reparent('card', null); // move (cycle-checked)
g.isEffectivelyVisible('card');

const removed = g.remove('card'); // capture subtree…
g.insertSubtree(removed); // …restore at the same slot (undo support)

const json = g.serialize(); // deterministic, diff-friendly
const restored = SceneGraph.fromJSON(json); // validated round-trip
```

Queries: `get`/`getOrThrow`/`has`/`roots`/`childrenOf`/`parentOf`/`descendants`/
`ancestors`/`renderTree`/`outlineTree`/`version`/`size`. Mutations:
`add`/`update`/`remove`/`insertSubtree`/`reparent`/`reorder`/`bringToFront`/
`sendToBack`/`bringForward`/`sendBackward`/`setVisibility`/`setLocked`.

## Serialization

`serialize()` produces deterministic JSON (recursively sorted keys; nodes
id-sorted; root order preserved via `rootIds`), so files diff cleanly and
round-trip losslessly (DOC-9). `fromJSON` validates shape and graph integrity —
unknown types, empty names, bad transforms, dangling/duplicate links, and cycles
are rejected (DOC-10). The full `.vf` envelope (pages, styles, components,
versions) is added in Sprint 8.

## Scope notes

- **Virtual groups** (ARCHITECTURE.md §5.4): the `renderTree()`/`outlineTree()`
  seam exists now (`outlineTree` mirrors `renderTree`); the virtual-group overlay
  is a layer-panel concern delivered in Sprint 7.
- **World-matrix caching** is coarse (invalidated on any mutation); fine-grained
  per-subtree dirtying is a Sprint 9 optimization.
- **ComponentInstance** nodes arrive with the components system (V2).

## Testing

```bash
pnpm --filter @vectorforge/document test   # (or `pnpm test` from the root)
```

Covers structure/queries, z-order, traversal, reparent + cycle rejection,
remove/restore (z-order intact), effective lock/visibility cascade, world
transform/bounds, the `update` structural guard, and serialization round-trip /
determinism / validation. ~99% line coverage.

## Dependency rules

|               |                                         |
| ------------- | --------------------------------------- |
| May import    | geometry, shared                        |
| Imported by   | commands, editor, renderer, persistence |
| React allowed | ❌ no                                   |

See [docs/ENGINE_CONTRACT.md §6](../../docs/ENGINE_CONTRACT.md).
