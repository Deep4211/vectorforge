/**
 * Scalar numeric utilities and the package's numeric-robustness primitives
 * (ARCHITECTURE.md §6.4, ENGINE_CONTRACT.md DOC-11). Pure, no allocation.
 */

/** Default tolerance for floating-point equality comparisons. */
export const EPSILON = 1e-6;

/** Degrees → radians. */
export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Radians → degrees. */
export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

/** Floating-point-tolerant equality. */
export function approxEqual(a: number, b: number, epsilon: number = EPSILON): boolean {
  return Math.abs(a - b) <= epsilon;
}

/** Clamp `value` into the inclusive range `[min, max]`. */
export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** Linear interpolation from `a` to `b` by `t` (t is not clamped). */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Type guard: a real, finite number (rejects `NaN`, `±Infinity`). */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Boundary-rejection primitive (ENGINE_CONTRACT.md DOC-11): throw on a
 * non-finite number so no `NaN`/`±Infinity` reaches the renderer. Returns the
 * value, so it can wrap an expression inline. Geometry value objects stay
 * allocation-light by exposing `isFinite()` for opt-in checks; this is the
 * throwing variant for system boundaries (inspector commits, file load).
 */
export function assertFinite(value: number, name = 'value'): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number (received ${value})`);
  }
  return value;
}

/**
 * Normalize an angle in degrees to the half-open range `[0, 360)`
 * (ENGINE_CONTRACT.md DOC-11). Works for negative and large inputs.
 */
export function normalizeRotation(degrees: number): number {
  let r = degrees % 360;
  if (r < 0) r += 360;
  // Guard the float round-up where `360 + (-tiny)` evaluates to exactly 360,
  // which would leak out of the half-open [0, 360) range.
  if (r >= 360) r = 0;
  // Collapse -0 to +0 so the result is the canonical [0, 360) representative.
  return r === 0 ? 0 : r;
}

/**
 * Clamp a corner radius to `[0, min(|w|, |h|) / 2]` (ENGINE_CONTRACT.md DOC-11):
 * a radius can never exceed half the shorter side, and can never be negative.
 */
export function clampCornerRadius(radius: number, w: number, h: number): number {
  const limit = Math.min(Math.abs(w), Math.abs(h)) / 2;
  return clamp(radius, 0, limit);
}
