import type { NodeId, NodeType, SceneGraph, SceneNode } from '@vectorforge/document';
import type { SelectionState } from './types';

/**
 * Presentation view models (ARCHITECTURE.md §4.2; UI-2/UI-3). The editor projects
 * the document into framework-free, plain-data shapes the React chrome renders —
 * so components never import @vectorforge/document or contain business logic.
 */

/** A node in the layer-outline tree (front-to-back follows `childIds` order). */
export interface LayerItem {
  readonly id: NodeId;
  readonly name: string;
  readonly type: NodeType;
  readonly visible: boolean;
  readonly locked: boolean;
  readonly children: readonly LayerItem[];
}

/** The right-inspector model for the current selection. */
export type Inspection =
  | { readonly mode: 'empty' }
  | {
      readonly mode: 'single';
      readonly id: NodeId;
      readonly name: string;
      readonly type: NodeType;
      readonly x: number;
      readonly y: number;
      readonly width: number | null;
      readonly height: number | null;
      readonly rotation: number;
      readonly opacity: number;
      readonly visible: boolean;
      readonly locked: boolean;
      readonly fill: string | null;
    }
  | { readonly mode: 'multi'; readonly count: number; readonly ids: readonly NodeId[] };

function sizeOf(node: SceneNode): { readonly w: number; readonly h: number } | null {
  const size = (node as { size?: { readonly w: number; readonly h: number } | null }).size;
  return size ?? null;
}

function fillOf(node: SceneNode): string | null {
  if (node.type === 'frame') return node.backgroundColor;
  if (node.type === 'rectangle' || node.type === 'ellipse' || node.type === 'text')
    return node.fill;
  return null;
}

/** Build the nested layer-outline view model from the scene's roots. */
export function buildOutline(scene: SceneGraph): LayerItem[] {
  const toItem = (id: NodeId): LayerItem => {
    const node = scene.getOrThrow(id);
    return {
      id,
      name: node.name,
      type: node.type,
      visible: node.visibility,
      locked: node.locked,
      children: scene.childrenOf(id).map(toItem),
    };
  };
  return scene.roots().map(toItem);
}

/** Project the current selection into the inspector view model (empty / single / multi). */
export function inspect(scene: SceneGraph, selection: SelectionState): Inspection {
  if (selection.ids.length === 0) return { mode: 'empty' };
  if (selection.ids.length > 1) {
    return { mode: 'multi', count: selection.ids.length, ids: selection.ids };
  }
  const id = selection.primaryId ?? selection.ids[0]!;
  const node = scene.getOrThrow(id);
  const size = sizeOf(node);
  return {
    mode: 'single',
    id,
    name: node.name,
    type: node.type,
    x: node.transform.position.x,
    y: node.transform.position.y,
    width: size ? size.w : null,
    height: size ? size.h : null,
    rotation: node.transform.rotation,
    opacity: node.opacity,
    visible: node.visibility,
    locked: node.locked,
    fill: fillOf(node),
  };
}
