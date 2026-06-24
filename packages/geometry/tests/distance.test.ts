import { describe, expect, it } from 'vitest';
import { distancePointToSegment } from '@vectorforge/geometry';

describe('distancePointToSegment', () => {
  const a = { x: 0, y: 0 };
  const b = { x: 10, y: 0 };

  it('is zero for a point on the segment', () => {
    expect(distancePointToSegment({ x: 5, y: 0 }, a, b)).toBe(0);
  });

  it('measures the perpendicular distance to the interior', () => {
    expect(distancePointToSegment({ x: 5, y: 3 }, a, b)).toBeCloseTo(3, 9);
  });

  it('clamps to the nearer endpoint beyond the segment ends', () => {
    expect(distancePointToSegment({ x: -4, y: 0 }, a, b)).toBeCloseTo(4, 9); // before a
    expect(distancePointToSegment({ x: 13, y: 4 }, a, b)).toBeCloseTo(5, 9); // past b (3-4-5)
  });

  it('reduces to point distance for a degenerate segment', () => {
    expect(distancePointToSegment({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 })).toBeCloseTo(
      5,
      9,
    );
  });
});
