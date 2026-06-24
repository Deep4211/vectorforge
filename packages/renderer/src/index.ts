/**
 * `@vectorforge/renderer` — public API entry.
 *
 * Rendering infrastructure (ARCHITECTURE.md §7; ENGINE_CONTRACT.md §4 RND-1..9):
 * the {@link IRenderer} port, the {@link RenderScene} projection (flat, culled,
 * z-sorted display list), the Canvas2D backend {@link CanvasRenderer}, the
 * rAF-coalesced {@link FrameScheduler}, viewport culling and the dot-grid
 * overlay. Read-only over the document; a backend swap touches nothing outside
 * this package.
 *
 * Import only through this entry (ENGINE_CONTRACT.md §6 DEP-5).
 */

// Scene projection + culling
export {
  projectScene,
  type ProjectionOptions,
  type MovePreview,
  type ResizePreview,
} from './projection';
export { visibleWorldBox, DEFAULT_CULL_MARGIN } from './culling';

// Canvas2D backend + drawing
export { CanvasRenderer, type CanvasRendererOptions } from './canvas-renderer';
export { paintItem } from './paint';
export { paintDotGrid, type DotGridOptions } from './grid';

// Frame scheduling
export { FrameScheduler, type FrameSchedulerOptions } from './scheduler';

// Port + projection types
export type {
  IRenderer,
  RenderScene,
  RenderItem,
  FrameItem,
  RectangleItem,
  EllipseItem,
  LineItem,
  TextItem,
  ImageItem,
  DirtyRegion,
  RendererCapabilities,
  RenderSchedulerLike,
  CanvasLike,
  Context2DLike,
  ViewSize,
} from './types';

/** Package identity (stable across the project; consumed by the app shell). */
export const PACKAGE_ID = '@vectorforge/renderer' as const;

/** Architectural layer (see docs/ENGINE_CONTRACT.md §6). */
export const LAYER = 'infrastructure' as const;
