import { EditorController } from '@vectorforge/editor';
import { CanvasRenderer, FrameScheduler, projectScene } from '@vectorforge/renderer';
import type { CanvasEngine } from '@vectorforge/ui';
import { buildSampleDocument } from './sample-document';

/**
 * The composition root (UI-5): selects the concrete renderer backend (Canvas2D),
 * wires the rAF-coalesced frame loop to the editor's render scheduler, and
 * implements the {@link CanvasEngine} port the UI consumes. Nothing below the
 * presentation layer knows which renderer was chosen.
 */
export function createEngine(): CanvasEngine {
  const scene = buildSampleDocument();
  const renderer = new CanvasRenderer();
  let viewSize = { width: 0, height: 0 };
  let attached = false;

  // One rAF-coalesced frame: project the document for the current viewport and paint.
  const drawFrame = (): void => {
    if (!attached) return;
    renderer.setViewport(controller.state.viewport);
    renderer.renderFrame(projectScene(controller.scene, controller.state.viewport, viewSize), {
      kind: 'full',
    });
  };

  const scheduler = new FrameScheduler(drawFrame, { budgetMs: 8 });
  const controller = new EditorController({ scene, scheduler });

  return {
    controller,
    store: controller.store,
    attach(canvas) {
      renderer.attach(canvas);
      attached = true;
    },
    resize(cssWidth, cssHeight, dpr) {
      viewSize = { width: cssWidth, height: cssHeight };
      renderer.resize(cssWidth, cssHeight, dpr);
      drawFrame();
    },
    detach() {
      attached = false;
      renderer.dispose();
    },
    viewSize() {
      return viewSize;
    },
  };
}
