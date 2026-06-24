import { describe, expect, it } from 'vitest';
import { Matrix3, Transform, Vector2 } from '@vectorforge/geometry';

/** Deterministic LCG so "property" tests are reproducible. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
const rng = makeRng(0xc0ffee);
const rand = (min: number, max: number): number => min + (max - min) * rng();

/** A random, guaranteed-invertible affine (built from translate-rotate-scale with non-zero scale). */
function randomInvertible(): Matrix3 {
  return new Transform(
    new Vector2(rand(-50, 50), rand(-50, 50)),
    rand(0, 360),
    new Vector2(rand(0.2, 4) * (rng() < 0.5 ? -1 : 1), rand(0.2, 4)),
  ).toMatrix();
}

describe('Matrix3', () => {
  it('builds identity / translation / scaling / rotation', () => {
    expect(Matrix3.identity().isIdentity()).toBe(true);
    expect(Matrix3.translation(5, 7).transformPoint({ x: 1, y: 1 }).equals(new Vector2(6, 8))).toBe(
      true,
    );
    expect(Matrix3.scaling(2, 3).transformPoint({ x: 2, y: 2 }).equals(new Vector2(4, 6))).toBe(
      true,
    );
    expect(Matrix3.rotation(90).transformPoint({ x: 1, y: 0 }).equals(new Vector2(0, 1))).toBe(
      true,
    );
  });

  it('obeys identity multiplication laws', () => {
    const m = Matrix3.translation(3, 4).multiply(Matrix3.rotation(30));
    expect(Matrix3.IDENTITY.multiply(m).equals(m)).toBe(true);
    expect(m.multiply(Matrix3.IDENTITY).equals(m)).toBe(true);
  });

  it('multiplication is associative (property)', () => {
    for (let i = 0; i < 200; i++) {
      const a = randomInvertible();
      const b = randomInvertible();
      const c = randomInvertible();
      expect(
        a
          .multiply(b)
          .multiply(c)
          .equals(a.multiply(b.multiply(c)), 1e-6),
      ).toBe(true);
    }
  });

  it('multiply composes in apply-other-first order', () => {
    const a = Matrix3.translation(10, 0);
    const b = Matrix3.scaling(2, 2);
    const p = { x: 3, y: 4 };
    expect(
      a
        .multiply(b)
        .transformPoint(p)
        .equals(a.transformPoint(b.transformPoint(p))),
    ).toBe(true);
    // scale first (×2 → 6,8), then translate (+10 → 16,8)
    expect(a.multiply(b).transformPoint(p).equals(new Vector2(16, 8))).toBe(true);
  });

  it('compose helpers translate/scale/rotate', () => {
    const m = Matrix3.identity().translate({ x: 5, y: 5 }).scale({ x: 2, y: 2 });
    expect(m.transformPoint({ x: 1, y: 1 }).equals(new Vector2(7, 7))).toBe(true);
    expect(Matrix3.identity().rotate(90).equals(Matrix3.rotation(90))).toBe(true);
  });

  it('determinant and invertibility', () => {
    expect(Matrix3.scaling(2, 3).determinant()).toBeCloseTo(6);
    expect(Matrix3.scaling(0, 3).isInvertible()).toBe(false);
    expect(Matrix3.rotation(45).isInvertible()).toBe(true);
  });

  it('invert throws on a singular matrix', () => {
    expect(() => Matrix3.scaling(0, 0).invert()).toThrow(/not invertible/);
    expect(Matrix3.scaling(0, 0).tryInvert()).toBeNull();
  });

  it('M · M⁻¹ = I and M⁻¹ undoes transformPoint (property)', () => {
    for (let i = 0; i < 200; i++) {
      const m = randomInvertible();
      expect(m.multiply(m.invert()).isIdentity(1e-6)).toBe(true);
      expect(m.invert().multiply(m).isIdentity(1e-6)).toBe(true);
      const p = new Vector2(rand(-100, 100), rand(-100, 100));
      expect(m.invert().transformPoint(m.transformPoint(p)).equals(p, 1e-4)).toBe(true);
    }
  });

  it('transformPointInto writes into the target without allocating', () => {
    const m = Matrix3.translation(1, 2).multiply(Matrix3.scaling(2, 2));
    const out = { x: 0, y: 0 };
    const ret = m.transformPointInto(out, { x: 3, y: 4 });
    expect(ret).toBe(out);
    expect(out).toEqual({ x: 7, y: 10 });
    expect(new Vector2(out.x, out.y).equals(m.transformPoint({ x: 3, y: 4 }))).toBe(true);
  });

  it('decompose recovers translate/rotate/scale and round-trips, incl. reflections (property)', () => {
    const localRng = makeRng(42);
    const r = (min: number, max: number): number => min + (max - min) * localRng();
    for (let i = 0; i < 200; i++) {
      const tx = r(-50, 50);
      const ty = r(-50, 50);
      const rot = r(5, 355); // interior of (0,360) to avoid the wrap boundary
      const sx = r(0.2, 4) * (localRng() < 0.5 ? -1 : 1); // include reflections
      const sy = r(0.2, 4);
      const m = Matrix3.translation(tx, ty)
        .multiply(Matrix3.rotation(rot))
        .multiply(Matrix3.scaling(sx, sy));
      const d = m.decompose();
      expect(d.translation.equals(new Vector2(tx, ty), 1e-4)).toBe(true);
      expect(d.rotation).toBeCloseTo(rot, 3);
      expect(d.scale.equals(new Vector2(sx, sy), 1e-4)).toBe(true);
      expect(Transform.fromMatrix(m).toMatrix().equals(m, 1e-4)).toBe(true);
    }
  });

  it('decompose handles reflections (negative scale) and round-trips through toMatrix', () => {
    // Pure X-flip: rotation 0, negative X scale (the documented convention).
    const flip = Matrix3.scaling(-2, 3);
    const d = flip.decompose();
    expect(d.rotation).toBeCloseTo(0, 6);
    expect(d.scale.equals(new Vector2(-2, 3), 1e-6)).toBe(true);
    expect(Transform.fromMatrix(flip).toMatrix().equals(flip, 1e-6)).toBe(true);

    // Rotated reflection: T·R(40)·S(-2,3) must decompose to rotation 40 and round-trip.
    const rotatedFlip = Matrix3.translation(5, 7)
      .multiply(Matrix3.rotation(40))
      .multiply(Matrix3.scaling(-2, 3));
    const d2 = rotatedFlip.decompose();
    expect(d2.rotation).toBeCloseTo(40, 4);
    expect(d2.scale.equals(new Vector2(-2, 3), 1e-4)).toBe(true);
    expect(Transform.fromMatrix(rotatedFlip).toMatrix().equals(rotatedFlip, 1e-4)).toBe(true);
  });

  it('scaling/rotation accept a single argument', () => {
    expect(Matrix3.scaling(3).transformPoint({ x: 1, y: 1 }).equals(new Vector2(3, 3))).toBe(true);
  });

  it('tryInvert returns the inverse when invertible', () => {
    const m = Matrix3.scaling(2, 2);
    expect(m.tryInvert()?.equals(m.invert())).toBe(true);
  });

  it('isIdentity distinguishes identity from non-identity', () => {
    expect(Matrix3.IDENTITY.isIdentity()).toBe(true);
    expect(Matrix3.translation(1, 0).isIdentity()).toBe(false);
  });

  it('constructs from raw values', () => {
    expect(Matrix3.fromValues(1, 2, 3, 4, 5, 6).toArray()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('serializes', () => {
    expect(Matrix3.IDENTITY.toArray()).toEqual([1, 0, 0, 1, 0, 0]);
    expect(Matrix3.translation(5, 6).toCSSMatrix()).toBe('matrix(1, 0, 0, 1, 5, 6)');
    expect(Matrix3.translation(5, 6).toString()).toBe('Matrix3(1, 0, 0, 1, 5, 6)');
    expect(Matrix3.IDENTITY.isFinite()).toBe(true);
    expect(new Matrix3(NaN, 0, 0, 1, 0, 0).isFinite()).toBe(false);
    // a non-finite component in the last slot exercises the full finiteness chain
    expect(new Matrix3(1, 0, 0, 1, 0, NaN).isFinite()).toBe(false);
  });
});
