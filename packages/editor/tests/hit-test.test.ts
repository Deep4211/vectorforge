import { describe, expect, it } from 'vitest';
import { Rectangle, Transform, Vector2 } from '@vectorforge/geometry';
import { createFrame, createRectangle, SceneGraph } from '@vectorforge/document';
import { hitTest, marqueeHits } from '@vectorforge/editor';

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
