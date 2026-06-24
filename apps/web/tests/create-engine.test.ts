import { describe, expect, it } from 'vitest';
import { createEngine } from '../src/engine/create-engine';

/** A fake canvas whose 2D context records every method call (a full paint calls clearRect). */
function recordingCanvas() {
  const calls: string[] = [];
  const ctx = new Proxy(
    {},
    {
      get:
        (_target, prop) =>
        (..._args: unknown[]) => {
          if (typeof prop === 'string') calls.push(prop);
        },
      set: () => true,
    },
  );
  const canvas = { width: 0, height: 0, getContext: () => ctx };
  return {
    canvas: canvas as unknown as HTMLCanvasElement,
    paints: () => calls.filter((c) => c === 'clearRect').length,
  };
}

describe('createEngine — composition-root render lifecycle (UI-4/UI-5)', () => {
  it('paints on resize, stops after detach, and repaints on re-attach', () => {
    const engine = createEngine();

    const a = recordingCanvas();
    engine.attach(a.canvas);
    engine.resize(800, 600, 1);
    expect(a.paints()).toBeGreaterThan(0); // attach + first resize paints a full frame
    expect(engine.viewSize()).toEqual({ width: 800, height: 600 });

    const painted = a.paints();
    engine.detach();
    engine.resize(400, 300, 1);
    expect(a.paints()).toBe(painted); // the drawFrame `!attached` guard suppresses paints

    const b = recordingCanvas();
    engine.attach(b.canvas); // StrictMode-style remount onto a fresh canvas
    engine.resize(640, 480, 2);
    expect(b.paints()).toBeGreaterThan(0);
    expect(engine.viewSize()).toEqual({ width: 640, height: 480 });
  });
});
