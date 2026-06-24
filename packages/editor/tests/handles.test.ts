import { describe, expect, it } from 'vitest';
import { BoundingBox, Transform, Vector2, type Viewport } from '@vectorforge/geometry';
import { createRectangle, SceneGraph } from '@vectorforge/document';
import {
  handleScreenPoints,
  hitTestHandle,
  resizeRect,
  selectionWorldBounds,
  type HandlePosition,
} from '@vectorforge/editor';

const IDENTITY: Viewport = { panX: 0, panY: 0, zoom: 1 };
const START = { x: 0, y: 0, w: 100, h: 50 };

function r(handle: HandlePosition, dx: number, dy: number, opts = {}) {
  const rect = resizeRect(START, handle, dx, dy, opts);
  return [rect.x, rect.y, rect.w, rect.h];
}

describe('resizeRect — anchored edges', () => {
  it('SE grows from the top-left anchor', () => {
    expect(r('se', 10, 5)).toEqual([0, 0, 110, 55]);
  });

  it('NW moves the top-left corner, anchoring the bottom-right', () => {
    expect(r('nw', 10, 5)).toEqual([10, 5, 90, 45]);
  });

  it('E resizes width only and keeps the vertical center fixed', () => {
    expect(r('e', 10, 0)).toEqual([0, 0, 110, 50]);
  });

  it('N resizes height only and keeps the horizontal center fixed', () => {
    expect(r('n', 0, -10)).toEqual([0, -10, 100, 60]);
  });
});

describe('resizeRect — modifiers', () => {
  it('aspect-locks a corner to the start ratio (Shift)', () => {
    // ratio 2:1; width grows by 10 ⇒ height follows to 55.
    expect(r('se', 10, 0, { aspect: true })).toEqual([0, 0, 110, 55]);
  });

  it('aspect-locks edge handles (forced width- / height-driven)', () => {
    // 'e' is width-only ⇒ height follows, vertically re-centered.
    expect(r('e', 10, 0, { aspect: true })).toEqual([0, -2.5, 110, 55]);
    // 'n' is height-only ⇒ width follows, horizontally re-centered, bottom anchored.
    expect(r('n', 0, -10, { aspect: true })).toEqual([-10, -10, 120, 60]);
  });

  it('resizes symmetrically about the center (Alt)', () => {
    expect(r('se', 10, 5, { fromCenter: true })).toEqual([-10, -5, 120, 60]);
  });

  it('never collapses below the minimum size', () => {
    expect(r('se', -200, -200)).toEqual([0, 0, 1, 1]);
  });
});

describe('handles — screen geometry & hit-testing', () => {
  const bounds = new BoundingBox(0, 0, 100, 100);

  it('places the eight handles at the bounds corners and edge midpoints', () => {
    const pts = handleScreenPoints(bounds, IDENTITY);
    expect([pts.nw.x, pts.nw.y]).toEqual([0, 0]);
    expect([pts.se.x, pts.se.y]).toEqual([100, 100]);
    expect([pts.n.x, pts.n.y]).toEqual([50, 0]);
    expect([pts.e.x, pts.e.y]).toEqual([100, 50]);
  });

  it('projects handle positions through the viewport', () => {
    const pts = handleScreenPoints(bounds, { panX: 10, panY: 20, zoom: 2 });
    expect([pts.se.x, pts.se.y]).toEqual([210, 220]); // 100*2+10, 100*2+20
  });

  it('grabs the nearest handle within the hit radius, else null', () => {
    expect(hitTestHandle(bounds, IDENTITY, { x: 2, y: 2 })).toBe('nw');
    expect(hitTestHandle(bounds, IDENTITY, { x: 100, y: 100 })).toBe('se');
    expect(hitTestHandle(bounds, IDENTITY, { x: 50, y: 0 })).toBe('n');
    expect(hitTestHandle(bounds, IDENTITY, { x: 50, y: 50 })).toBeNull(); // center: no handle
  });
});

describe('selectionWorldBounds', () => {
  it('unions the selected nodes’ world bounds', () => {
    const g = SceneGraph.empty();
    g.add(
      createRectangle({
        id: 'a',
        size: { w: 20, h: 20 },
        transform: new Transform(new Vector2(0, 0), 0, Vector2.ONE),
      }),
    );
    g.add(
      createRectangle({
        id: 'b',
        size: { w: 20, h: 20 },
        transform: new Transform(new Vector2(80, 80), 0, Vector2.ONE),
      }),
    );
    const box = selectionWorldBounds(g, ['a', 'b'])!;
    expect([box.minX, box.minY, box.maxX, box.maxY]).toEqual([0, 0, 100, 100]);
    expect(selectionWorldBounds(g, [])).toBeNull();
  });
});
