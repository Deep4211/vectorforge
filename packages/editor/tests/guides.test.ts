import { describe, expect, it } from 'vitest';
import { Transform, Vector2 } from '@vectorforge/geometry';
import { createFrame, createRectangle, SceneGraph } from '@vectorforge/document';
import { alignmentGuides } from '@vectorforge/editor';

function rect(id: string, x: number, y: number, w = 20, h = 20) {
  return createRectangle({
    id,
    size: { w, h },
    transform: new Transform(new Vector2(x, y), 0, Vector2.ONE),
  });
}

describe('alignmentGuides', () => {
  it('measures the four edge gaps to the parent frame', () => {
    const g = SceneGraph.empty();
    g.add(createFrame({ id: 'f', size: { w: 100, h: 100 } }));
    g.add(rect('a', 20, 30), 'f'); // world bounds (20,30)-(40,50)

    const gaps = alignmentGuides(g, 'a').filter((x) => x.kind === 'gap');
    // Pin orientation, endpoints, and kind — the exact fields the renderer draws.
    expect(gaps).toEqual([
      {
        orientation: 'horizontal',
        from: { x: 0, y: 40 },
        to: { x: 20, y: 40 },
        distance: 20,
        kind: 'gap',
      },
      {
        orientation: 'horizontal',
        from: { x: 40, y: 40 },
        to: { x: 100, y: 40 },
        distance: 60,
        kind: 'gap',
      },
      {
        orientation: 'vertical',
        from: { x: 30, y: 0 },
        to: { x: 30, y: 30 },
        distance: 30,
        kind: 'gap',
      },
      {
        orientation: 'vertical',
        from: { x: 30, y: 50 },
        to: { x: 30, y: 100 },
        distance: 50,
        kind: 'gap',
      },
    ]);
  });

  it('flags center alignment when the node is centered in the frame', () => {
    const g = SceneGraph.empty();
    g.add(createFrame({ id: 'f', size: { w: 100, h: 100 } }));
    g.add(rect('a', 40, 40), 'f'); // centered: midpoint (50,50)

    const centers = alignmentGuides(g, 'a').filter((x) => x.kind === 'center');
    expect(centers.map((c) => c.orientation).sort()).toEqual(['horizontal', 'vertical']);
  });

  it('returns nothing for a node with no parent frame', () => {
    const g = SceneGraph.empty();
    g.add(rect('a', 0, 0)); // top-level, no parent
    expect(alignmentGuides(g, 'a')).toEqual([]);
    expect(alignmentGuides(g, 'missing')).toEqual([]);
  });
});
