import { BoundingBox } from '@vectorforge/geometry';
import type { RenderScene } from '../types';

/**
 * The world-space bounding box enclosing every paintable item in a scene, or
 * `null` for an empty scene. Used to frame exports (SVG viewBox / PNG canvas).
 */
export function documentBounds(scene: RenderScene): BoundingBox | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let found = false;

  for (const item of scene.items) {
    const b = item.worldBounds;
    if (!b) continue;
    found = true;
    if (b.minX < minX) minX = b.minX;
    if (b.minY < minY) minY = b.minY;
    if (b.maxX > maxX) maxX = b.maxX;
    if (b.maxY > maxY) maxY = b.maxY;
  }

  return found ? new BoundingBox(minX, minY, maxX, maxY) : null;
}
