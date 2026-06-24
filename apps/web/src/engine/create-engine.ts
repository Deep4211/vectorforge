import { EditorController } from '@vectorforge/editor';
import {
  CanvasRenderer,
  FrameScheduler,
  projectScene,
  type MovePreview,
  type ResizePreview,
} from '@vectorforge/renderer';
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

  // One rAF-coalesced frame: project the document (with any in-progress move/resize
  // preview from the editor's ephemeral state) for the current viewport and paint.
  const drawFrame = (): void => {
    if (!attached) return;
    const s = controller.state;
    let move: MovePreview | undefined;
    let resize: ResizePreview | undefined;
    if (
      s.dragOffset &&
      (s.dragOffset.x !== 0 || s.dragOffset.y !== 0) &&
      s.selection.ids.length > 0
    ) {
      move = { ids: new Set(s.selection.ids), dx: s.dragOffset.x, dy: s.dragOffset.y };
    }
    if (s.resizePreview && s.selection.primaryId !== null) {
      resize = {
        id: s.selection.primaryId,
        x: s.resizePreview.x,
        y: s.resizePreview.y,
        w: s.resizePreview.w,
        h: s.resizePreview.h,
      };
    }
    renderer.setViewport(s.viewport);
    renderer.renderFrame(projectScene(controller.scene, s.viewport, viewSize, { move, resize }), {
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
