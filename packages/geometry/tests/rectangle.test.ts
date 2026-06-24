import { describe, expect, it } from 'vitest';
import { BoundingBox, Rect, Rectangle, Vector2 } from '@vectorforge/geometry';

describe('Rectangle', () => {
  it('constructs via factories', () => {
    expect(Rectangle.of(0, 0, 10, 20).equals(new Rectangle(0, 0, 10, 20))).toBe(true);
    expect(
      Rectangle.fromPoints({ x: 10, y: 10 }, { x: 0, y: 0 }).equals(new Rectangle(0, 0, 10, 10)),
    ).toBe(true);
    expect(Rectangle.fromBox(new BoundingBox(0, 0, 5, 8)).equals(new Rectangle(0, 0, 5, 8))).toBe(
      true,
    );
    expect(Rectangle.fromCenter({ x: 5, y: 5 }, 10, 10).equals(new Rectangle(0, 0, 10, 10))).toBe(
      true,
    );
  });

  it('exposes the Rect alias of ARCHITECTURE §6.1', () => {
    expect(Rect).toBe(Rectangle);
    expect(new Rect(0, 0, 1, 1) instanceof Rectangle).toBe(true);
  });

  it('computes edges/center/corners (sign-independent)', () => {
    const r = new Rectangle(0, 0, 10, 20);
    expect([r.left, r.top, r.right, r.bottom]).toEqual([0, 0, 10, 20]);
    expect(r.center().equals(new Vector2(5, 10))).toBe(true);
    expect(r.corners()[2].equals(new Vector2(10, 20))).toBe(true);
    // negative size normalizes for queries
    const neg = new Rectangle(10, 20, -10, -20);
    expect([neg.left, neg.top, neg.right, neg.bottom]).toEqual([0, 0, 10, 20]);
    expect(neg.center().equals(new Vector2(5, 10))).toBe(true);
  });

  it('area and emptiness', () => {
    expect(new Rectangle(0, 0, 10, 20).area()).toBe(200);
    expect(new Rectangle(0, 0, -10, 20).area()).toBe(200);
    expect(new Rectangle(0, 0, 0, 20).isEmpty()).toBe(true);
    expect(new Rectangle(0, 0, 20, 0).isEmpty()).toBe(true);
    expect(new Rectangle(0, 0, 20, 20).isEmpty()).toBe(false);
  });

  it('containment', () => {
    const r = new Rectangle(0, 0, 10, 10);
    expect(r.contains({ x: 5, y: 5 })).toBe(true);
    expect(r.contains({ x: 0, y: 0 })).toBe(true); // edge inclusive
    expect(r.contains({ x: 11, y: 5 })).toBe(false);
    expect(r.containsRect(new Rectangle(2, 2, 5, 5))).toBe(true);
    expect(r.containsRect(new Rectangle(2, 2, 50, 5))).toBe(false);
  });

  it('intersection and union', () => {
    const a = new Rectangle(0, 0, 10, 10);
    const b = new Rectangle(5, 5, 10, 10);
    expect(a.intersects(b)).toBe(true);
    expect(a.intersection(b)?.equals(new Rectangle(5, 5, 5, 5))).toBe(true);
    expect(a.union(b).equals(new Rectangle(0, 0, 15, 15))).toBe(true);
    // edge-touch is not a positive-area intersection
    const c = new Rectangle(10, 0, 10, 10);
    expect(a.intersects(c)).toBe(false);
    expect(a.intersection(c)).toBeNull();
    // fully disjoint
    expect(a.intersection(new Rectangle(100, 100, 5, 5))).toBeNull();
  });

  it('inflate / translate / normalize', () => {
    const r = new Rectangle(10, 10, 10, 10);
    expect(r.inflate(5).equals(new Rectangle(5, 5, 20, 20))).toBe(true);
    expect(r.inflateXY(1, 2).equals(new Rectangle(9, 8, 12, 14))).toBe(true);
    expect(r.translate({ x: 5, y: -5 }).equals(new Rectangle(15, 5, 10, 10))).toBe(true);
    expect(new Rectangle(10, 10, -10, -10).normalize().equals(new Rectangle(0, 0, 10, 10))).toBe(
      true,
    );
  });

  it('finiteness and string form', () => {
    expect(new Rectangle(0, 0, 1, 1).isFinite()).toBe(true);
    expect(new Rectangle(0, NaN, 1, 1).isFinite()).toBe(false);
    expect(new Rectangle(1, 2, 3, 4).toString()).toBe('Rectangle(1, 2, 3, 4)');
  });

  it('queries are sign-independent (negative-size rectangles)', () => {
    const neg = new Rectangle(10, 10, -10, -10); // same region as (0, 0, 10, 10)
    expect(neg.contains({ x: 5, y: 5 })).toBe(true);
    expect(neg.contains({ x: 20, y: 20 })).toBe(false);
    const other = new Rectangle(5, 5, 10, 10);
    expect(neg.intersects(other)).toBe(true);
    expect(neg.intersection(other)?.equals(new Rectangle(5, 5, 5, 5))).toBe(true);
    expect(neg.union(other).equals(new Rectangle(0, 0, 15, 15))).toBe(true);
  });
});
