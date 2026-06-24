import { BoundingBox, Matrix3, type Viewport } from '@vectorforge/geometry';
import type { NodeId, SceneGraph, SceneNode } from '@vectorforge/document';
import { visibleWorldBox } from './culling';
import type { RenderItem, RenderScene, ViewSize } from './types';

type Size = { readonly w: number; readonly h: number };

/** Live move preview: shift these nodes (and their descendants) by `(dx, dy)` in world space. */
export interface MovePreview {
  readonly ids: ReadonlySet<NodeId>;
  readonly dx: number;
  readonly dy: number;
}

/** Live resize preview: give `id` this parent-local position + size. */
export interface ResizePreview {
  readonly id: NodeId;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface ProjectionOptions {
  /** Cull margin in CSS px (see {@link visibleWorldBox}). */
  readonly cullMargin?: number;
  /** Ephemeral move preview applied at projection time (never mutates the document, RND-1). */
  readonly move?: MovePreview | undefined;
  /** Ephemeral resize preview applied at projection time. */
  readonly resize?: ResizePreview | undefined;
}

/** Multiply a node's own opacity by every ancestor's — the effective alpha (RND-1 read-only). */
function effectiveOpacity(scene: SceneGraph, node: SceneNode): number {
  let opacity = node.opacity;
  for (const ancestorId of scene.ancestors(node.id)) {
    opacity *= scene.getOrThrow(ancestorId).opacity;
  }
  return opacity;
}

/** Lower a single document node to a drawable, or `null` for non-painting containers (groups). */
function toRenderItem(
  node: SceneNode,
  opacity: number,
  worldMatrix: RenderItem['worldMatrix'],
  worldBounds: BoundingBox | null,
  sizeOverride: Size | null,
): RenderItem | null {
  const base = { id: node.id, worldMatrix, opacity, worldBounds };
  switch (node.type) {
    case 'group':
      return null;
    case 'frame':
      return {
        ...base,
        kind: 'frame',
        size: sizeOverride ?? node.size,
        backgroundColor: node.backgroundColor,
        clipsContent: node.clipsContent,
      };
    case 'rectangle':
      return {
        ...base,
        kind: 'rectangle',
        size: sizeOverride ?? node.size,
        fill: node.fill,
        cornerRadius: node.cornerRadius,
      };
    case 'ellipse':
      return { ...base, kind: 'ellipse', size: sizeOverride ?? node.size, fill: node.fill };
    case 'line':
      return {
        ...base,
        kind: 'line',
        a: node.a,
        b: node.b,
        stroke: node.stroke,
        strokeWidth: node.strokeWidth,
      };
    case 'text':
      return {
        ...base,
        kind: 'text',
        content: node.content,
        fontFamily: node.fontFamily,
        fontWeight: node.fontWeight,
        fontSize: node.fontSize,
        lineHeight: node.lineHeight,
        letterSpacing: node.letterSpacing,
        textAlign: node.textAlign,
        fill: node.fill,
        size: sizeOverride ?? node.size,
      };
    case 'image':
      return {
        ...base,
        kind: 'image',
        size: sizeOverride ?? node.size,
        assetRef: node.assetRef,
        fit: node.fit,
      };
  }
}

function isMoved(scene: SceneGraph, id: NodeId, move: MovePreview): boolean {
  if (move.ids.has(id)) return true;
  return scene.ancestors(id).some((a) => move.ids.has(a));
}

function shiftBounds(box: BoundingBox | null, dx: number, dy: number): BoundingBox | null {
  return box ? new BoundingBox(box.minX + dx, box.minY + dy, box.maxX + dx, box.maxY + dy) : null;
}

/**
 * Project the document into a renderer-facing display list for one viewport
 * (ARCHITECTURE.md §7.1): flat, painter-ordered, viewport-culled (RND-6).
 * Optional live move/resize previews are applied at projection time so a drag
 * shows on the canvas without mutating the document (RND-1) — the committing
 * command lands only on pointer-up.
 */
export function projectScene(
  scene: SceneGraph,
  viewport: Viewport,
  view: ViewSize,
  options: ProjectionOptions = {},
): RenderScene {
  const visible = visibleWorldBox(viewport, view, options.cullMargin);
  const { move, resize } = options;
  const items: RenderItem[] = [];
  let totalCount = 0;

  for (const id of scene.flatten() as NodeId[]) {
    if (!scene.isEffectivelyVisible(id)) continue;
    const node = scene.getOrThrow(id);
    if (node.type === 'group') continue;
    totalCount += 1;

    let worldMatrix = scene.worldMatrix(id);
    let worldBounds = scene.worldBounds(id);
    let sizeOverride: Size | null = null;

    if (move && isMoved(scene, id, move)) {
      worldMatrix = Matrix3.translation(move.dx, move.dy).multiply(worldMatrix);
      worldBounds = shiftBounds(worldBounds, move.dx, move.dy);
    } else if (resize && resize.id === id) {
      const parentWorld =
        node.parentId === null ? Matrix3.IDENTITY : scene.worldMatrix(node.parentId);
      worldMatrix = parentWorld.multiply(
        node.transform.withPosition({ x: resize.x, y: resize.y }).toMatrix(),
      );
      sizeOverride = { w: resize.w, h: resize.h };
      worldBounds = BoundingBox.fromPoints([
        worldMatrix.transformPoint({ x: 0, y: 0 }),
        worldMatrix.transformPoint({ x: resize.w, y: 0 }),
        worldMatrix.transformPoint({ x: resize.w, y: resize.h }),
        worldMatrix.transformPoint({ x: 0, y: resize.h }),
      ]);
    }

    if (worldBounds && !visible.intersects(worldBounds)) continue; // culled (RND-6)

    const item = toRenderItem(
      node,
      effectiveOpacity(scene, node),
      worldMatrix,
      worldBounds,
      sizeOverride,
    );
    if (item) items.push(item);
  }

  return { items, totalCount };
}
