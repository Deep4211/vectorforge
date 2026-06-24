import type { Point } from './types';
import { clamp } from './scalar';
import { Vector2 } from './vector2';
import { Matrix3 } from './matrix3';

/**
 * The canvas viewport: the single view transform applied to world content,
 * `V = translate(panX, panY) · scale(zoom)` (ARCHITECTURE.md §6.2). This is the
 * pure-math half of the coordinate pipeline; it has no knowledge of the DOM,
 * the document, or the renderer.
 */
export interface Viewport {
  readonly panX: number;
  readonly panY: number;
  readonly zoom: number;
}

/** Zoom bounds from PRD CAN-002 (5%–400%). */
export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 4;

/** World point → screen (CSS px): `p · zoom + pan`. */
export function worldToScreen(point: Point, viewport: Viewport): Vector2 {
  return new Vector2(
    point.x * viewport.zoom + viewport.panX,
    point.y * viewport.zoom + viewport.panY,
  );
}

/** Screen point (CSS px) → world: `(p − pan) / zoom`. */
export function screenToWorld(point: Point, viewport: Viewport): Vector2 {
  return new Vector2(
    (point.x - viewport.panX) / viewport.zoom,
    (point.y - viewport.panY) / viewport.zoom,
  );
}

/** The view matrix `translate(pan) · scale(zoom)`; `transformPoint` == {@link worldToScreen}. */
export function viewportMatrix(viewport: Viewport): Matrix3 {
  return Matrix3.translation(viewport.panX, viewport.panY).multiply(
    Matrix3.scaling(viewport.zoom, viewport.zoom),
  );
}

/**
 * Cursor-anchored zoom (ARCHITECTURE.md §6.4, PRD CAN-003): produce a new
 * viewport at `newZoom` such that the world point currently under `screenPoint`
 * stays under `screenPoint`. `newZoom` is clamped to `[min, max]`.
 */
export function zoomViewportAt(
  viewport: Viewport,
  screenPoint: Point,
  newZoom: number,
  min: number = MIN_ZOOM,
  max: number = MAX_ZOOM,
): Viewport {
  const zoom = clamp(newZoom, min, max);
  const world = screenToWorld(screenPoint, viewport);
  return {
    panX: screenPoint.x - world.x * zoom,
    panY: screenPoint.y - world.y * zoom,
    zoom,
  };
}
