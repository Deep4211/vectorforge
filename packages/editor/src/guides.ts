import { approxEqual, type Point } from '@vectorforge/geometry';
import type { NodeId, SceneGraph } from '@vectorforge/document';

/**
 * Smart alignment guides, V1 (ARCHITECTURE.md §9.4): when a single node sits
 * inside a frame, measure its gaps to the frame's edges and flag center
 * alignment. The result is pure geometry data (world space) — the UI/renderer
 * draws the magenta dashed lines + numeric labels. Live sibling snapping is V2.
 */
export type GuideOrientation = 'horizontal' | 'vertical';

export interface AlignmentGuide {
  /** `horizontal` = a constant-y line measuring an x-gap; `vertical` = constant-x. */
  readonly orientation: GuideOrientation;
  readonly from: Point;
  readonly to: Point;
  /** Gap distance in world units (the numeric label); 0 for a center match. */
  readonly distance: number;
  readonly kind: 'gap' | 'center';
}

/** Edge-gap + center guides for `nodeId` relative to its parent frame, or `[]`. */
export function alignmentGuides(scene: SceneGraph, nodeId: NodeId): AlignmentGuide[] {
  if (!scene.has(nodeId)) return [];
  const parentId = scene.parentOf(nodeId);
  if (parentId === null || scene.getOrThrow(parentId).type !== 'frame') return [];

  const node = scene.worldBounds(nodeId);
  const frame = scene.worldBounds(parentId);
  if (!node || !frame) return [];

  const nodeMidX = (node.minX + node.maxX) / 2;
  const nodeMidY = (node.minY + node.maxY) / 2;
  const frameMidX = (frame.minX + frame.maxX) / 2;
  const frameMidY = (frame.minY + frame.maxY) / 2;

  const guides: AlignmentGuide[] = [
    {
      orientation: 'horizontal',
      from: { x: frame.minX, y: nodeMidY },
      to: { x: node.minX, y: nodeMidY },
      distance: node.minX - frame.minX,
      kind: 'gap',
    },
    {
      orientation: 'horizontal',
      from: { x: node.maxX, y: nodeMidY },
      to: { x: frame.maxX, y: nodeMidY },
      distance: frame.maxX - node.maxX,
      kind: 'gap',
    },
    {
      orientation: 'vertical',
      from: { x: nodeMidX, y: frame.minY },
      to: { x: nodeMidX, y: node.minY },
      distance: node.minY - frame.minY,
      kind: 'gap',
    },
    {
      orientation: 'vertical',
      from: { x: nodeMidX, y: node.maxY },
      to: { x: nodeMidX, y: frame.maxY },
      distance: frame.maxY - node.maxY,
      kind: 'gap',
    },
  ];

  if (approxEqual(nodeMidX, frameMidX)) {
    guides.push({
      orientation: 'vertical',
      from: { x: frameMidX, y: frame.minY },
      to: { x: frameMidX, y: frame.maxY },
      distance: 0,
      kind: 'center',
    });
  }
  if (approxEqual(nodeMidY, frameMidY)) {
    guides.push({
      orientation: 'horizontal',
      from: { x: frame.minX, y: frameMidY },
      to: { x: frame.maxX, y: frameMidY },
      distance: 0,
      kind: 'center',
    });
  }

  return guides;
}
