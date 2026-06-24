import type { Point, Rectangle, Vector2, Viewport } from '@vectorforge/geometry';
import type { NodeId } from '@vectorforge/document';
import type { Draft, EditorState, EngineInput, InteractionPhase, ToolId } from './types';

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
  clearSelection(): void;
  selectMarquee(rect: Rectangle, additive: boolean): void;
  moveSelectionBy(delta: Vector2): void;
  createShape(kind: 'rectangle' | 'ellipse' | 'frame', rect: Rectangle): NodeId;
  createText(world: Point): NodeId;
  setGesture(phase: InteractionPhase, draft: Draft | null): void;
  setDragOffset(offset: Vector2): void;
  cancelGesture(): void;
  setViewport(viewport: Viewport): void;
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
