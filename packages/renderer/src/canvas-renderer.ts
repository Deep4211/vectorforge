import { clamp, Matrix3, viewportMatrix, type Viewport } from '@vectorforge/geometry';
import { paintItem } from './paint';
import { paintDotGrid, type DotGridOptions } from './grid';
import type {
  CanvasLike,
  Context2DLike,
  DirtyRegion,
  IRenderer,
  RendererCapabilities,
  RenderScene,
} from './types';

export interface CanvasRendererOptions {
  /** Draw the background dot grid (default true). */
  readonly showGrid?: boolean;
  readonly gridOptions?: DotGridOptions;
}

const DEFAULT_VIEWPORT: Viewport = { panX: 0, panY: 0, zoom: 1 };

/**
 * The Canvas2D renderer (ARCHITECTURE.md §7.2; V1 backend). It consumes a
 * {@link RenderScene} and paints it — never reading or mutating the document
 * (RND-1). The world is positioned by exactly one view transform
 * `scale(dpr) · translate(pan) · scale(zoom)` applied via `setTransform`, with
 * each item's own world matrix composed on top (RND-3). The backing store is
 * sized `css × dpr` so output stays crisp on retina (RND-8). Everything draws
 * through the structural {@link Context2DLike}, so the same code is exercised by
 * a recording fake in tests (RND-9).
 */
export class CanvasRenderer implements IRenderer {
  private canvas: CanvasLike | null = null;
  private ctx: Context2DLike | null = null;
  private viewport: Viewport = DEFAULT_VIEWPORT;
  private dpr = 1;
  private cssWidth = 0;
  private cssHeight = 0;
  /** Cached `scale(dpr) · viewportMatrix` — world → device pixels. */
  private base: Matrix3 = Matrix3.IDENTITY;
  private readonly showGrid: boolean;
  private gridOptions: DotGridOptions;

  constructor(options: CanvasRendererOptions = {}) {
    this.showGrid = options.showGrid ?? true;
    this.gridOptions = { ...options.gridOptions };
  }

  /** Recolor the dot grid (e.g. on a theme change). Caller repaints. */
  setGridColor(color: string): void {
    this.gridOptions = { ...this.gridOptions, color };
  }

  attach(canvas: CanvasLike): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('CanvasRenderer.attach: 2D context unavailable');
    this.canvas = canvas;
    this.ctx = ctx;
    this.recomputeBase();
  }

  resize(cssWidth: number, cssHeight: number, dpr: number): void {
    this.cssWidth = cssWidth;
    this.cssHeight = cssHeight;
    this.dpr = dpr > 0 ? dpr : 1;
    if (this.canvas) {
      this.canvas.width = Math.max(1, Math.round(cssWidth * this.dpr));
      this.canvas.height = Math.max(1, Math.round(cssHeight * this.dpr));
    }
    this.recomputeBase();
  }

  setViewport(viewport: Viewport): void {
    this.viewport = viewport;
    this.recomputeBase();
  }

  private recomputeBase(): void {
    this.base = Matrix3.scaling(this.dpr).multiply(viewportMatrix(this.viewport));
  }

  private deviceWidth(): number {
    return this.canvas?.width ?? Math.max(1, Math.round(this.cssWidth * this.dpr));
  }

  private deviceHeight(): number {
    return this.canvas?.height ?? Math.max(1, Math.round(this.cssHeight * this.dpr));
  }

  renderFrame(scene: RenderScene, dirty: DirtyRegion): void {
    const ctx = this.ctx;
    if (!ctx) return;

    ctx.save();
    this.clearAndClip(ctx, dirty);

    if (this.showGrid) {
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      paintDotGrid(
        ctx,
        this.viewport,
        { width: this.cssWidth, height: this.cssHeight },
        this.gridOptions,
      );
    }

    for (const item of scene.items) {
      ctx.save();
      const full = this.base.multiply(item.worldMatrix);
      const [a, b, c, d, e, f] = full.toArray();
      ctx.setTransform(a, b, c, d, e, f);
      ctx.globalAlpha = clamp(item.opacity, 0, 1);
      paintItem(ctx, item);
      ctx.restore();
    }

    ctx.restore();
  }

  /** Clear the whole backing store (full) or clip to the dirty box in device px (§7.3). */
  private clearAndClip(ctx: Context2DLike, dirty: DirtyRegion): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (dirty.kind === 'full') {
      ctx.clearRect(0, 0, this.deviceWidth(), this.deviceHeight());
      return;
    }
    const { box } = dirty;
    const corners = [
      this.base.transformPoint({ x: box.minX, y: box.minY }),
      this.base.transformPoint({ x: box.maxX, y: box.minY }),
      this.base.transformPoint({ x: box.maxX, y: box.maxY }),
      this.base.transformPoint({ x: box.minX, y: box.maxY }),
    ];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of corners) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const w = maxX - minX;
    const h = maxY - minY;
    ctx.clearRect(minX, minY, w, h);
    ctx.beginPath();
    ctx.rect(minX, minY, w, h);
    ctx.clip();
  }

  capabilities(): RendererCapabilities {
    return { backend: 'canvas-2d', supportsFilters: true };
  }

  dispose(): void {
    this.ctx = null;
    this.canvas = null;
  }
}
