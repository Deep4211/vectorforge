import type { MutablePoint, Point } from './types';
import { approxEqual, degToRad, EPSILON, normalizeRotation, radToDeg } from './scalar';
import { Vector2 } from './vector2';

/**
 * An immutable 2D affine transform, stored as six numbers (ARCHITECTURE.md §6.1).
 * The implicit third row is `[0 0 1]`:
 *
 * ```
 * | a  c  e |        x' = a·x + c·y + e
 * | b  d  f |        y' = b·x + d·y + f
 * | 0  0  1 |
 * ```
 *
 * This is exactly the `ctx.setTransform(a, b, c, d, e, f)` / `DOMMatrix` layout,
 * so {@link toArray} feeds the Canvas2D renderer directly. All angles are in
 * degrees (consistent with `Transform.rotation` and the PRD).
 */
export class Matrix3 {
  static readonly IDENTITY: Matrix3 = new Matrix3(1, 0, 0, 1, 0, 0);

  constructor(
    readonly a: number,
    readonly b: number,
    readonly c: number,
    readonly d: number,
    readonly e: number,
    readonly f: number,
  ) {}

  static identity(): Matrix3 {
    return Matrix3.IDENTITY;
  }

  static fromValues(a: number, b: number, c: number, d: number, e: number, f: number): Matrix3 {
    return new Matrix3(a, b, c, d, e, f);
  }

  static translation(tx: number, ty: number): Matrix3 {
    return new Matrix3(1, 0, 0, 1, tx, ty);
  }

  static scaling(sx: number, sy: number = sx): Matrix3 {
    return new Matrix3(sx, 0, 0, sy, 0, 0);
  }

  /** Rotation by `degrees` (counter-clockwise in math axes). */
  static rotation(degrees: number): Matrix3 {
    const rad = degToRad(degrees);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return new Matrix3(cos, sin, -sin, cos, 0, 0);
  }

  /**
   * Matrix product `this · other`. The result applies `other` first, then
   * `this`: `this.multiply(other).transformPoint(p) === this.transformPoint(other.transformPoint(p))`.
   */
  multiply(other: Matrix3): Matrix3 {
    return new Matrix3(
      this.a * other.a + this.c * other.b,
      this.b * other.a + this.d * other.b,
      this.a * other.c + this.c * other.d,
      this.b * other.c + this.d * other.d,
      this.a * other.e + this.c * other.f + this.e,
      this.b * other.e + this.d * other.f + this.f,
    );
  }

  /** Compose a translation onto this matrix (applied before existing transforms). */
  translate(v: Point): Matrix3 {
    return this.multiply(Matrix3.translation(v.x, v.y));
  }

  /** Compose a component-wise scale onto this matrix. */
  scale(v: Point): Matrix3 {
    return this.multiply(Matrix3.scaling(v.x, v.y));
  }

  /** Compose a rotation (degrees) onto this matrix. */
  rotate(degrees: number): Matrix3 {
    return this.multiply(Matrix3.rotation(degrees));
  }

  /** Determinant of the linear part (`a·d − b·c`). Zero ⇒ not invertible. */
  determinant(): number {
    return this.a * this.d - this.b * this.c;
  }

  isInvertible(): boolean {
    const det = this.determinant();
    return Number.isFinite(det) && det !== 0;
  }

  /** Invert the transform. Throws if the matrix is singular or non-finite. */
  invert(): Matrix3 {
    const det = this.determinant();
    if (!Number.isFinite(det) || det === 0) {
      throw new Error('Matrix3.invert: matrix is not invertible (determinant is zero)');
    }
    const { a, b, c, d, e, f } = this;
    const ia = d / det;
    const ib = -b / det;
    const ic = -c / det;
    const id = a / det;
    return new Matrix3(ia, ib, ic, id, -(ia * e + ic * f), -(ib * e + id * f));
  }

  /** Invert, or return `null` if singular (non-throwing variant of {@link invert}). */
  tryInvert(): Matrix3 | null {
    return this.isInvertible() ? this.invert() : null;
  }

  transformPoint(p: Point): Vector2 {
    return new Vector2(this.a * p.x + this.c * p.y + this.e, this.b * p.x + this.d * p.y + this.f);
  }

  /** Allocation-free point transform: writes the result into `out`. */
  transformPointInto(out: MutablePoint, p: Point): MutablePoint {
    const x = this.a * p.x + this.c * p.y + this.e;
    const y = this.b * p.x + this.d * p.y + this.f;
    out.x = x;
    out.y = y;
    return out;
  }

  /**
   * Decompose a skew-free affine into translation, rotation (degrees, `[0,360)`),
   * and scale. A reflection (negative determinant) is reported as a negative X
   * scale. Inverse of `Transform.toMatrix()` for translate-rotate-scale matrices.
   */
  decompose(): { translation: Vector2; rotation: number; scale: Vector2 } {
    const { a, b, c, d, e, f } = this;
    let scaleX = Math.hypot(a, b);
    const scaleY = Math.hypot(c, d);
    // A reflection (negative determinant) is attributed to the X scale; the
    // rotation must then be recovered from the SIGN-CORRECTED first column
    // (a/scaleX, b/scaleX), i.e. atan2(-b, -a). Using the raw column would be
    // 180° off and break the decompose ∘ toMatrix round-trip for flipped nodes
    // (ARCHITECTURE.md §6.4, ENGINE_CONTRACT.md DOC-11).
    let rotationRad: number;
    if (this.determinant() < 0) {
      scaleX = -scaleX;
      rotationRad = Math.atan2(-b, -a);
    } else {
      rotationRad = Math.atan2(b, a);
    }
    return {
      translation: new Vector2(e, f),
      rotation: normalizeRotation(radToDeg(rotationRad)),
      scale: new Vector2(scaleX, scaleY),
    };
  }

  isIdentity(epsilon: number = EPSILON): boolean {
    return this.equals(Matrix3.IDENTITY, epsilon);
  }

  equals(m: Matrix3, epsilon: number = EPSILON): boolean {
    return (
      approxEqual(this.a, m.a, epsilon) &&
      approxEqual(this.b, m.b, epsilon) &&
      approxEqual(this.c, m.c, epsilon) &&
      approxEqual(this.d, m.d, epsilon) &&
      approxEqual(this.e, m.e, epsilon) &&
      approxEqual(this.f, m.f, epsilon)
    );
  }

  isFinite(): boolean {
    return (
      Number.isFinite(this.a) &&
      Number.isFinite(this.b) &&
      Number.isFinite(this.c) &&
      Number.isFinite(this.d) &&
      Number.isFinite(this.e) &&
      Number.isFinite(this.f)
    );
  }

  toArray(): [number, number, number, number, number, number] {
    return [this.a, this.b, this.c, this.d, this.e, this.f];
  }

  /** CSS / Canvas matrix string, e.g. `matrix(1, 0, 0, 1, 0, 0)`. */
  toCSSMatrix(): string {
    return `matrix(${this.a}, ${this.b}, ${this.c}, ${this.d}, ${this.e}, ${this.f})`;
  }

  toString(): string {
    return `Matrix3(${this.toArray().join(', ')})`;
  }
}
