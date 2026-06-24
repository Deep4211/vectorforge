import { describe, expect, it } from 'vitest';
import type { Viewport } from '@vectorforge/geometry';
import { DEFAULT_CULL_MARGIN, visibleWorldBox } from '@vectorforge/renderer';

const VIEW = { width: 200, height: 200 };

describe('visibleWorldBox', () => {
  it('expands the visible world rect by the default screen margin', () => {
    const box = visibleWorldBox({ panX: 0, panY: 0, zoom: 1 }, VIEW);
    expect(DEFAULT_CULL_MARGIN).toBe(64);
    expect([box.minX, box.minY, box.maxX, box.maxY]).toEqual([-64, -64, 264, 264]);
  });

  it('shrinks the margin in world units as zoom increases (margin is screen px)', () => {
    const box = visibleWorldBox({ panX: 0, panY: 0, zoom: 2 }, VIEW);
    // screenToWorld(-64,-64) at zoom 2 = (-32,-32); screenToWorld(264,264) = (132,132).
    expect([box.minX, box.minY, box.maxX, box.maxY]).toEqual([-32, -32, 132, 132]);
  });

  it('honors a custom margin and accounts for pan', () => {
    const viewport: Viewport = { panX: -100, panY: 0, zoom: 1 };
    const box = visibleWorldBox(viewport, VIEW, 0);
    // margin 0: visible world = [(0-pan)/zoom .. (200-pan)/zoom] = [100..300] in x.
    expect([box.minX, box.maxX]).toEqual([100, 300]);
  });
});
