import { clamp, MAX_ZOOM, MIN_ZOOM, type Viewport } from '@vectorforge/geometry';
import type { SceneGraph } from '@vectorforge/document';
import { EMPTY_SELECTION, type EditorState } from './types';

type Selector<T> = (state: Readonly<EditorState>) => T;
type Listener<T> = (value: T) => void;
type Equality<T> = (a: T, b: T) => boolean;

interface Subscription<T> {
  readonly selector: Selector<T>;
  readonly listener: Listener<T>;
  readonly equals: Equality<T>;
  last: T;
}

const DEFAULT_VIEWPORT: Viewport = { panX: 0, panY: 0, zoom: 1 };

function initialState(viewport: Viewport): EditorState {
  return {
    tool: 'move',
    viewport,
    selection: EMPTY_SELECTION,
    hover: null,
    interaction: 'idle',
    draft: null,
    dragOffset: null,
    documentVersion: 0,
    dirty: false,
  };
}

/**
 * The framework-agnostic observable store (ARCHITECTURE.md §4.2). It owns the
 * ephemeral editor state and a reference to the document `SceneGraph`. Reads are
 * synchronous (`getState`/`getScene`) so the interaction/render hot path never
 * waits on a UI framework (EDT-5); writes go through the single `set` path
 * (EDT-3). React binds to it later via `useSyncExternalStore` — but this layer
 * imports no React (EDT-1).
 */
export class EditorStore {
  private state: EditorState;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- heterogeneous selector subscriptions
  private readonly subscriptions = new Set<Subscription<any>>();

  constructor(
    private readonly scene: SceneGraph,
    viewport: Viewport = DEFAULT_VIEWPORT,
  ) {
    this.state = initialState(viewport);
  }

  getScene(): SceneGraph {
    return this.scene;
  }

  getState(): Readonly<EditorState> {
    return this.state;
  }

  /**
   * Subscribe to a derived slice of state. The listener fires only when the
   * selector's output changes (by `equals`, default `Object.is`) — so a pan does
   * not wake a selection subscriber. Returns an unsubscribe function.
   */
  subscribe<T>(
    selector: Selector<T>,
    listener: Listener<T>,
    equals: Equality<T> = Object.is,
  ): () => void {
    const sub: Subscription<T> = { selector, listener, equals, last: selector(this.state) };
    this.subscriptions.add(sub);
    return () => {
      this.subscriptions.delete(sub);
    };
  }

  /** The single write path. Merges `patch`, then notifies changed subscribers. */
  set(patch: Partial<EditorState>): void {
    const next = { ...this.state, ...patch };
    // Clamp the zoom defensively (both bounds, and NaN/±Infinity) so no
    // out-of-range viewport reaches the renderer, regardless of the caller.
    if (patch.viewport) {
      const z = patch.viewport.zoom;
      const safeZoom = Number.isFinite(z) ? clamp(z, MIN_ZOOM, MAX_ZOOM) : MIN_ZOOM;
      if (safeZoom !== z) next.viewport = { ...patch.viewport, zoom: safeZoom };
    }
    this.state = next;
    for (const sub of this.subscriptions) {
      const value = sub.selector(this.state);
      if (!sub.equals(sub.last, value)) {
        sub.last = value;
        sub.listener(value);
      }
    }
  }
}
