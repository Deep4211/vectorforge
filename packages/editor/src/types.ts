import type { Point, Vector2, Viewport } from '@vectorforge/geometry';
import type { NodeId } from '@vectorforge/document';
import type { HandlePosition } from './handles';

/**
 * Editor-core types (ARCHITECTURE.md §4; ENGINE_CONTRACT.md §4).
 *
 * State is partitioned into the **document** (the scene graph, mutated only by
 * commands) and **ephemeral** editor state (selection, viewport, active tool,
 * hover, interaction, draft). Ephemeral changes never mark the document dirty
 * (EDT-2). Input is delivered as framework-agnostic {@link EngineInput} — no DOM
 * types reach this layer (EDT-1).
 */

export type ToolId = 'move' | 'frame' | 'rectangle' | 'ellipse' | 'line' | 'text' | 'hand';

export interface Modifiers {
  readonly shift: boolean;
  readonly alt: boolean;
  readonly meta: boolean;
  readonly ctrl: boolean;
}

export const NO_MODIFIERS: Modifiers = { shift: false, alt: false, meta: false, ctrl: false };

export type PointerButton = 'primary' | 'secondary' | 'middle';
export type PointerKind = 'mouse' | 'pen' | 'touch';

/** A normalized pointer event. The UI layer converts raw DOM events into this. */
export interface EngineInput {
  /** Pointer position in world space (the UI applies screen→world). */
  readonly world: Vector2;
  /** Pointer position in screen/CSS pixels (used by the Hand tool for panning). */
  readonly screen: Vector2;
  readonly button: PointerButton;
  readonly modifiers: Modifiers;
  readonly pointerType: PointerKind;
}

/** A normalized keyboard event for shortcut handling (EDT-8). */
export interface KeyInput {
  readonly key: string;
  readonly modifiers: Modifiers;
  /** True when focus is in a text input/textarea; single-key shortcuts are suppressed. */
  readonly inTextInput: boolean;
  /** True mid-IME composition; ALL shortcuts (even Escape) are suppressed (EDT-8). */
  readonly isComposing?: boolean;
}

/** The selection: an ordered, de-duplicated id set plus the "primary" (last-added) node. */
export interface SelectionState {
  readonly ids: readonly NodeId[];
  readonly primaryId: NodeId | null;
}

export const EMPTY_SELECTION: SelectionState = { ids: [], primaryId: null };

/** What gesture, if any, is in progress. */
export type InteractionPhase = 'idle' | 'drawing' | 'dragging' | 'panning' | 'marquee' | 'resizing';

/** A world-space rectangle, used for drafts and resize previews. */
export interface RectLikeXYWH {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/**
 * Ephemeral preview produced during a gesture (rendered as an overlay; never
 * persisted). A `create`/`marquee` draft is a world-space rectangle; a `line`
 * draft is the two endpoints of a line being drawn.
 */
export type Draft =
  | {
      /** `create` = a box shape being drawn; `marquee` = a selection rectangle. */
      readonly type: 'create' | 'marquee';
      /** World-space rectangle [x, y, w, h]. */
      readonly rect: RectLikeXYWH;
    }
  | {
      readonly type: 'line';
      /** World-space endpoints of the line being drawn. */
      readonly a: Point;
      readonly b: Point;
    };

/** The observable editor state (ephemeral; the document is held separately as a `SceneGraph`). */
export interface EditorState {
  readonly tool: ToolId;
  readonly viewport: Viewport;
  readonly selection: SelectionState;
  readonly hover: NodeId | null;
  /** The handle under the pointer while idle (drives the resize cursor), else `null`. */
  readonly hoverHandle: HandlePosition | null;
  readonly interaction: InteractionPhase;
  readonly draft: Draft | null;
  /** Live drag offset (world) applied to the selection for preview before commit. */
  readonly dragOffset: Vector2 | null;
  /** The handle being dragged during a resize, else `null`. */
  readonly activeHandle: HandlePosition | null;
  /** Live world-rect preview of the primary node during a resize (before commit). */
  readonly resizePreview: RectLikeXYWH | null;
  /** The text node currently being edited inline (drives the text-editor overlay), else `null`. */
  readonly editingTextId: NodeId | null;
  /** Bumped whenever the document (scene graph) changes — lets selectors react. */
  readonly documentVersion: number;
  /** Unsaved document changes since the last save (set only by document mutations, EDT-2). */
  readonly dirty: boolean;
}

/** The render loop the editor asks to repaint. Canvas2D/WebGL implement it later; tests record calls. */
export interface RenderScheduler {
  requestRender(): void;
}
