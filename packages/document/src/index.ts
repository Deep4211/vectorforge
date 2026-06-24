/**
 * `@vectorforge/document` — public API entry.
 *
 * The authoritative document model and scene graph (ARCHITECTURE.md §5, §9;
 * ENGINE_CONTRACT.md §1). Immutable node values held in a mutable `SceneGraph`
 * container; deterministic serialization. Depends only on `@vectorforge/geometry`
 * and `@vectorforge/shared` — no commands, renderer, React, or DOM.
 *
 * Import only through this entry (ENGINE_CONTRACT.md §6 DEP-5).
 */

// Types
export type {
  NodeId,
  NodeType,
  Color,
  Size,
  TextAlign,
  ImageFit,
  BaseNode,
  FrameNode,
  GroupNode,
  RectangleNode,
  EllipseNode,
  LineNode,
  TextNode,
  ImageNode,
  SceneNode,
  SerializedTransform,
  SerializedNode,
  SerializedDocument,
  TreeNode,
} from './types';
export { SCHEMA_VERSION } from './types';

// Id generation
export { type IdGenerator, createSequentialIdGenerator } from './id';

// Node factories + immutable updates
export {
  type FrameInput,
  type GroupInput,
  type RectangleInput,
  type EllipseInput,
  type LineInput,
  type TextInput,
  type ImageInput,
  createFrame,
  createGroup,
  createRectangle,
  createEllipse,
  createLine,
  createText,
  createImage,
  withName,
  withTransform,
  withVisibility,
  withLocked,
  withOpacity,
  withMetadata,
} from './nodes';

// Scene graph
export { SceneGraph, type RemovedSubtree } from './scene-graph';

// Serialization (deterministic, validated)
export {
  serializeNode,
  deserializeNode,
  serializeDocument,
  parseDocument,
  stableStringify,
} from './serialization';

/** Package identity (stable across the project; consumed by the app shell). */
export const PACKAGE_ID = '@vectorforge/document' as const;

/** Architectural layer (see docs/ENGINE_CONTRACT.md §6). */
export const LAYER = 'domain' as const;
