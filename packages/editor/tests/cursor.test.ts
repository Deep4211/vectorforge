import { describe, expect, it } from 'vitest';
import { resolveCursor } from '@vectorforge/editor';

describe('resolveCursor', () => {
  it('shows a directional resize cursor for a hovered handle', () => {
    expect(resolveCursor({ tool: 'move', phase: 'idle', hoverHandle: 'nw' })).toBe('nwse-resize');
    expect(resolveCursor({ tool: 'move', phase: 'idle', hoverHandle: 'ne' })).toBe('nesw-resize');
    expect(resolveCursor({ tool: 'move', phase: 'resizing', hoverHandle: 'e' })).toBe('ew-resize');
    expect(resolveCursor({ tool: 'move', phase: 'idle', hoverHandle: 'n' })).toBe('ns-resize');
  });

  it('reflects the interaction phase', () => {
    expect(resolveCursor({ tool: 'move', phase: 'panning', hoverHandle: null })).toBe('grabbing');
    expect(resolveCursor({ tool: 'move', phase: 'dragging', hoverHandle: null })).toBe('move');
  });

  it('falls back to the tool cursor', () => {
    expect(resolveCursor({ tool: 'move', phase: 'idle', hoverHandle: null })).toBe('default');
    expect(resolveCursor({ tool: 'hand', phase: 'idle', hoverHandle: null })).toBe('grab');
    expect(resolveCursor({ tool: 'text', phase: 'idle', hoverHandle: null })).toBe('text');
    expect(resolveCursor({ tool: 'rectangle', phase: 'idle', hoverHandle: null })).toBe(
      'crosshair',
    );
  });
});
