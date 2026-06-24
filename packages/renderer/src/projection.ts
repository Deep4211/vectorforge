import type { BoundingBox, Viewport } from '@vectorforge/geometry';
import type { NodeId, SceneGraph, SceneNode } from '@vectorforge/document';
import { visibleWorldBox } from './culling';
import type { RenderItem, RenderScene, ViewSize } from './types';

export interface ProjectionOptions {
  /** Cull margin in CSS px (see {@link visibleWorldBox}). */
  readonly cullMargin?: number;
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
): RenderItem | null {
  const base = { id: node.id, worldMatrix, opacity, worldBounds };
  switch (node.type) {
    case 'group':
      return null;
    case 'frame':
      return {
        ...base,
        kind: 'frame',
        size: node.size,
        backgroundColor: node.backgroundColor,
        clipsContent: node.clipsContent,
      };
    case 'rectangle':
      return {
        ...base,
        kind: 'rectangle',
        size: node.size,
        fill: node.fill,
        cornerRadius: node.cornerRadius,
      };
    case 'ellipse':
      return { ...base, kind: 'ellipse', size: node.size, fill: node.fill };
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
        size: node.size,
      };
    case 'image':
      return { ...base, kind: 'image', size: node.size, assetRef: node.assetRef, fit: node.fit };
  }
}

/**
 * Project the document into a renderer-facing display list for one viewport
 * (ARCHITECTURE.md §7.1). The result is flat, **painter-ordered** (back-to-front,
 * from {@link SceneGraph.flatten}), and **viewport-culled** (RND-6): effectively
 * invisible nodes and groups are dropped; off-screen nodes are skipped but the
 * document and selection are untouched (RND-1). A node with no finite bounds
 * (e.g. auto-sized text) is never culled.
 */
export function projectScene(
  scene: SceneGraph,
  viewport: Viewport,
  view: ViewSize,
  options: ProjectionOptions = {},
): RenderScene {
  const visible = visibleWorldBox(viewport, view, options.cullMargin);
  const items: RenderItem[] = [];
  let totalCount = 0;

  for (const id of scene.flatten() as NodeId[]) {
    if (!scene.isEffectivelyVisible(id)) continue;
    const node = scene.getOrThrow(id);
    if (node.type === 'group') continue;
    totalCount += 1;

    const worldBounds = scene.worldBounds(id);
    if (worldBounds && !visible.intersects(worldBounds)) continue; // culled (RND-6)

    const item = toRenderItem(
      node,
      effectiveOpacity(scene, node),
      scene.worldMatrix(id),
      worldBounds,
    );
    if (item) items.push(item);
  }

  return { items, totalCount };
}
