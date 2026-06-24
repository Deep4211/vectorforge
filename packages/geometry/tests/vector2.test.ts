import { describe, expect, it } from 'vitest';
import { Vector2 } from '@vectorforge/geometry';

describe('Vector2', () => {
  it('constructs and exposes constants', () => {
    const v = new Vector2(3, 4);
    expect(v.x).toBe(3);
    expect(v.y).toBe(4);
    expect(Vector2.ZERO.equals(new Vector2(0, 0))).toBe(true);
    expect(Vector2.ONE.equals(new Vector2(1, 1))).toBe(true);
    expect(Vector2.of(1, 2).equals(Vector2.fromPoint({ x: 1, y: 2 }))).toBe(true);
  });

  it('is immutable (operations return new instances)', () => {
    const a = new Vector2(1, 2);
    const b = a.add({ x: 10, y: 10 });
    expect(a.equals(new Vector2(1, 2))).toBe(true); // unchanged
    expect(b.equals(new Vector2(11, 12))).toBe(true);
    expect(b).not.toBe(a);
  });

  it('adds and subtracts', () => {
    const a = new Vector2(1, 2);
    const b = new Vector2(3, 5);
    expect(a.add(b).equals(new Vector2(4, 7))).toBe(true);
    expect(b.subtract(a).equals(new Vector2(2, 3))).toBe(true);
    expect(b.sub(a).equals(b.subtract(a))).toBe(true);
  });

  it('multiplies, scales, divides, negates', () => {
    const v = new Vector2(2, -3);
    expect(v.multiply(2).equals(new Vector2(4, -6))).toBe(true);
    expect(v.scale(2, 3).equals(new Vector2(4, -9))).toBe(true);
    expect(v.scale(2).equals(new Vector2(4, -6))).toBe(true);
    expect(v.divide(2).equals(new Vector2(1, -1.5))).toBe(true);
    expect(v.negate().equals(new Vector2(-2, 3))).toBe(true);
  });

  it('throws on divide by zero', () => {
    expect(() => new Vector2(1, 1).divide(0)).toThrow(RangeError);
  });

  it('computes dot and cross products', () => {
    expect(new Vector2(1, 0).dot(new Vector2(0, 1))).toBe(0);
    expect(new Vector2(1, 2).dot(new Vector2(3, 4))).toBe(11);
    expect(new Vector2(1, 0).cross(new Vector2(0, 1))).toBe(1);
  });

  it('computes magnitude and distance', () => {
    const v = new Vector2(3, 4);
    expect(v.magnitude()).toBe(5);
    expect(v.length()).toBe(5);
    expect(v.magnitudeSquared()).toBe(25);
    expect(v.lengthSquared()).toBe(25);
    expect(new Vector2(0, 0).distanceTo(new Vector2(3, 4))).toBe(5);
    expect(new Vector2(0, 0).distanceSquaredTo(new Vector2(3, 4))).toBe(25);
  });

  it('normalizes (unit length; zero vector → ZERO)', () => {
    const n = new Vector2(3, 4).normalize();
    expect(n.magnitude()).toBeCloseTo(1);
    expect(n.equals(new Vector2(0.6, 0.8))).toBe(true);
    expect(Vector2.ZERO.normalize().equals(Vector2.ZERO)).toBe(true);
  });

  it('rotates around the origin and an arbitrary pivot', () => {
    expect(new Vector2(1, 0).rotate(90).equals(new Vector2(0, 1))).toBe(true);
    expect(new Vector2(1, 0).rotate(180).equals(new Vector2(-1, 0))).toBe(true);
    const pivot = { x: 1, y: 1 };
    expect(new Vector2(2, 1).rotate(90, pivot).equals(new Vector2(1, 2))).toBe(true);
  });

  it('lerps', () => {
    expect(new Vector2(0, 0).lerp(new Vector2(10, 20), 0.5).equals(new Vector2(5, 10))).toBe(true);
  });

  it('reports finiteness and converts', () => {
    expect(new Vector2(1, 2).isFinite()).toBe(true);
    expect(new Vector2(NaN, 2).isFinite()).toBe(false);
    expect(new Vector2(1, Infinity).isFinite()).toBe(false);
    expect(new Vector2(1, 2).toArray()).toEqual([1, 2]);
    expect(new Vector2(1, 2).toString()).toBe('Vector2(1, 2)');
  });

  it('provides allocation-free *Into variants that write into the target', () => {
    const out = { x: 0, y: 0 };
    const ret = Vector2.addInto(out, { x: 1, y: 2 }, { x: 3, y: 4 });
    expect(ret).toBe(out);
    expect(out).toEqual({ x: 4, y: 6 });
    Vector2.subtractInto(out, { x: 10, y: 10 }, { x: 1, y: 2 });
    expect(out).toEqual({ x: 9, y: 8 });
  });
});
