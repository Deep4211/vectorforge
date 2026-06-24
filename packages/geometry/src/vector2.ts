import type { MutablePoint, Point } from './types';
import { approxEqual, degToRad, EPSILON } from './scalar';

/**
 * An immutable 2D vector / point.
 *
 * Every operation returns a new `Vector2`; instances are never mutated
 * (ARCHITECTURE.md §6.1). For the renderer hot path, allocation-free `*Into`
 * static variants write into a caller-provided target instead of allocating.
 *
 * Names follow this sprint's brief (`subtract`, `multiply`, `divide`,
 * `magnitude`) with ARCHITECTURE §6.1 aliases (`sub`, `length`, `scale`).
 */
export class Vector2 implements Point {
  static readonly ZERO: Vector2 = new Vector2(0, 0);
  static readonly ONE: Vector2 = new Vector2(1, 1);

  constructor(
    readonly x: number,
    readonly y: number,
  ) {}

  static of(x: number, y: number): Vector2 {
    return new Vector2(x, y);
  }

  static fromPoint(p: Point): Vector2 {
    return new Vector2(p.x, p.y);
  }

  // ---- arithmetic ---------------------------------------------------------

  add(v: Point): Vector2 {
    return new Vector2(this.x + v.x, this.y + v.y);
  }

  subtract(v: Point): Vector2 {
    return new Vector2(this.x - v.x, this.y - v.y);
  }

  /** Alias of {@link subtract} (ARCHITECTURE.md §6.1). */
  sub(v: Point): Vector2 {
    return this.subtract(v);
  }

  /** Multiply by a scalar. */
  multiply(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar);
  }

  /** Divide by a scalar. Throws on division by zero. */
  divide(scalar: number): Vector2 {
    if (scalar === 0) {
      throw new RangeError('Vector2.divide: division by zero');
    }
    return new Vector2(this.x / scalar, this.y / scalar);
  }

  /** Component-wise scale (ARCHITECTURE.md §6.1 `scale`). `sy` defaults to `sx`. */
  scale(sx: number, sy: number = sx): Vector2 {
    return new Vector2(this.x * sx, this.y * sy);
  }

  negate(): Vector2 {
    return new Vector2(-this.x, -this.y);
  }

  // ---- products & magnitude ----------------------------------------------

  dot(v: Point): number {
    return this.x * v.x + this.y * v.y;
  }

  /** 2D cross product (z-component of the 3D cross); sign gives orientation. */
  cross(v: Point): number {
    return this.x * v.y - this.y * v.x;
  }

  magnitude(): number {
    return Math.hypot(this.x, this.y);
  }

  /** Alias of {@link magnitude} (ARCHITECTURE.md §6.1 `length`). */
  length(): number {
    return this.magnitude();
  }

  magnitudeSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  /** Alias of {@link magnitudeSquared}. */
  lengthSquared(): number {
    return this.magnitudeSquared();
  }

  distanceTo(v: Point): number {
    return Math.hypot(this.x - v.x, this.y - v.y);
  }

  distanceSquaredTo(v: Point): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return dx * dx + dy * dy;
  }

  /**
   * Return a unit vector in the same direction. A zero-length vector has no
   * defined direction and normalizes to {@link Vector2.ZERO} (documented choice
   * to avoid throwing on the hot path).
   */
  normalize(): Vector2 {
    const len = this.magnitude();
    return len === 0 ? Vector2.ZERO : new Vector2(this.x / len, this.y / len);
  }

  /** Rotate by `degrees` (counter-clockwise in math axes) around `origin`. */
  rotate(degrees: number, origin: Point = Vector2.ZERO): Vector2 {
    const rad = degToRad(degrees);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = this.x - origin.x;
    const dy = this.y - origin.y;
    return new Vector2(origin.x + dx * cos - dy * sin, origin.y + dx * sin + dy * cos);
  }

  /** Linear interpolation toward `v` by `t` (t is not clamped). */
  lerp(v: Point, t: number): Vector2 {
    return new Vector2(this.x + (v.x - this.x) * t, this.y + (v.y - this.y) * t);
  }

  // ---- comparison & conversion -------------------------------------------

  equals(v: Point, epsilon: number = EPSILON): boolean {
    return approxEqual(this.x, v.x, epsilon) && approxEqual(this.y, v.y, epsilon);
  }

  isFinite(): boolean {
    return Number.isFinite(this.x) && Number.isFinite(this.y);
  }

  toArray(): [number, number] {
    return [this.x, this.y];
  }

  toString(): string {
    return `Vector2(${this.x}, ${this.y})`;
  }

  // ---- allocation-free hot-path variants ---------------------------------

  /** Write `a + b` into `out` without allocating; returns `out`. */
  static addInto(out: MutablePoint, a: Point, b: Point): MutablePoint {
    out.x = a.x + b.x;
    out.y = a.y + b.y;
    return out;
  }

  /** Write `a - b` into `out` without allocating; returns `out`. */
  static subtractInto(out: MutablePoint, a: Point, b: Point): MutablePoint {
    out.x = a.x - b.x;
    out.y = a.y - b.y;
    return out;
  }
}
