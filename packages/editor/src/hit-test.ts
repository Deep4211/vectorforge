import {
  BoundingBox,
  distancePointToSegment,
  type Point,
  type Rectangle,
} from '@vectorforge/geometry';
import type { NodeId, SceneGraph, SceneNode } from '@vectorforge/document';

/**
 * Hit-testing over the scene graph (ARCHITECTURE.md §8.4). Two phases,
 * front-to-back: a cheap world-AABB **broad phase** prunes candidates, then a
 * precise **narrow phase** tests the point in each node's *local* space (so
 * rotation/scale are handled exactly). Effectively-hidden and (unless opted out)
 * effectively-locked nodes are never hit (SEL-003 / EDT-6). Groups have no own
 * geometry — their leaves are the hit targets.
 */
export interface HitOptions {
  /** Skip effectively-locked nodes (default true). */
  readonly skipLocked?: boolean;
  /**
   * Extra pick slack, applied in the node's **local** space (e.g. to grab thin
   * lines); default 0. For a scaled node it scales with the node, like its own
   * `strokeWidth`. Converting screen px → a local value is the caller's job.
   */
  readonly tolerance?: number;
}

function isPickable(scene: SceneGraph, id: NodeId, skipLocked: boolean): boolean {
  if (!scene.isEffectivelyVisible(id)) return false;
  if (skipLocked && scene.isEffectivelyLocked(id)) return false;
  return true;
}

function rectContains(p: Point, w: number, h: number): boolean {
  return p.x >= 0 && p.x <= w && p.y >= 0 && p.y <= h;
}

/** Inside the rect minus the rounded corners (radius clamped to the shorter half-side). */
function roundedRectContains(p: Point, w: number, h: number, radius: number): boolean {
  if (!rectContains(p, w, h)) return false;
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  if (r === 0) return true;
  // Only the four corner squares need the circle test; the cross interior is inside.
  const cx = p.x < r ? r : p.x > w - r ? w - r : p.x;
  const cy = p.y < r ? r : p.y > h - r ? h - r : p.y;
  const dx = p.x - cx;
  const dy = p.y - cy;
  return dx * dx + dy * dy <= r * r;
}

function ellipseContains(p: Point, w: number, h: number): boolean {
  const rx = w / 2;
  const ry = h / 2;
  if (rx <= 0 || ry <= 0) return false;
  const nx = (p.x - rx) / rx;
  const ny = (p.y - ry) / ry;
  return nx * nx + ny * ny <= 1;
}

/** Precise containment test in the node's own local coordinate space. */
function narrowHit(node: SceneNode, local: Point, tolerance: number): boolean {
  switch (node.type) {
    case 'group':
      return false;
    case 'frame':
    case 'image':
      return rectContains(local, node.size.w, node.size.h);
    case 'rectangle':
      return roundedRectContains(local, node.size.w, node.size.h, node.cornerRadius);
    case 'ellipse':
      return ellipseContains(local, node.size.w, node.size.h);
    case 'text':
      return node.size ? rectContains(local, node.size.w, node.size.h) : false;
    case 'line':
      return (
        distancePointToSegment(local, node.a, node.b) <= Math.max(node.strokeWidth / 2, tolerance)
      );
  }
}

/** Test `world` against one node: broad-phase prune, then precise narrow phase. */
function hits(scene: SceneGraph, id: NodeId, world: Point, tolerance: number): boolean {
  const bounds = scene.worldBounds(id);
  if (!bounds) return false;
  const node = scene.getOrThrow(id);
  const inverse = scene.worldMatrix(id).tryInvert();
  if (!inverse) return false;
  const local = inverse.transformPoint(world);
  if (node.type === 'line') {
    // A line's world AABB is zero-thickness along its axis and its stroke band is
    // a LOCAL quantity, so prune in local space — a world-space slack would wrongly
    // drop valid hits on a scaled-up line.
    const pad = Math.max(node.strokeWidth / 2, tolerance);
    if (!BoundingBox.fromPoints([node.a, node.b]).inflate(pad).contains(local)) return false;
  } else if (!bounds.inflate(tolerance).contains(world)) {
    return false; // world-space broad phase for box-shaped nodes
  }
  return narrowHit(node, local, tolerance);
}

/** The topmost (front-most) node precisely under `world`, or `null`. */
export function hitTest(scene: SceneGraph, world: Point, options: HitOptions = {}): NodeId | null {
  const skipLocked = options.skipLocked ?? true;
  const tolerance = options.tolerance ?? 0;
  for (const id of scene.hitOrder()) {
    if (!isPickable(scene, id, skipLocked)) continue;
    if (hits(scene, id, world, tolerance)) return id;
  }
  return null;
}

/** All nodes precisely under `world`, front-to-back — enables overlapping-click cycling (§8.1). */
export function hitTestAll(scene: SceneGraph, world: Point, options: HitOptions = {}): NodeId[] {
  const skipLocked = options.skipLocked ?? true;
  const tolerance = options.tolerance ?? 0;
  const out: NodeId[] = [];
  for (const id of scene.hitOrder()) {
    if (!isPickable(scene, id, skipLocked)) continue;
    if (hits(scene, id, world, tolerance)) out.push(id);
  }
  return out;
}

/** All pickable nodes whose world bounds intersect the marquee rectangle (SEL-002). */
export function marqueeHits(
  scene: SceneGraph,
  worldRect: Rectangle,
  options: HitOptions = {},
): NodeId[] {
  const skipLocked = options.skipLocked ?? true;
  const region = BoundingBox.fromRect(worldRect);
  const out: NodeId[] = [];
  for (const id of scene.flatten()) {
    if (!isPickable(scene, id, skipLocked)) continue;
    if (scene.getOrThrow(id).type === 'group') continue; // groups select via their leaves
    const bounds = scene.worldBounds(id);
    if (bounds && region.intersects(bounds)) out.push(id);
  }
  return out;
}
