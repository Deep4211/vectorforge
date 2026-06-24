import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { EditorController } from '@vectorforge/editor';
import {
  EditorProvider,
  WorkspaceProvider,
  type CanvasEngine,
  type WorkspaceService,
} from '@vectorforge/ui';

/** A no-op workspace so chrome that consumes the File menu renders in tests. */
const stubWorkspace: WorkspaceService = {
  newDocument() {},
  downloadVf() {},
  openVf() {},
  exportPng() {},
  exportSvg() {},
};

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
    setGridColor() {},
  };
}

export function renderWithEngine(
  ui: ReactElement,
  engine: CanvasEngine = makeTestEngine(),
): { engine: CanvasEngine } & ReturnType<typeof render> {
  return {
    engine,
    ...render(
      <EditorProvider engine={engine}>
        <WorkspaceProvider service={stubWorkspace}>{ui}</WorkspaceProvider>
      </EditorProvider>,
    ),
  };
}
