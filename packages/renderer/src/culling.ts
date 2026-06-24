import { BoundingBox, screenToWorld, type Viewport } from '@vectorforge/geometry';
import type { ViewSize } from './types';

/** Default cull margin (CSS px) so partially-scrolled nodes still paint (§7.3). */
export const DEFAULT_CULL_MARGIN = 64;

/**
 * The world-space AABB currently visible through `viewport` for a canvas of
 * `view` CSS pixels, expanded by `marginPx` screen pixels on every side. The
 * viewport carries no rotation, so the visible region is the world rectangle
 * spanned by the two opposite screen corners (RND-6).
 */
export function visibleWorldBox(
  viewport: Viewport,
  view: ViewSize,
  marginPx: number = DEFAULT_CULL_MARGIN,
): BoundingBox {
  const topLeft = screenToWorld({ x: -marginPx, y: -marginPx }, viewport);
  const bottomRight = screenToWorld(
    { x: view.width + marginPx, y: view.height + marginPx },
    viewport,
  );
  return new BoundingBox(topLeft.x, topLeft.y, bottomRight.x, bottomRight.y);
}
