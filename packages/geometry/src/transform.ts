import type { Point } from './types';
import { approxEqual, EPSILON, normalizeRotation } from './scalar';
import { Vector2 } from './vector2';
import { Matrix3 } from './matrix3';

/** Optional fields for {@link Transform.of}. */
export interface TransformInit {
  position?: Point;
  /** Rotation in degrees; normalized to `[0, 360)`. */
  rotation?: number;
  scale?: Point;
}

/**
 * Smallest scale magnitude a transform may hold. DOC-11 requires scale to be
 * non-zero ("negative flips, never collapses"), so an exact-zero component is
 * floored to this imperceptible-but-invertible value (sign preserved). This
 * keeps `toMatrix()` invertible for hit-testing and inverse transforms.
 */
const MIN_SCALE_MAGNITUDE = 1e-6;

function nonZeroScale(value: number): number {
  if (value === 0) return MIN_SCALE_MAGNITUDE;
  return value;
}

/**
 * A node-level translate-rotate-scale transform (ARCHITECTURE.md §6.1).
 * Immutable; rotation is stored in degrees normalized to `[0, 360)`.
 * `toMatrix()` lowers it to a {@link Matrix3} as `T · R · S` (a point is scaled,
 * then rotated, then translated).
 */
export class Transform {
  static readonly IDENTITY: Transform = new Transform(Vector2.ZERO, 0, Vector2.ONE);

  readonly position: Vector2;
  readonly rotation: number;
  readonly scale: Vector2;

  constructor(position: Point, rotation: number, scale: Point) {
    this.position = Vector2.fromPoint(position);
    this.rotation = normalizeRotation(rotation);
    this.scale = new Vector2(nonZeroScale(scale.x), nonZeroScale(scale.y));
  }

  static of(init: TransformInit = {}): Transform {
    return new Transform(
      init.position ?? Vector2.ZERO,
      init.rotation ?? 0,
      init.scale ?? Vector2.ONE,
    );
  }

  /** Recover a transform from a skew-free affine matrix (inverse of {@link toMatrix}). */
  static fromMatrix(m: Matrix3): Transform {
    const { translation, rotation, scale } = m.decompose();
    return new Transform(translation, rotation, scale);
  }

  /** Lower to an affine matrix: `translation · rotation · scale`. */
  toMatrix(): Matrix3 {
    return Matrix3.translation(this.position.x, this.position.y)
      .multiply(Matrix3.rotation(this.rotation))
      .multiply(Matrix3.scaling(this.scale.x, this.scale.y));
  }

  withPosition(position: Point): Transform {
    return new Transform(position, this.rotation, this.scale);
  }

  withRotation(rotation: number): Transform {
    return new Transform(this.position, rotation, this.scale);
  }

  withScale(scale: Point): Transform {
    return new Transform(this.position, this.rotation, scale);
  }

  equals(other: Transform, epsilon: number = EPSILON): boolean {
    return (
      this.position.equals(other.position, epsilon) &&
      approxEqual(this.rotation, other.rotation, epsilon) &&
      this.scale.equals(other.scale, epsilon)
    );
  }

  toString(): string {
    return `Transform(pos=${this.position.toString()}, rot=${this.rotation}°, scale=${this.scale.toString()})`;
  }
}
