import type { EditorController, EditorStore } from '@vectorforge/editor';

/**
 * The presentation-facing handle to the running editor (ARCHITECTURE.md §4.2).
 * The concrete renderer backend + frame loop are created and bound at the
 * `apps/web` composition root (UI-5) and injected here; UI components never
 * import `@vectorforge/renderer`. The `<canvas>` is engine-owned (UI-4): the
 * stage hands its element to {@link attach} and forwards size changes; React
 * never drives the render loop.
 */
export interface CanvasEngine {
  readonly controller: EditorController;
  readonly store: EditorStore;
  /** Bind the engine-owned canvas to the renderer. The first paint happens on the
   *  subsequent `resize()` (the stage calls it synchronously after `attach`). */
  attach(canvas: HTMLCanvasElement): void;
  /** Resize the backing store to `css × dpr` and repaint. */
  resize(cssWidth: number, cssHeight: number, dpr: number): void;
  /** Release the renderer (on stage unmount). */
  detach(): void;
  /** Current canvas size in CSS px (for center-anchored zoom); zero before the first layout. */
  viewSize(): { readonly width: number; readonly height: number };
  /** Recolor the canvas dot grid (theme bridge) and repaint. */
  setGridColor(color: string): void;
}
