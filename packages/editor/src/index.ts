/**
 * `@vectorforge/editor` — public API entry.
 *
 * The editor core (application layer): the framework-independent
 * `EditorController` + `EditorStore`, the tool state machine, selection,
 * viewport, and hit-testing (ARCHITECTURE.md §4; ENGINE_CONTRACT.md §4). It turns
 * user intentions into commands against the document and projects state back for
 * the UI to render — but imports no React or DOM (EDT-1).
 *
 * Import only through this entry (ENGINE_CONTRACT.md §6 DEP-5).
 */

export { EditorController, type EditorControllerOptions } from './controller';
export { EditorStore } from './store';
export { hitTest, hitTestAll, marqueeHits, type HitOptions } from './hit-test';
export {
  selectionWorldBounds,
  handleScreenPoints,
  hitTestHandle,
  resizeRect,
  HANDLE_POSITIONS,
  HANDLE_HIT_RADIUS,
  type HandlePosition,
  type ResizeOptions,
} from './handles';
export { alignmentGuides, type AlignmentGuide, type GuideOrientation } from './guides';
export { resolveCursor, type CursorContext } from './cursor';
export { type Tool, type ToolHost, type TransformModifiers } from './tool';
export { createDefaultTools, DRAG_THRESHOLD_PX } from './tools';
export {
  type ToolId,
  type Modifiers,
  type PointerButton,
  type PointerKind,
  type EngineInput,
  type KeyInput,
  type SelectionState,
  type InteractionPhase,
  type Draft,
  type RectLikeXYWH,
  type EditorState,
  type RenderScheduler,
  NO_MODIFIERS,
  EMPTY_SELECTION,
} from './types';

/** Package identity (stable across the project; consumed by the app shell). */
export const PACKAGE_ID = '@vectorforge/editor' as const;

/** Architectural layer (see docs/ENGINE_CONTRACT.md §6). */
export const LAYER = 'application' as const;
