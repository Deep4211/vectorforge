import type { BoundingBox, Matrix3, Point, Viewport } from '@vectorforge/geometry';
import type { Color, ImageFit, NodeId, Size, TextAlign } from '@vectorforge/document';

/**
 * Renderer types (ARCHITECTURE.md §7; ENGINE_CONTRACT.md §4 RND-1..9).
 *
 * The renderer consumes a {@link RenderScene} projection and produces pixels; it
 * never walks or mutates the live document (RND-1). All drawing goes through the
 * {@link IRenderer} port (RND-2) and a structural {@link Context2DLike} surface,
 * so the Canvas2D backend is swappable and unit-testable without a real DOM.
 */

/** CSS-pixel viewport size of the canvas element. */
export interface ViewSize {
  readonly width: number;
  readonly height: number;
}

// ---------------------------------------------------------------------------
// Display list — the renderer-facing projection (flat, culled, z-sorted).
// ---------------------------------------------------------------------------

/** Fields shared by every paintable item. `worldMatrix` maps node-local → world. */
interface RenderItemBase {
  readonly id: NodeId;
  /** Local → world affine; the view transform is applied on top of this (RND-3). */
  readonly worldMatrix: Matrix3;
  /** Effective opacity: the node's own opacity times every ancestor's (0–1). */
  readonly opacity: number;
  /** World-space AABB, used for culling and dirty regions (`null` when unbounded). */
  readonly worldBounds: BoundingBox | null;
}

export interface FrameItem extends RenderItemBase {
  readonly kind: 'frame';
  readonly size: Size;
  readonly backgroundColor: Color;
  readonly clipsContent: boolean;
}

export interface RectangleItem extends RenderItemBase {
  readonly kind: 'rectangle';
  readonly size: Size;
  readonly fill: Color;
  readonly cornerRadius: number;
}

export interface EllipseItem extends RenderItemBase {
  readonly kind: 'ellipse';
  readonly size: Size;
  readonly fill: Color;
}

export interface LineItem extends RenderItemBase {
  readonly kind: 'line';
  readonly a: Point;
  readonly b: Point;
  readonly stroke: Color;
  readonly strokeWidth: number;
}

export interface TextItem extends RenderItemBase {
  readonly kind: 'text';
  readonly content: string;
  readonly fontFamily: string;
  readonly fontWeight: number;
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly letterSpacing: number;
  readonly textAlign: TextAlign;
  readonly fill: Color;
  readonly size: Size | null;
}

export interface ImageItem extends RenderItemBase {
  readonly kind: 'image';
  readonly size: Size;
  readonly assetRef: string;
  readonly fit: ImageFit;
}

/** A single drawable. Groups produce no item — their transform/opacity fold into children. */
export type RenderItem = FrameItem | RectangleItem | EllipseItem | LineItem | TextItem | ImageItem;

/**
 * The immutable, renderer-facing projection of the document for one viewport:
 * a flat, viewport-culled, painter-ordered (back-to-front) display list.
 */
export interface RenderScene {
  /** Painter order (back-to-front), already culled to the viewport. */
  readonly items: readonly RenderItem[];
  /** Count of paintable nodes before culling (for telemetry: culled = total − items.length). */
  readonly totalCount: number;
}

// ---------------------------------------------------------------------------
// Frame scheduling + dirty regions.
// ---------------------------------------------------------------------------

/**
 * What changed since the last paint. A `full` repaint clears the whole canvas
 * (pan/zoom/resize); a `rect` repaint clips to a world-space box (single-node
 * edits) so cost stays near-constant regardless of document size (§7.3).
 */
export type DirtyRegion =
  | { readonly kind: 'full' }
  | { readonly kind: 'rect'; readonly box: BoundingBox };

/** The minimal scheduler surface the editor binds to (mirrors EDT's `RenderScheduler`). */
export interface RenderSchedulerLike {
  requestRender(): void;
}

// ---------------------------------------------------------------------------
// The renderer port (RND-2) and its structural Canvas2D surface.
// ---------------------------------------------------------------------------

export interface RendererCapabilities {
  readonly backend: string;
  readonly supportsFilters: boolean;
  readonly maxTextureSize?: number;
}

/**
 * The renderer port. All rendering flows through this interface; feature code
 * never touches a backend API directly (RND-2). A WebGL/WebGPU backend slots in
 * by implementing this and consuming the identical {@link RenderScene}.
 */
export interface IRenderer {
  attach(canvas: CanvasLike): void;
  /** Size the backing store to `css × dpr` and keep drawing in CSS pixels (RND-8). */
  resize(cssWidth: number, cssHeight: number, dpr: number): void;
  setViewport(viewport: Viewport): void;
  renderFrame(scene: RenderScene, dirty: DirtyRegion): void;
  capabilities(): RendererCapabilities;
  dispose(): void;
}

/**
 * The subset of `CanvasRenderingContext2D` the renderer uses. Declaring it
 * structurally lets a real 2D context satisfy it while a lightweight recording
 * fake drives deterministic unit tests (RND-9) under Node.
 */
export interface Context2DLike {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  lineJoin: CanvasLineJoin;
  globalAlpha: number;
  font: string;
  /** Per-character spacing, e.g. `"-0.5px"`. Optional: a newer Canvas2D property. */
  letterSpacing?: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  save(): void;
  restore(): void;
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  rect(x: number, y: number, w: number, h: number): void;
  arc(x: number, y: number, r: number, start: number, end: number, ccw?: boolean): void;
  ellipse(
    x: number,
    y: number,
    rx: number,
    ry: number,
    rotation: number,
    start: number,
    end: number,
    ccw?: boolean,
  ): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  fill(): void;
  stroke(): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number, maxWidth?: number): void;
  clip(): void;
}

/** The subset of `HTMLCanvasElement` the renderer needs to attach and size. */
export interface CanvasLike {
  width: number;
  height: number;
  getContext(contextId: '2d'): Context2DLike | null;
}
