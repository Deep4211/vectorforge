import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { EditorController } from '@vectorforge/editor';
import { EditorProvider, type CanvasEngine } from '@vectorforge/ui';

/**
 * A headless engine for component tests: a real {@link EditorController} (so
 * intentions and view models behave exactly as in production) behind no-op
 * renderer hooks (the canvas needs no 2D context under jsdom).
 */
export function makeTestEngine(): CanvasEngine {
  const controller = new EditorController();
  return {
    controller,
    store: controller.store,
    attach() {},
    resize() {},
    detach() {},
    viewSize() {
      return { width: 800, height: 600 };
    },
  };
}

export function renderWithEngine(
  ui: ReactElement,
  engine: CanvasEngine = makeTestEngine(),
): { engine: CanvasEngine } & ReturnType<typeof render> {
  return { engine, ...render(<EditorProvider engine={engine}>{ui}</EditorProvider>) };
}
