# @vectorforge/renderer

> Layer: **infrastructure** · Status: **implemented (Sprint 5)** · Dependencies: document, geometry, shared

The rendering engine (ARCHITECTURE.md §7; ENGINE_CONTRACT.md §4 RND-1…9). It
consumes a backend-agnostic **projection** of the scene graph and paints it —
never reading or mutating the live document (RND-1). A WebGL/WebGPU backend can
replace Canvas2D by implementing the same port and consuming the identical
`RenderScene`, with zero changes to feature code (RND-2).

## Pieces

- **`projectScene(scene, viewport, view)`** — projects the document into a
  `RenderScene`: a flat, **painter-ordered** (back-to-front), **viewport-culled**
  display list of `RenderItem`s, with effective opacity folded down the ancestry.
  Groups produce no item (their transform/opacity fold into children); off-screen
  nodes are skipped but stay fully in the model and selection (RND-6).
- **`CanvasRenderer`** — the Canvas2D backend behind the `IRenderer` port. Sizes
  the backing store to `css × devicePixelRatio` (RND-8) and positions the world
  with a single view transform `scale(dpr) · translate(pan) · scale(zoom)`, with
  each item's world matrix composed on top (RND-3). Full or dirty-rect repaints
  (§7.3). Draws frames, rectangles (incl. rounded), ellipses, lines, text and
  image placeholders.
- **`FrameScheduler`** — a single rAF-coalesced scheduler: many `requestRender()`
  calls in one tick collapse to one paint (RND-5). The frame source is injectable,
  with an optional frame-budget watchdog (RND-4).
- **`paintDotGrid`** — the infinite-canvas dot-grid overlay (adaptive spacing).

## Drive it (headless-testable)

```ts
import { CanvasRenderer, FrameScheduler, projectScene } from '@vectorforge/renderer';

const renderer = new CanvasRenderer();
renderer.attach(canvas); // an HTMLCanvasElement
renderer.resize(1280, 800, window.devicePixelRatio);
renderer.setViewport({ panX: 0, panY: 0, zoom: 1 });

const scheduler = new FrameScheduler(() => {
  const scene = projectScene(graph, viewport, { width: 1280, height: 800 });
  renderer.renderFrame(scene, { kind: 'full' });
});
scheduler.requestRender(); // editor's RenderScheduler binds here
```

The Canvas2D path is written against a structural `Context2DLike`, so the exact
draw sequence is asserted by a recording fake under Node — no DOM needed — which
also pins determinism (RND-9).

## Scope notes

Sprint 5 ships the projection, Canvas2D backend, rAF scheduler, viewport culling,
dirty-rect clipping, high-DPI and the dot grid. Deferred (documented): the spatial
acceleration structure and layer/`OffscreenCanvas` caching (Sprint 9 performance),
frame **content clipping** and gradient/shadow paints (await the richer fill model),
image bitmaps (Sprint 8 asset store), and Playwright screenshot-diff regression
across the browser matrix (needs E2E infra; the determinism tests stand in until then).

## Testing

```bash
pnpm --filter @vectorforge/renderer test
pnpm bench   # projection hot path @ 10k nodes
```

Covers projection ordering/culling (incl. margin band + edge straddle)/opacity
(full ancestor chain)/read-only immutability, per-item paint output, scheduler
coalescing + re-entrancy + budget watchdog, high-DPI sizing across resizes, the
single view transform, dirty-rect clipping under dpr/pan/zoom, and render
determinism. ~99% line coverage.

## Dependency rules

|               |                                          |
| ------------- | ---------------------------------------- |
| May import    | document, geometry, shared               |
| Imported by   | apps/web (wired at the composition root) |
| React allowed | ❌ no                                    |

See [docs/ENGINE_CONTRACT.md §2, §6](../../docs/ENGINE_CONTRACT.md).
