import { worldToScreen, type Viewport } from '@vectorforge/geometry';
import type { Context2DLike, ViewSize } from './types';

export interface DotGridOptions {
  /** Base spacing between dots in world units (doubled adaptively as you zoom out). */
  readonly spacing?: number;
  readonly color?: string;
  /** Minimum on-screen spacing (CSS px) before the grid coarsens, so it never gets noisy. */
  readonly minScreenSpacing?: number;
  /** Safety cap: skip the grid entirely rather than draw more dots than this. */
  readonly maxDots?: number;
}

const DEFAULTS = {
  spacing: 8,
  color: '#D1D5DB',
  minScreenSpacing: 12,
  maxDots: 20000,
};

/**
 * Paint the infinite-canvas dot grid as a background overlay, in CSS-pixel
 * screen space (the renderer sets the dpr transform before calling this). The
 * world spacing coarsens by doubling until dots are at least `minScreenSpacing`
 * apart, so the grid stays legible at every zoom; if the visible region would
 * need more than `maxDots`, the grid is skipped rather than blowing the budget.
 */
export function paintDotGrid(
  ctx: Context2DLike,
  viewport: Viewport,
  view: ViewSize,
  options: DotGridOptions = {},
): void {
  const color = options.color ?? DEFAULTS.color;
  const minScreenSpacing = options.minScreenSpacing ?? DEFAULTS.minScreenSpacing;
  const maxDots = options.maxDots ?? DEFAULTS.maxDots;

  let spacing = options.spacing ?? DEFAULTS.spacing;
  if (spacing <= 0 || viewport.zoom <= 0) return;
  while (spacing * viewport.zoom < minScreenSpacing) spacing *= 2;

  // Visible world bounds (no margin); snap the start down to the grid.
  const minWorldX = (0 - viewport.panX) / viewport.zoom;
  const minWorldY = (0 - viewport.panY) / viewport.zoom;
  const maxWorldX = (view.width - viewport.panX) / viewport.zoom;
  const maxWorldY = (view.height - viewport.panY) / viewport.zoom;

  const startX = Math.floor(minWorldX / spacing) * spacing;
  const startY = Math.floor(minWorldY / spacing) * spacing;

  const cols = Math.ceil((maxWorldX - startX) / spacing) + 1;
  const rows = Math.ceil((maxWorldY - startY) / spacing) + 1;
  if (cols <= 0 || rows <= 0 || cols * rows > maxDots) return;

  ctx.fillStyle = color;
  for (let wx = startX; wx <= maxWorldX; wx += spacing) {
    for (let wy = startY; wy <= maxWorldY; wy += spacing) {
      const p = worldToScreen({ x: wx, y: wy }, viewport);
      ctx.fillRect(p.x - 0.5, p.y - 0.5, 1, 1);
    }
  }
}
