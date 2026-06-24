import { describe, expect, it } from 'vitest';
import { Rectangle, Transform, Vector2 } from '@vectorforge/geometry';
import {
  createEllipse,
  createFrame,
  createLine,
  createRectangle,
  SceneGraph,
} from '@vectorforge/document';
import { hitTest, hitTestAll, marqueeHits } from '@vectorforge/editor';

function at(id: string, x: number, y: number, w = 20, h = 20) {
  return createRectangle({
    id,
    size: { w, h },
    transform: new Transform(new Vector2(x, y), 0, Vector2.ONE),
  });
}

function scene(): SceneGraph {
  const g = SceneGraph.empty();
  g.add(createFrame({ id: 'f', size: { w: 100, h: 100 } }));
  g.add(at('a', 10, 10), 'f');
  g.add(at('b', 10, 10), 'f'); // overlaps a; added later ⇒ front-most
  return g;
}

describe('hitTest', () => {
  it('returns the front-most node under the point', () => {
    expect(hitTest(scene(), { x: 15, y: 15 })).toBe('b');
    expect(hitTest(scene(), { x: 200, y: 200 })).toBeNull();
  });

  it('skips effectively-hidden and effectively-locked nodes', () => {
    const hidden = scene();
    hidden.setVisibility('b', false);
    expect(hitTest(hidden, { x: 15, y: 15 })).toBe('a');

    const locked = scene();
    locked.setLocked('b', true);
    expect(hitTest(locked, { x: 15, y: 15 })).toBe('a');
    expect(hitTest(locked, { x: 15, y: 15 }, { skipLocked: false })).toBe('b');
  });
});

describe('hitTest — narrow phase (precise geometry)', () => {
  it('misses the corner of an ellipse that is inside its AABB', () => {
    const g = SceneGraph.empty();
    g.add(createEllipse({ id: 'e', size: { w: 100, h: 100 } }));
    expect(hitTest(g, { x: 50, y: 50 })).toBe('e'); // center
    expect(hitTest(g, { x: 3, y: 3 })).toBeNull(); // AABB corner, outside the disc
  });

  it('respects rotation — the AABB corner of a rotated rect is not a hit', () => {
    const g = SceneGraph.empty();
    // 40×40 square rotated 45° about its center at world (50,50).
    g.add(
      createRectangle({
        id: 'r',
        size: { w: 40, h: 40 },
        transform: new Transform(new Vector2(50, 50), 45, Vector2.ONE),
      }),
    );
    expect(hitTest(g, { x: 50, y: 78 })).toBe('r'); // interior of the rotated square
    // Inside the world AABB but past a rotated edge ⇒ not a hit.
    expect(hitTest(g, { x: 78, y: 52 })).toBeNull();
  });

  it('hits a thin line only within its stroke proximity (+ tolerance)', () => {
    const g = SceneGraph.empty();
    g.add(
      createLine({
        id: 'l',
        a: { x: 0, y: 0 },
        b: { x: 100, y: 0 },
        stroke: '#000',
        strokeWidth: 2,
      }),
    );
    expect(hitTest(g, { x: 50, y: 0.5 })).toBe('l'); // within strokeWidth/2 = 1
    expect(hitTest(g, { x: 50, y: 5 })).toBeNull(); // too far
    expect(hitTest(g, { x: 50, y: 5 }, { tolerance: 6 })).toBe('l'); // slack grabs it
  });

  it('hits a scaled-up line via its local stroke band (broad phase stays in local space)', () => {
    const g = SceneGraph.empty();
    g.add(
      createLine({
        id: 'l',
        a: { x: 0, y: 0 },
        b: { x: 100, y: 0 },
        stroke: '#000',
        strokeWidth: 2,
        transform: new Transform(new Vector2(0, 0), 0, new Vector2(10, 10)),
      }),
    );
    expect(hitTest(g, { x: 500, y: 5 })).toBe('l'); // local (50,0.5), within stroke band
    expect(hitTest(g, { x: 500, y: 15 })).toBeNull(); // local (50,1.5), outside it
  });
});

describe('hitTestAll — overlap cycling order', () => {
  it('returns every node under the point, front-to-back (children over the frame)', () => {
    expect(hitTestAll(scene(), { x: 15, y: 15 })).toEqual(['b', 'a', 'f']);
  });
});

describe('marqueeHits', () => {
  it('returns all pickable nodes intersecting the rectangle', () => {
    const hits = marqueeHits(scene(), new Rectangle(0, 0, 100, 100));
    expect(hits).toEqual(['f', 'a', 'b']); // flatten order
  });

  it('excludes nodes outside the rectangle', () => {
    expect(marqueeHits(scene(), new Rectangle(500, 500, 10, 10))).toEqual([]);
  });

  it('excludes effectively-hidden and effectively-locked nodes (opt-out includes locked)', () => {
    const g = scene();
    g.setVisibility('a', false);
    g.setLocked('b', true);
    expect(marqueeHits(g, new Rectangle(0, 0, 100, 100))).toEqual(['f']);
    expect(marqueeHits(g, new Rectangle(0, 0, 100, 100), { skipLocked: false })).toEqual([
      'f',
      'b',
    ]);
  });
});
