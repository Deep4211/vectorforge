# @vectorforge/renderer

> Layer: **infrastructure** · Implementation: **Sprint 5**

The rendering engine. Consumes a backend-agnostic projection of the scene graph
and paints it; designed so a WebGL/WebGPU backend can replace Canvas2D without
touching any feature code (ARCHITECTURE.md §7).

## Responsibilities

- The `IRenderer` port and the `RenderScene` display-list projection.
- `CanvasRenderer` (Canvas 2D) for V1.
- Render queue, viewport culling, dirty-rectangle rendering, layer caching.
- High-DPI handling and the rAF-coalesced frame scheduler.

The renderer **reads** the document projection; it never mutates the model.

## Public API

Re-exported from [`src/index.ts`](./src/index.ts).

## Dependency rules

|               |                                          |
| ------------- | ---------------------------------------- |
| May import    | document, geometry, shared               |
| Imported by   | apps/web (wired at the composition root) |
| React allowed | ❌ no                                    |

See [docs/ENGINE_CONTRACT.md §2, §6](../../docs/ENGINE_CONTRACT.md).
