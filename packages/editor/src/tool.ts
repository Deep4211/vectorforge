import type { Point, Rectangle, Vector2, Viewport } from '@vectorforge/geometry';
import type { NodeId } from '@vectorforge/document';
import type { HandlePosition } from './handles';
import type { Draft, EditorState, EngineInput, InteractionPhase, ToolId } from './types';

/** Modifier flags that shape a transform gesture (ARCHITECTURE.md §9.3). */
export interface TransformModifiers {
  /** Shift: aspect-lock on resize. */
  readonly aspect: boolean;
  /** Alt/Option: resize from the center. */
  readonly fromCenter: boolean;
}

/**
 * The slice of the controller a tool may use (ARCHITECTURE.md §4.5). Depending
 * on this interface — not the concrete `EditorController` — keeps the tool layer
 * decoupled (no import cycle) and makes the contract explicit: tools translate
 * pointer input into **intentions**; they never mutate the document directly
 * (EDT-7).
 */
export interface ToolHost {
  readonly state: Readonly<EditorState>;
  hitTest(world: Point): NodeId | null;
  select(id: NodeId): void;
  toggleSelect(id: NodeId): void;
  /** Select the node under `world`, cycling through overlapping nodes on repeat clicks (§8.1). */
  selectCycle(world: Point, additive: boolean): NodeId | null;
  clearSelection(): void;
  selectMarquee(rect: Rectangle, additive: boolean): void;
  moveSelectionBy(delta: Vector2): void;
  createShape(kind: 'rectangle' | 'ellipse' | 'frame', rect: Rectangle): NodeId;
  createText(world: Point): NodeId;
  /** Enter inline text editing on a node; returns false for non-text nodes. */
  beginTextEdit(id: NodeId): boolean;
  setGesture(phase: InteractionPhase, draft: Draft | null): void;
  setDragOffset(offset: Vector2): void;
  cancelGesture(): void;
  setViewport(viewport: Viewport): void;
  updateHover(world: Point, screen: Point): void;
  /** The handle under `screen` for the current selection, or `null`. */
  hitTestHandle(screen: Point): HandlePosition | null;
  /** Start a resize from `handle` at world point `world`; false if the primary node can't resize. */
  beginResize(handle: HandlePosition, world: Point): boolean;
  /** Update the live resize preview to the current world point. */
  updateResize(world: Point, modifiers: TransformModifiers): void;
  /** Commit the in-progress resize as one (move+resize) history entry. */
  commitResize(): void;
}

/** One active tool owns pointer interpretation; switching tools cancels any in-progress gesture. */
export interface Tool {
  readonly id: ToolId;
  onPointerDown(input: EngineInput, host: ToolHost): void;
  onPointerMove(input: EngineInput, host: ToolHost): void;
  onPointerUp(input: EngineInput, host: ToolHost): void;
  /** Abort an in-progress gesture cleanly (no document change), e.g. on tool switch or Escape. */
  onCancel(host: ToolHost): void;
  cursor(): string;
}
