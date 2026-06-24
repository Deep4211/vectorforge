import { describe, expect, it } from 'vitest';
import { MAX_ZOOM, MIN_ZOOM } from '@vectorforge/geometry';
import { SceneGraph } from '@vectorforge/document';
import { EditorStore } from '@vectorforge/editor';

describe('EditorStore', () => {
  it('notifies a selector subscriber only when its slice changes', () => {
    const store = new EditorStore(SceneGraph.empty());
    let toolCalls = 0;
    store.subscribe(
      (s) => s.tool,
      () => {
        toolCalls += 1;
      },
    );
    store.set({ hover: 'x' }); // unrelated slice
    expect(toolCalls).toBe(0);
    store.set({ tool: 'rectangle' });
    expect(toolCalls).toBe(1);
    store.set({ tool: 'rectangle' }); // same value → no fire
    expect(toolCalls).toBe(1);
  });

  it('exposes synchronous reads and unsubscribe', () => {
    const scene = SceneGraph.empty();
    const store = new EditorStore(scene);
    expect(store.getScene()).toBe(scene);
    expect(store.getState().tool).toBe('move');
    let calls = 0;
    const off = store.subscribe(
      (s) => s.hover,
      () => {
        calls += 1;
      },
    );
    store.set({ hover: 'a' });
    off();
    store.set({ hover: 'b' });
    expect(calls).toBe(1);
  });

  it('clamps an out-of-range viewport zoom on write (both bounds + NaN)', () => {
    const store = new EditorStore(SceneGraph.empty());
    store.set({ viewport: { panX: 0, panY: 0, zoom: 0.0001 } });
    expect(store.getState().viewport.zoom).toBe(MIN_ZOOM);
    store.set({ viewport: { panX: 0, panY: 0, zoom: 1000 } });
    expect(store.getState().viewport.zoom).toBe(MAX_ZOOM);
    store.set({ viewport: { panX: 0, panY: 0, zoom: Number.NaN } });
    expect(store.getState().viewport.zoom).toBe(MIN_ZOOM);
  });
});
