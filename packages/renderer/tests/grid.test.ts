import { describe, expect, it } from 'vitest';
import type { Viewport } from '@vectorforge/geometry';
import { paintDotGrid } from '@vectorforge/renderer';
import { RecordingContext } from './recording-context';

const VIEW = { width: 100, height: 100 };

function dots(viewport: Viewport, options = {}) {
  const ctx = new RecordingContext();
  paintDotGrid(ctx, viewport, VIEW, options);
  return ctx.opsOf('fillRect').length;
}

describe('paintDotGrid', () => {
  it('draws a dot at every visible grid intersection', () => {
    // spacing 50 world units at zoom 1 over 100×100 ⇒ 3×3 grid (0,50,100).
    const n = dots({ panX: 0, panY: 0, zoom: 1 }, { spacing: 50, minScreenSpacing: 1 });
    expect(n).toBe(9);
  });

  it('coarsens spacing as you zoom out so dots never get denser than the floor', () => {
    // spacing 10 at zoom 0.1 ⇒ 1px on screen; coarsens until ≥ 12px screen spacing.
    const dense = dots({ panX: 0, panY: 0, zoom: 0.1 }, { spacing: 10, minScreenSpacing: 12 });
    // Without coarsening this would be ~ (100/1)^2; coarsening keeps it tiny.
    expect(dense).toBeLessThan(50);
  });

  it('skips entirely when the grid would exceed the dot cap', () => {
    const n = dots({ panX: 0, panY: 0, zoom: 1 }, { spacing: 1, minScreenSpacing: 1, maxDots: 10 });
    expect(n).toBe(0);
  });

  it('skips a degenerate (non-positive) zoom or spacing', () => {
    expect(dots({ panX: 0, panY: 0, zoom: 0 }, { spacing: 50 })).toBe(0);
    expect(dots({ panX: 0, panY: 0, zoom: 1 }, { spacing: 0 })).toBe(0);
  });
});
