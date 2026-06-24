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
      /** Line stroke (color + width), else `null` for non-line nodes. */
      readonly stroke: { readonly color: string; readonly width: number } | null;
      /** Text typography, else `null` for non-text nodes. */
      readonly text: TextStyle | null;
    }
  | { readonly mode: 'multi'; readonly count: number; readonly ids: readonly NodeId[] };

/** Editable typography of a text node (mirrors the document's TextNode fields). */
export interface TextStyle {
  readonly fontFamily: string;
  readonly fontWeight: number;
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly letterSpacing: number;
  readonly textAlign: string;
}

/** The inline text-editor overlay's target: a text node's content, world origin, and type face. */
export interface TextEditTarget {
  readonly id: NodeId;
  readonly content: string;
  readonly worldX: number;
  readonly worldY: number;
  readonly width: number | null;
  readonly fontFamily: string;
  readonly fontWeight: number;
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly letterSpacing: number;
  readonly textAlign: string;
  readonly fill: string;
}

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

function strokeOf(node: SceneNode): { readonly color: string; readonly width: number } | null {
  return node.type === 'line' ? { color: node.stroke, width: node.strokeWidth } : null;
}

function textOf(node: SceneNode): TextStyle | null {
  if (node.type !== 'text') return null;
  return {
    fontFamily: node.fontFamily,
    fontWeight: node.fontWeight,
    fontSize: node.fontSize,
    lineHeight: node.lineHeight,
    letterSpacing: node.letterSpacing,
    textAlign: node.textAlign,
  };
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
    stroke: strokeOf(node),
    text: textOf(node),
  };
}
