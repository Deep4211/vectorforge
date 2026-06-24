import type { Point } from './types';

/**
 * Shortest distance from point `p` to the line segment `a`–`b` (all in the same
 * space). Used by the renderer/interaction layers for stroke-proximity hit-testing
 * (ARCHITECTURE.md §8.4 narrow phase). A degenerate segment (`a === b`) reduces to
 * the distance to that point.
 */
export function distancePointToSegment(p: Point, a: Point, b: Point): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const lenSq = abx * abx + aby * aby;
  // Project ap onto ab, clamped to the segment [0, 1].
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, (apx * abx + apy * aby) / lenSq));
  const cx = a.x + t * abx;
  const cy = a.y + t * aby;
  const dx = p.x - cx;
  const dy = p.y - cy;
  return Math.sqrt(dx * dx + dy * dy);
}
