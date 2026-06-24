import { describe, expect, it } from 'vitest';
import { Matrix3, Transform, Vector2 } from '@vectorforge/geometry';

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

describe('Transform', () => {
  it('has an identity and defaulting factory', () => {
    expect(Transform.IDENTITY.toMatrix().isIdentity()).toBe(true);
    const t = Transform.of({ position: { x: 1, y: 2 } });
    expect(t.position.equals(new Vector2(1, 2))).toBe(true);
    expect(t.rotation).toBe(0);
    expect(t.scale.equals(Vector2.ONE)).toBe(true);
    expect(Transform.of().equals(Transform.IDENTITY)).toBe(true);
  });

  it('normalizes rotation into [0, 360)', () => {
    expect(new Transform(Vector2.ZERO, -90, Vector2.ONE).rotation).toBe(270);
    expect(new Transform(Vector2.ZERO, 450, Vector2.ONE).rotation).toBe(90);
  });

  it('lowers to a TRS matrix (scale, then rotate, then translate)', () => {
    const t = new Transform(new Vector2(10, 20), 0, new Vector2(2, 2));
    expect(t.toMatrix().transformPoint({ x: 1, y: 1 }).equals(new Vector2(12, 22))).toBe(true);
    const r = new Transform(Vector2.ZERO, 90, Vector2.ONE);
    expect(r.toMatrix().transformPoint({ x: 1, y: 0 }).equals(new Vector2(0, 1))).toBe(true);
  });

  it('round-trips through a matrix, including reflections (property)', () => {
    const rng = makeRng(7);
    const r = (min: number, max: number): number => min + (max - min) * rng();
    for (let i = 0; i < 200; i++) {
      // rotation in (0,360) interior to avoid the 0/360 wrap boundary;
      // X scale may be negative to exercise the reflection path.
      const sx = r(0.2, 4) * (rng() < 0.5 ? -1 : 1);
      const t = new Transform(
        new Vector2(r(-50, 50), r(-50, 50)),
        r(5, 355),
        new Vector2(sx, r(0.2, 4)),
      );
      expect(Transform.fromMatrix(t.toMatrix()).equals(t, 1e-4)).toBe(true);
    }
  });

  it('builds copies via with* methods', () => {
    const t = Transform.IDENTITY;
    expect(t.withPosition({ x: 5, y: 5 }).position.equals(new Vector2(5, 5))).toBe(true);
    expect(t.withRotation(45).rotation).toBe(45);
    expect(t.withScale({ x: 3, y: 3 }).scale.equals(new Vector2(3, 3))).toBe(true);
    // original unchanged (immutability)
    expect(t.equals(Transform.IDENTITY)).toBe(true);
  });

  it('fromMatrix matches Matrix3.decompose', () => {
    const m = Matrix3.translation(3, 4)
      .multiply(Matrix3.rotation(30))
      .multiply(Matrix3.scaling(2, 2));
    const t = Transform.fromMatrix(m);
    expect(t.position.equals(new Vector2(3, 4), 1e-6)).toBe(true);
    expect(t.rotation).toBeCloseTo(30, 3);
    expect(t.scale.equals(new Vector2(2, 2), 1e-6)).toBe(true);
  });

  it('has a readable string form', () => {
    expect(new Transform(new Vector2(1, 2), 45, new Vector2(2, 2)).toString()).toContain(
      'Transform',
    );
  });

  it('floors an exact-zero scale so the matrix never collapses (DOC-11)', () => {
    const t = new Transform(Vector2.ZERO, 0, new Vector2(0, 5));
    expect(t.scale.x).not.toBe(0);
    expect(Math.abs(t.scale.x)).toBeLessThan(1e-3); // imperceptible but non-zero
    expect(t.toMatrix().isInvertible()).toBe(true);
    // a negative (flip) scale is preserved, not floored
    expect(new Transform(Vector2.ZERO, 0, new Vector2(-2, 3)).scale.x).toBe(-2);
  });
});
