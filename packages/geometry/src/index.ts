/**
 * `@vectorforge/geometry` — public API entry.
 *
 * The pure, dependency-free geometry & mathematics engine (ARCHITECTURE.md §6):
 * immutable `Vector2` / `Matrix3` / `Rectangle` (`Rect`) / `BoundingBox` /
 * `Transform` value objects, scalar numeric-safety helpers, and the
 * world ↔ screen coordinate pipeline. No browser, React, document, or renderer
 * dependencies — this package is a leaf of the dependency graph.
 *
 * Import only through this entry (`@vectorforge/geometry`), never a deep path
 * (ENGINE_CONTRACT.md §6 DEP-5).
 */

// Structural types
export type { Point, MutablePoint, RectLike, BoxLike } from './types';

// Scalar / numeric-safety utilities
export {
  EPSILON,
  approxEqual,
  clamp,
  lerp,
  degToRad,
  radToDeg,
  isFiniteNumber,
  assertFinite,
  normalizeRotation,
  clampCornerRadius,
} from './scalar';

// Distance / proximity helpers
export { distancePointToSegment } from './distance';

// Primitives
export { Vector2 } from './vector2';
export { Matrix3 } from './matrix3';
export { Rectangle, Rect } from './rectangle';
export { BoundingBox } from './bounding-box';
export { Transform } from './transform';
export type { TransformInit } from './transform';

// Coordinate pipeline
export {
  type Viewport,
  MIN_ZOOM,
  MAX_ZOOM,
  worldToScreen,
  screenToWorld,
  viewportMatrix,
  zoomViewportAt,
} from './viewport';

/** Package identity (stable across the project; consumed by the app shell). */
export const PACKAGE_ID = '@vectorforge/geometry' as const;

/** Architectural layer (see docs/ENGINE_CONTRACT.md §6). */
export const LAYER = 'domain' as const;
