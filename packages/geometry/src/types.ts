/**
 * Structural geometry types shared across the package.
 *
 * These are plain interfaces (no runtime cost) so the value-object classes can
 * interoperate and convert between each other *without importing each other* —
 * which keeps the intra-package dependency graph acyclic.
 */

/** An immutable 2D point. `Vector2` implements this; any `{x, y}` satisfies it. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** A mutable 2D point — the output target for allocation-free `*Into` operations. */
export interface MutablePoint {
  x: number;
  y: number;
}

/** Anything shaped like a rectangle (top-left origin + size). `Rectangle` implements this. */
export interface RectLike {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Anything shaped like an axis-aligned bounding box. `BoundingBox` implements this. */
export interface BoxLike {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}
