import type { Point, Transform } from '@vectorforge/geometry';

/**
 * Document model types (ARCHITECTURE.md §5, §9; ENGINE_CONTRACT.md §1).
 *
 * The node "hierarchy" of §5.2 is realized as a **discriminated union** over a
 * shared {@link BaseNode} — the same type relationships as the class sketch, but
 * idiomatic immutable data that serializes deterministically (DOC-9) and matches
 * §5.7's flat-`Map` storage. Behaviour lives in factories (`nodes.ts`), the
 * `SceneGraph`, and serialization — not on the data.
 */

/** Stable, unique node identity. Survives moves/renames (DOC-3). */
export type NodeId = string;

/** Concrete node kinds shipped in Sprint 2 (ComponentInstance arrives in V2). */
export type NodeType = 'frame' | 'group' | 'rectangle' | 'ellipse' | 'line' | 'text' | 'image';

/** Hex color string, e.g. `#7C5CFF`. (A richer fill/paint model is a later sprint.) */
export type Color = string;

export interface Size {
  readonly w: number;
  readonly h: number;
}

export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type ImageFit = 'fill' | 'contain' | 'cover';

/**
 * Fields common to every node (DOC-4 / PRD §9.2).
 *
 * Coordinates are **local** to the parent (DOC-5); world position resolves
 * through ancestor transforms in the `SceneGraph`. Z-order within a parent is
 * encoded by sibling order in {@link childIds} (ARCHITECTURE.md §5.8), so there
 * is no separate `zIndex` field to fall out of sync.
 */
export interface BaseNode {
  readonly id: NodeId;
  readonly type: NodeType;
  /** Human-readable; never empty (DOC-8). */
  readonly name: string;
  /** Local translate/rotate/scale. */
  readonly transform: Transform;
  /** Own visibility flag; effective visibility also depends on ancestors. */
  readonly visibility: boolean;
  /** Own lock flag; effective lock also depends on ancestors. */
  readonly locked: boolean;
  /** 0–1. */
  readonly opacity: number;
  /** Namespaced extension bag (alt text, export settings, …) (PRD §9.2). */
  readonly metadata: Readonly<Record<string, unknown>>;
  /** Parent node id, or `null` for a root. */
  readonly parentId: NodeId | null;
  /** Ordered child ids (front-to-back = last-to-first); the z-order source of truth. */
  readonly childIds: readonly NodeId[];
}

/** An artboard/container with its own size, clipping, and background (PRD §9.2). */
export interface FrameNode extends BaseNode {
  readonly type: 'frame';
  readonly size: Size;
  readonly clipsContent: boolean;
  readonly backgroundColor: Color;
}

/** A logical/transform container that moves its children together. */
export interface GroupNode extends BaseNode {
  readonly type: 'group';
}

export interface RectangleNode extends BaseNode {
  readonly type: 'rectangle';
  readonly size: Size;
  readonly fill: Color;
  readonly cornerRadius: number;
}

export interface EllipseNode extends BaseNode {
  readonly type: 'ellipse';
  readonly size: Size;
  readonly fill: Color;
}

/** A straight segment between two local points. */
export interface LineNode extends BaseNode {
  readonly type: 'line';
  readonly a: Point;
  readonly b: Point;
  readonly stroke: Color;
  readonly strokeWidth: number;
}

export interface TextNode extends BaseNode {
  readonly type: 'text';
  readonly content: string;
  readonly fontFamily: string;
  readonly fontWeight: number;
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly letterSpacing: number;
  readonly textAlign: TextAlign;
  readonly fill: Color;
  /** Optional fixed box; when absent, layout is renderer-measured (Sprint 5). */
  readonly size: Size | null;
}

export interface ImageNode extends BaseNode {
  readonly type: 'image';
  readonly size: Size;
  /** Reference into the asset store (resolved by persistence, Sprint 8). */
  readonly assetRef: string;
  readonly fit: ImageFit;
  readonly altText: string;
}

/** The closed set of concrete nodes. */
export type SceneNode =
  | FrameNode
  | GroupNode
  | RectangleNode
  | EllipseNode
  | LineNode
  | TextNode
  | ImageNode;

// ---------------------------------------------------------------------------
// Serialized (`.vf`-bound) wire shapes — plain JSON, no class instances.
// ---------------------------------------------------------------------------

/** Current document-model schema version (the full `.vf` envelope is Sprint 8). */
export const SCHEMA_VERSION = '1.0';

export interface SerializedTransform {
  readonly position: { readonly x: number; readonly y: number };
  readonly rotation: number;
  readonly scale: { readonly x: number; readonly y: number };
}

/** A node with its `Transform` value object lowered to plain data. Distributes over the union. */
export type SerializedNode = SceneNode extends infer N
  ? N extends SceneNode
    ? Omit<N, 'transform'> & { readonly transform: SerializedTransform }
    : never
  : never;

export interface SerializedDocument {
  readonly version: string;
  /** Top-level node ids in z-order (back-to-front). Z-order within a parent is the node's `childIds`. */
  readonly rootIds: readonly NodeId[];
  /** Nodes in a stable (id-sorted) order for deterministic, diff-friendly output. */
  readonly nodes: readonly SerializedNode[];
}

/** A lightweight tree projection (used by render walking and the layer outline). */
export interface TreeNode {
  readonly id: NodeId;
  readonly type: NodeType;
  readonly children: readonly TreeNode[];
}
