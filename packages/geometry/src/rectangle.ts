import type { BoxLike, Point, RectLike } from './types';
import { approxEqual, EPSILON } from './scalar';
import { Vector2 } from './vector2';

/**
 * An immutable axis-aligned rectangle defined by a top-left origin (`x`, `y`)
 * and a size (`w`, `h`) — the `Rect` of ARCHITECTURE.md §6.1 (exported below as
 * the `Rect` alias).
 *
 * Width/height may be negative (e.g. a marquee dragged up-left); all queries
 * (`contains`, `intersects`, …) operate on the normalized edges, so they are
 * correct regardless of sign. {@link normalize} returns an equivalent rectangle
 * with non-negative size.
 */
export class Rectangle implements RectLike {
  constructor(
    readonly x: number,
    readonly y: number,
    readonly w: number,
    readonly h: number,
  ) {}

  static of(x: number, y: number, w: number, h: number): Rectangle {
    return new Rectangle(x, y, w, h);
  }

  /** Build from two opposite corners (any ordering); result has non-negative size. */
  static fromPoints(p1: Point, p2: Point): Rectangle {
    const x = Math.min(p1.x, p2.x);
    const y = Math.min(p1.y, p2.y);
    return new Rectangle(x, y, Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
  }

  /** Build from an axis-aligned bounding box. */
  static fromBox(box: BoxLike): Rectangle {
    return new Rectangle(box.minX, box.minY, box.maxX - box.minX, box.maxY - box.minY);
  }

  /** Build from a center point and a size. */
  static fromCenter(center: Point, w: number, h: number): Rectangle {
    return new Rectangle(center.x - w / 2, center.y - h / 2, w, h);
  }

  // ---- normalized edges (sign-independent) -------------------------------

  get left(): number {
    return Math.min(this.x, this.x + this.w);
  }

  get right(): number {
    return Math.max(this.x, this.x + this.w);
  }

  get top(): number {
    return Math.min(this.y, this.y + this.h);
  }

  get bottom(): number {
    return Math.max(this.y, this.y + this.h);
  }

  center(): Vector2 {
    return new Vector2((this.left + this.right) / 2, (this.top + this.bottom) / 2);
  }

  /** Corners in order: top-left, top-right, bottom-right, bottom-left. */
  corners(): [Vector2, Vector2, Vector2, Vector2] {
    const { left, right, top, bottom } = this;
    return [
      new Vector2(left, top),
      new Vector2(right, top),
      new Vector2(right, bottom),
      new Vector2(left, bottom),
    ];
  }

  /** Always non-negative (`|w · h|`). */
  area(): number {
    return Math.abs(this.w * this.h);
  }

  isEmpty(): boolean {
    return this.w === 0 || this.h === 0;
  }

  // ---- queries ------------------------------------------------------------

  /** Point-in-rectangle test (edges inclusive). */
  contains(p: Point): boolean {
    return p.x >= this.left && p.x <= this.right && p.y >= this.top && p.y <= this.bottom;
  }

  /** True if `other` lies entirely within this rectangle. */
  containsRect(other: Rectangle): boolean {
    return (
      other.left >= this.left &&
      other.right <= this.right &&
      other.top >= this.top &&
      other.bottom <= this.bottom
    );
  }

  /** True if the two rectangles share positive overlapping area (edge-touch ⇒ false). */
  intersects(other: Rectangle): boolean {
    return (
      this.left < other.right &&
      this.right > other.left &&
      this.top < other.bottom &&
      this.bottom > other.top
    );
  }

  /** The overlapping rectangle, or `null` when there is no positive-area overlap. */
  intersection(other: Rectangle): Rectangle | null {
    const left = Math.max(this.left, other.left);
    const top = Math.max(this.top, other.top);
    const right = Math.min(this.right, other.right);
    const bottom = Math.min(this.bottom, other.bottom);
    if (left < right && top < bottom) {
      return new Rectangle(left, top, right - left, bottom - top);
    }
    return null;
  }

  /** The smallest rectangle containing both. */
  union(other: Rectangle): Rectangle {
    const left = Math.min(this.left, other.left);
    const top = Math.min(this.top, other.top);
    const right = Math.max(this.right, other.right);
    const bottom = Math.max(this.bottom, other.bottom);
    return new Rectangle(left, top, right - left, bottom - top);
  }

  // ---- transforms (return new instances) ---------------------------------

  /** Grow (or shrink, if negative) by `amount` on every side. */
  inflate(amount: number): Rectangle {
    return this.inflateXY(amount, amount);
  }

  /** Grow by `dx` on the left/right and `dy` on the top/bottom. */
  inflateXY(dx: number, dy: number): Rectangle {
    return new Rectangle(
      this.left - dx,
      this.top - dy,
      this.right - this.left + dx * 2,
      this.bottom - this.top + dy * 2,
    );
  }

  translate(v: Point): Rectangle {
    return new Rectangle(this.x + v.x, this.y + v.y, this.w, this.h);
  }

  /** Equivalent rectangle with a non-negative size. */
  normalize(): Rectangle {
    return new Rectangle(this.left, this.top, this.right - this.left, this.bottom - this.top);
  }

  // ---- comparison & conversion -------------------------------------------

  equals(other: Rectangle, epsilon: number = EPSILON): boolean {
    return (
      approxEqual(this.x, other.x, epsilon) &&
      approxEqual(this.y, other.y, epsilon) &&
      approxEqual(this.w, other.w, epsilon) &&
      approxEqual(this.h, other.h, epsilon)
    );
  }

  isFinite(): boolean {
    return (
      Number.isFinite(this.x) &&
      Number.isFinite(this.y) &&
      Number.isFinite(this.w) &&
      Number.isFinite(this.h)
    );
  }

  toString(): string {
    return `Rectangle(${this.x}, ${this.y}, ${this.w}, ${this.h})`;
  }
}

/** ARCHITECTURE.md §6.1 name for {@link Rectangle}. */
export const Rect = Rectangle;
export type Rect = Rectangle;
