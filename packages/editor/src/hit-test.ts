import { BoundingBox, type Point, type Rectangle } from '@vectorforge/geometry';
import type { NodeId, SceneGraph } from '@vectorforge/document';

/**
 * Hit-testing over the scene graph. Sprint 4 uses world-space axis-aligned
 * bounds (front-to-back), which is exact for unrotated nodes and a tight-enough
 * broad phase otherwise; the spatial index + precise narrow phase land in
 * Sprint 6. Effectively-hidden and (unless opted out) effectively-locked nodes
 * are never hit (SEL-003 / EDT-6).
 */
export interface HitOptions {
  /** Skip effectively-locked nodes (default true). */
  readonly skipLocked?: boolean;
}

function isPickable(scene: SceneGraph, id: NodeId, skipLocked: boolean): boolean {
  if (!scene.isEffectivelyVisible(id)) return false;
  if (skipLocked && scene.isEffectivelyLocked(id)) return false;
  return true;
}

/** The topmost (front-most) node whose world bounds contain `world`, or `null`. */
export function hitTest(scene: SceneGraph, world: Point, options: HitOptions = {}): NodeId | null {
  const skipLocked = options.skipLocked ?? true;
  for (const id of scene.hitOrder()) {
    if (!isPickable(scene, id, skipLocked)) continue;
    const bounds = scene.worldBounds(id);
    if (bounds && bounds.contains(world)) return id;
  }
  return null;
}

/** All pickable nodes whose world bounds intersect the marquee rectangle (SEL-002). */
export function marqueeHits(
  scene: SceneGraph,
  worldRect: Rectangle,
  options: HitOptions = {},
): NodeId[] {
  const skipLocked = options.skipLocked ?? true;
  const region = BoundingBox.fromRect(worldRect);
  const hits: NodeId[] = [];
  for (const id of scene.flatten()) {
    if (!isPickable(scene, id, skipLocked)) continue;
    const bounds = scene.worldBounds(id);
    if (bounds && region.intersects(bounds)) hits.push(id);
  }
  return hits;
}
