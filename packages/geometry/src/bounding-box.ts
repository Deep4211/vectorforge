import type { BoxLike, Point, RectLike } from './types';
import { approxEqual, EPSILON } from './scalar';
import { Vector2 } from './vector2';
import type { Matrix3 } from './matrix3';
import { Rectangle } from './rectangle';

/**
 * An immutable axis-aligned bounding box (AABB) defined by its extents.
 * The constructor normalizes its inputs so `minX ≤ maxX` and `minY ≤ maxY`
 * always hold. Used for selection bounds, culling, and collision checks
 * (ARCHITECTURE.md §6.1, §7.3).
 */
export class BoundingBox implements BoxLike {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;

  constructor(minX: number, minY: number, maxX: number, maxY: number) {
    this.minX = Math.min(minX, maxX);
    this.minY = Math.min(minY, maxY);
    this.maxX = Math.max(minX, maxX);
    this.maxY = Math.max(minY, maxY);
  }

  /** The tightest box enclosing all `points`. Throws if `points` is empty. */
  static fromPoints(points: readonly Point[]): BoundingBox {
    if (points.length === 0) {
      throw new Error('BoundingBox.fromPoints: at least one point is required');
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return new BoundingBox(minX, minY, maxX, maxY);
  }

  /** The box enclosing a rectangle (accepts any `{x, y, w, h}`). */
  static fromRect(rect: RectLike): BoundingBox {
    return new BoundingBox(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  }

  /** The union of one or more boxes. Throws if `boxes` is empty. */
  static fromBoxes(boxes: readonly BoxLike[]): BoundingBox {
    if (boxes.length === 0) {
      throw new Error('BoundingBox.fromBoxes: at least one box is required');
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const b of boxes) {
      if (b.minX < minX) minX = b.minX;
      if (b.minY < minY) minY = b.minY;
      if (b.maxX > maxX) maxX = b.maxX;
      if (b.maxY > maxY) maxY = b.maxY;
    }
    return new BoundingBox(minX, minY, maxX, maxY);
  }

  get width(): number {
    return this.maxX - this.minX;
  }

  get height(): number {
    return this.maxY - this.minY;
  }

  center(): Vector2 {
    return new Vector2((this.minX + this.maxX) / 2, (this.minY + this.maxY) / 2);
  }

  /** Corners: top-left, top-right, bottom-right, bottom-left. */
  corners(): [Vector2, Vector2, Vector2, Vector2] {
    return [
      new Vector2(this.minX, this.minY),
      new Vector2(this.maxX, this.minY),
      new Vector2(this.maxX, this.maxY),
      new Vector2(this.minX, this.maxY),
    ];
  }

  area(): number {
    return this.width * this.height;
  }

  // ---- collision / containment -------------------------------------------

  contains(p: Point): boolean {
    return p.x >= this.minX && p.x <= this.maxX && p.y >= this.minY && p.y <= this.maxY;
  }

  containsBox(other: BoxLike): boolean {
    return (
      other.minX >= this.minX &&
      other.maxX <= this.maxX &&
      other.minY >= this.minY &&
      other.maxY <= this.maxY
    );
  }

  intersects(other: BoxLike): boolean {
    return (
      this.minX < other.maxX &&
      this.maxX > other.minX &&
      this.minY < other.maxY &&
      this.maxY > other.minY
    );
  }

  intersection(other: BoxLike): BoundingBox | null {
    const minX = Math.max(this.minX, other.minX);
    const minY = Math.max(this.minY, other.minY);
    const maxX = Math.min(this.maxX, other.maxX);
    const maxY = Math.min(this.maxY, other.maxY);
    if (minX < maxX && minY < maxY) {
      return new BoundingBox(minX, minY, maxX, maxY);
    }
    return null;
  }

  union(other: BoxLike): BoundingBox {
    return new BoundingBox(
      Math.min(this.minX, other.minX),
      Math.min(this.minY, other.minY),
      Math.max(this.maxX, other.maxX),
      Math.max(this.maxY, other.maxY),
    );
  }

  // ---- transforms (return new instances) ---------------------------------

  expandToInclude(p: Point): BoundingBox {
    return new BoundingBox(
      Math.min(this.minX, p.x),
      Math.min(this.minY, p.y),
      Math.max(this.maxX, p.x),
      Math.max(this.maxY, p.y),
    );
  }

  /** Grow (or shrink, if negative) by `amount` on every side. */
  inflate(amount: number): BoundingBox {
    return new BoundingBox(
      this.minX - amount,
      this.minY - amount,
      this.maxX + amount,
      this.maxY + amount,
    );
  }

  /**
   * Transform this box by an affine matrix and return the AABB of the result.
   * For a rotating matrix this is the *world* bounding box of the rotated
   * geometry (ARCHITECTURE.md §6.4 "rotated bounds"). This is the package's
   * equivalent of ARCHITECTURE §6.1's `Matrix3.transformRect`, placed here to
   * keep `Matrix3` free of higher-type imports.
   */
  transform(m: Matrix3): BoundingBox {
    return BoundingBox.fromPoints(this.corners().map((corner) => m.transformPoint(corner)));
  }

  // ---- comparison & conversion -------------------------------------------

  toRectangle(): Rectangle {
    return new Rectangle(this.minX, this.minY, this.width, this.height);
  }

  equals(other: BoxLike, epsilon: number = EPSILON): boolean {
    return (
      approxEqual(this.minX, other.minX, epsilon) &&
      approxEqual(this.minY, other.minY, epsilon) &&
      approxEqual(this.maxX, other.maxX, epsilon) &&
      approxEqual(this.maxY, other.maxY, epsilon)
    );
  }

  isFinite(): boolean {
    return (
      Number.isFinite(this.minX) &&
      Number.isFinite(this.minY) &&
      Number.isFinite(this.maxX) &&
      Number.isFinite(this.maxY)
    );
  }

  toString(): string {
    return `BoundingBox(${this.minX}, ${this.minY}, ${this.maxX}, ${this.maxY})`;
  }
}
