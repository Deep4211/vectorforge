import {
  CanvasRenderer,
  documentBounds,
  projectScene,
  type RenderScene,
} from '@vectorforge/renderer';
import type { CanvasEngine } from '@vectorforge/ui';

// A neutral, viewport-independent projection of the whole document: world-space
// matrices (so SVG coordinates are document coordinates) and a cull margin large
// enough to include every item regardless of where the user is panned/zoomed.
const NEUTRAL_VIEWPORT = { panX: 0, panY: 0, zoom: 1 };
const ALL_VISIBLE = { cullMargin: 1e9 };

export function exportScene(engine: CanvasEngine): RenderScene {
  return projectScene(
    engine.controller.scene,
    NEUTRAL_VIEWPORT,
    { width: 1, height: 1 },
    ALL_VISIBLE,
  );
}

/**
 * Render the whole document to a PNG Blob at `scale`× (default 2). Frames the art
 * to its bounds on an offscreen canvas and reuses the Canvas2D backend, so output
 * matches the on-screen render exactly. Returns null for an empty document.
 */
export async function renderDocumentPng(engine: CanvasEngine, scale = 2): Promise<Blob | null> {
  const scene = exportScene(engine);
  const bounds = documentBounds(scene);
  if (!bounds) return null;

  const width = Math.max(1, Math.ceil(bounds.maxX - bounds.minX));
  const height = Math.max(1, Math.ceil(bounds.maxY - bounds.minY));
  const canvas = document.createElement('canvas');

  const renderer = new CanvasRenderer({ showGrid: false });
  renderer.attach(canvas);
  renderer.resize(width, height, scale); // backing store = width·scale × height·scale
  renderer.setViewport({ panX: -bounds.minX, panY: -bounds.minY, zoom: 1 });
  renderer.renderFrame(scene, { kind: 'full' });

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}
