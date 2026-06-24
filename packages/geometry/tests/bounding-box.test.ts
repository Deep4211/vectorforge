import { describe, expect, it } from 'vitest';
import { BoundingBox, Matrix3, Rectangle, Vector2 } from '@vectorforge/geometry';

describe('BoundingBox', () => {
  it('normalizes swapped extents in the constructor', () => {
    const b = new BoundingBox(10, 10, 0, 0);
    expect([b.minX, b.minY, b.maxX, b.maxY]).toEqual([0, 0, 10, 10]);
  });

  it('builds from points (throws when empty)', () => {
    const b = BoundingBox.fromPoints([
      { x: 1, y: 5 },
      { x: -3, y: 2 },
      { x: 4, y: -1 },
    ]);
    expect([b.minX, b.minY, b.maxX, b.maxY]).toEqual([-3, -1, 4, 5]);
    expect(() => BoundingBox.fromPoints([])).toThrow(/at least one point/);
  });

  it('builds from a rect and from boxes (throws when empty)', () => {
    expect(
      BoundingBox.fromRect({ x: 0, y: 0, w: 5, h: 8 }).equals(new BoundingBox(0, 0, 5, 8)),
    ).toBe(true);
    const u = BoundingBox.fromBoxes([new BoundingBox(0, 0, 5, 5), new BoundingBox(3, 3, 10, 4)]);
    expect(u.equals(new BoundingBox(0, 0, 10, 5))).toBe(true);
    expect(() => BoundingBox.fromBoxes([])).toThrow(/at least one box/);
  });

  it('reports dimensions, center, corners, area', () => {
    const b = new BoundingBox(0, 0, 10, 20);
    expect(b.width).toBe(10);
    expect(b.height).toBe(20);
    expect(b.center().equals(new Vector2(5, 10))).toBe(true);
    expect(b.corners()[2].equals(new Vector2(10, 20))).toBe(true);
    expect(b.area()).toBe(200);
  });

  it('collision and containment', () => {
    const a = new BoundingBox(0, 0, 10, 10);
    expect(a.contains({ x: 5, y: 5 })).toBe(true);
    expect(a.containsBox(new BoundingBox(2, 2, 8, 8))).toBe(true);
    expect(a.intersects(new BoundingBox(5, 5, 15, 15))).toBe(true);
    expect(a.intersects(new BoundingBox(10, 0, 20, 10))).toBe(false); // edge-touch
    expect(
      a.intersection(new BoundingBox(5, 5, 15, 15))?.equals(new BoundingBox(5, 5, 10, 10)),
    ).toBe(true);
    expect(a.intersection(new BoundingBox(50, 50, 60, 60))).toBeNull();
    expect(a.union(new BoundingBox(5, 5, 20, 20)).equals(new BoundingBox(0, 0, 20, 20))).toBe(true);
  });

  it('expandToInclude and inflate', () => {
    expect(
      new BoundingBox(0, 0, 5, 5)
        .expandToInclude({ x: 10, y: -2 })
        .equals(new BoundingBox(0, -2, 10, 5)),
    ).toBe(true);
    expect(new BoundingBox(0, 0, 10, 10).inflate(5).equals(new BoundingBox(-5, -5, 15, 15))).toBe(
      true,
    );
  });

  it('transforms by a matrix to the world AABB', () => {
    const box = new BoundingBox(0, 0, 10, 10);
    // pure translation
    expect(box.transform(Matrix3.translation(5, 5)).equals(new BoundingBox(5, 5, 15, 15))).toBe(
      true,
    );
    // 90° rotation about origin maps [0,10]² → x in [-10,0], y in [0,10]
    const rotated = box.transform(Matrix3.rotation(90));
    expect(rotated.equals(new BoundingBox(-10, 0, 0, 10), 1e-6)).toBe(true);
  });

  it('converts to a Rectangle', () => {
    expect(new BoundingBox(1, 2, 5, 8).toRectangle().equals(new Rectangle(1, 2, 4, 6))).toBe(true);
  });

  it('finiteness and string form', () => {
    expect(new BoundingBox(0, 0, 1, 1).isFinite()).toBe(true);
    expect(new BoundingBox(0, 0, Infinity, 1).isFinite()).toBe(false);
    expect(new BoundingBox(1, 2, 3, 4).toString()).toBe('BoundingBox(1, 2, 3, 4)');
  });
});
