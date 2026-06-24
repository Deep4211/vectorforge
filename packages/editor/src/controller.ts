import {
  type BoundingBox,
  type Matrix3,
  Transform,
  Vector2,
  zoomViewportAt,
  type Point,
  type Rectangle,
  type Viewport,
} from '@vectorforge/geometry';
import {
  createEllipse,
  createFrame,
  createGroup,
  createRectangle,
  createSequentialIdGenerator,
  createText,
  SceneGraph,
  type IdGenerator,
  type NodeId,
} from '@vectorforge/document';
import {
  CompositeCommand,
  CreateNodeCommand,
  createGroupCommand,
  DeleteNodeCommand,
  HistoryManager,
  type ICommand,
  MoveNodeCommand,
  ReorderCommand,
  ResizeNodeCommand,
  SetPropertyCommand,
  UngroupCommand,
} from '@vectorforge/commands';
import { EditorStore } from './store';
import { hitTest, hitTestAll, marqueeHits } from './hit-test';
import {
  hitTestHandle as findHandle,
  resizeRect,
  selectionWorldBounds,
  type HandlePosition,
} from './handles';
import { alignmentGuides, type AlignmentGuide } from './guides';
import { resolveCursor } from './cursor';
import { createDefaultTools } from './tools';
import type { Tool, ToolHost, TransformModifiers } from './tool';
import {
  EMPTY_SELECTION,
  type Draft,
  type EditorState,
  type EngineInput,
  type InteractionPhase,
  type KeyInput,
  type RectLikeXYWH,
  type RenderScheduler,
  type SelectionState,
  type ToolId,
} from './types';

export interface EditorControllerOptions {
  scene?: SceneGraph;
  idGenerator?: IdGenerator;
  scheduler?: RenderScheduler;
  historyLimit?: number;
  viewport?: Viewport;
}

interface SelectionTransition {
  readonly before: SelectionState;
  readonly after: SelectionState;
}

const NOOP_SCHEDULER: RenderScheduler = { requestRender() {} };

const SHORTCUT_TOOLS: Readonly<Record<string, ToolId>> = {
  v: 'move',
  f: 'frame',
  r: 'rectangle',
  o: 'ellipse',
  t: 'text',
  h: 'hand',
};

/** Arrow-key nudge directions (unit step; ×10 with Shift). */
const NUDGE: Readonly<Record<string, { x: number; y: number }>> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

function arraysEqual<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** Build a lock-aware, de-duplicated selection from candidate ids (primary = last kept). */
function makeSelection(scene: SceneGraph, ids: readonly NodeId[]): SelectionState {
  const kept: NodeId[] = [];
  for (const id of ids) {
    if (kept.includes(id)) continue;
    if (!scene.has(id) || scene.isEffectivelyLocked(id)) continue;
    kept.push(id);
  }
  return { ids: kept, primaryId: kept.length > 0 ? kept[kept.length - 1]! : null };
}

/** Drop ids whose ancestor is also in the set, so an operation never double-applies to a subtree. */
function topLevel(scene: SceneGraph, ids: readonly NodeId[]): NodeId[] {
  const set = new Set(ids);
  return ids.filter((id) => !scene.ancestors(id).some((a) => set.has(a)));
}

/**
 * The editor core (ARCHITECTURE.md §4.1). Turns user intentions into commands
 * against the document and projects state through the {@link EditorStore}. It
 * never mutates the document directly (EDT-4) — only commands do (EDT-2/DOC-2).
 * It also owns selection (EDT-6) and restores it across undo/redo. Framework- and
 * DOM-free (EDT-1); implements {@link ToolHost} so tools route through it.
 */
export class EditorController implements ToolHost {
  readonly store: EditorStore;
  private readonly history: HistoryManager;
  private readonly ids: IdGenerator;
  private readonly scheduler: RenderScheduler;
  private readonly limit: number;
  private readonly tools: Map<ToolId, Tool>;
  private undoSelections: SelectionTransition[] = [];
  private redoSelections: SelectionTransition[] = [];
  // Overlapping-click cycling memory (§8.1).
  private lastHitStack: NodeId[] = [];
  private lastHitChosen: NodeId | null = null;
  // In-progress resize gesture state. The resize runs in the primary node's OWN
  // local frame so rotation/scale are handled exactly; the box origin is mapped
  // back to a parent-space position for the MoveNodeCommand.
  private resizeHandle: HandlePosition | null = null;
  /** {x,y} = node parent-space position; {w,h} = local size — kept for the commit diff. */
  private resizeStartRect: RectLikeXYWH | null = null;
  /** Pointer at gesture start, in the node's local space. */
  private resizeStartLocal: Vector2 | null = null;
  /** Inverse of the node's full world matrix (world → node-local). */
  private resizeInverseWorld: Matrix3 | null = null;
  /** The node's transform (local → parent), to map the resized box origin to a position. */
  private resizeStartMatrix: Matrix3 | null = null;

  constructor(options: EditorControllerOptions = {}) {
    const scene = options.scene ?? SceneGraph.empty();
    this.ids = options.idGenerator ?? createSequentialIdGenerator();
    this.scheduler = options.scheduler ?? NOOP_SCHEDULER;
    this.limit = options.historyLimit ?? 200;
    this.store = new EditorStore(scene, options.viewport);
    this.history = new HistoryManager({ scene }, { limit: this.limit });
    this.tools = createDefaultTools();
  }

  get scene(): SceneGraph {
    return this.store.getScene();
  }

  get state(): Readonly<EditorState> {
    return this.store.getState();
  }

  // ---- command plumbing ---------------------------------------------------

  private afterDocumentChange(): void {
    // A committed mutation (incl. undo/redo) can change what sits under a screen
    // point or which node is on top, so the overlapping-click cycle restarts.
    this.resetCycle();
    // Re-derive the live selection through the lock-aware filter: a command may
    // have removed a selected node or locked one (EDT-6 — locked nodes are never
    // part of the selection, even when locked while already selected).
    const selection = makeSelection(this.scene, this.state.selection.ids);
    this.store.set({ documentVersion: this.scene.version, dirty: true, selection });
    this.scheduler.requestRender();
  }

  private resetCycle(): void {
    this.lastHitStack = [];
    this.lastHitChosen = null;
  }

  /** Execute an undoable document command and record the selection transition for undo/redo. */
  private commit(command: ICommand, selectIds?: readonly NodeId[]): void {
    const before = this.state.selection;
    this.history.execute(command);
    if (selectIds !== undefined)
      this.store.set({ selection: makeSelection(this.scene, selectIds) });
    this.afterDocumentChange();
    const after = this.state.selection;
    this.undoSelections.push({ before, after });
    if (this.undoSelections.length > this.limit) this.undoSelections.shift();
    this.redoSelections = [];
  }

  undo(): boolean {
    if (!this.history.undo()) return false;
    const transition = this.undoSelections.pop();
    if (transition) {
      this.redoSelections.push(transition);
      this.store.set({ selection: makeSelection(this.scene, transition.before.ids) });
    }
    this.afterDocumentChange();
    return true;
  }

  redo(): boolean {
    if (!this.history.redo()) return false;
    const transition = this.redoSelections.pop();
    if (transition) {
      this.undoSelections.push(transition);
      this.store.set({ selection: makeSelection(this.scene, transition.after.ids) });
    }
    this.afterDocumentChange();
    return true;
  }

  // ---- document intentions ------------------------------------------------

  /** Top-level, currently-unlocked selection ids — the safe targets for a bulk operation. */
  private operableSelection(): NodeId[] {
    return topLevel(this.scene, this.state.selection.ids).filter(
      (id) => !this.scene.isEffectivelyLocked(id),
    );
  }

  createShape(kind: 'rectangle' | 'ellipse' | 'frame', rect: Rectangle): NodeId {
    const id = this.ids.next();
    const transform = new Transform(new Vector2(rect.x, rect.y), 0, Vector2.ONE);
    const size = { w: rect.w, h: rect.h };
    const node =
      kind === 'rectangle'
        ? createRectangle({ id, size, transform })
        : kind === 'ellipse'
          ? createEllipse({ id, size, transform })
          : createFrame({ id, size, transform });
    this.commit(new CreateNodeCommand(node), [id]);
    return id;
  }

  createText(world: Point, content = ''): NodeId {
    const id = this.ids.next();
    const node = createText({
      id,
      content,
      transform: new Transform(new Vector2(world.x, world.y), 0, Vector2.ONE),
    });
    this.commit(new CreateNodeCommand(node), [id]);
    return id;
  }

  deleteSelection(): void {
    const ids = this.operableSelection();
    if (ids.length === 0) return;
    const command =
      ids.length === 1
        ? new DeleteNodeCommand(ids[0]!)
        : new CompositeCommand(
            ids.map((id) => new DeleteNodeCommand(id)),
            'delete',
          );
    this.commit(command, []);
  }

  moveSelectionBy(delta: Vector2): void {
    const ids = this.operableSelection();
    if (ids.length === 0) return;
    const moves = ids.map(
      (id) => new MoveNodeCommand(id, this.scene.getOrThrow(id).transform.position.add(delta)),
    );
    this.commit(moves.length === 1 ? moves[0]! : new CompositeCommand(moves, 'move'));
  }

  setProperty(id: NodeId, path: string, value: unknown): void {
    this.commit(new SetPropertyCommand(id, path, value));
  }

  group(): NodeId | null {
    const ids = this.operableSelection();
    if (ids.length === 0) return null;
    const groupId = this.ids.next();
    this.commit(createGroupCommand(createGroup({ id: groupId }), ids), [groupId]);
    return groupId;
  }

  ungroup(id?: NodeId): void {
    const target = id ?? this.state.selection.primaryId;
    if (target === null || !this.scene.has(target)) return;
    const childIds = [...this.scene.childrenOf(target)];
    this.commit(new UngroupCommand(target), childIds);
  }

  bringToFront(id?: NodeId): void {
    this.reorderTo(id, (count) => count - 1);
  }
  sendToBack(id?: NodeId): void {
    this.reorderTo(id, () => 0);
  }
  bringForward(id?: NodeId): void {
    this.reorderTo(id, (_count, index) => index + 1);
  }
  sendBackward(id?: NodeId): void {
    this.reorderTo(id, (_count, index) => index - 1);
  }

  private reorderTo(
    id: NodeId | undefined,
    target: (count: number, index: number) => number,
  ): void {
    const node = id ?? this.state.selection.primaryId;
    if (node === null || !this.scene.has(node)) return;
    const parentId = this.scene.parentOf(node);
    const siblings = parentId === null ? this.scene.roots() : this.scene.childrenOf(parentId);
    const index = siblings.indexOf(node);
    this.commit(new ReorderCommand(node, target(siblings.length, index)));
  }

  // ---- selection intentions (ephemeral) -----------------------------------

  select(id: NodeId): void {
    this.applySelection(makeSelection(this.scene, [id]));
  }

  toggleSelect(id: NodeId): void {
    const current = this.state.selection.ids;
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    this.applySelection(makeSelection(this.scene, next));
  }

  selectMany(ids: readonly NodeId[]): void {
    this.applySelection(makeSelection(this.scene, ids));
  }

  selectMarquee(rect: Rectangle, additive = false): void {
    const hits = marqueeHits(this.scene, rect);
    const ids = additive ? [...this.state.selection.ids, ...hits] : hits;
    this.applySelection(makeSelection(this.scene, ids));
  }

  /**
   * Select the topmost node under `world`; clicking the same overlapping stack
   * again cycles to the next node down (ARCHITECTURE.md §8.1). `additive` (Shift)
   * toggles the topmost into the current selection instead.
   */
  selectCycle(world: Point, additive: boolean): NodeId | null {
    const candidates = hitTestAll(this.scene, world);
    if (candidates.length === 0) {
      if (!additive) this.clearSelection();
      return null;
    }
    const top = candidates[0]!;
    if (additive) {
      this.toggleSelect(top);
      this.lastHitStack = candidates;
      // Record the actual primary (a toggle may have *deselected* the top).
      this.lastHitChosen = this.state.selection.primaryId;
      return this.state.selection.primaryId;
    }
    let chosen = top;
    if (
      arraysEqual(candidates, this.lastHitStack) &&
      this.lastHitChosen !== null &&
      candidates.includes(this.lastHitChosen)
    ) {
      const idx = candidates.indexOf(this.lastHitChosen);
      chosen = candidates[(idx + 1) % candidates.length]!;
    }
    this.select(chosen);
    this.lastHitStack = candidates;
    this.lastHitChosen = chosen;
    return chosen;
  }

  clearSelection(): void {
    this.applySelection(EMPTY_SELECTION);
  }

  private applySelection(selection: SelectionState): void {
    // Any non-cycle selection change resets the overlapping-click cycle memory.
    this.resetCycle();
    this.store.set({ selection });
    this.scheduler.requestRender();
  }

  // ---- viewport intentions (ephemeral) ------------------------------------

  setViewport(viewport: Viewport): void {
    this.store.set({ viewport });
    this.scheduler.requestRender();
  }

  panBy(deltaScreen: Vector2): void {
    const vp = this.state.viewport;
    this.setViewport({
      panX: vp.panX + deltaScreen.x,
      panY: vp.panY + deltaScreen.y,
      zoom: vp.zoom,
    });
  }

  zoomAt(screenPoint: Point, newZoom: number): void {
    this.setViewport(zoomViewportAt(this.state.viewport, screenPoint, newZoom));
  }

  // ---- tools & input ------------------------------------------------------

  setTool(tool: ToolId): void {
    this.activeTool().onCancel(this);
    this.store.set({ tool });
    this.scheduler.requestRender();
  }

  handlePointerDown(input: EngineInput): void {
    // Only the primary button drives tool gestures; secondary/middle are reserved
    // (e.g. context menu) and must never start a draw/move/marquee or commit a command.
    if (input.button !== 'primary') return;
    this.activeTool().onPointerDown(input, this);
  }
  handlePointerMove(input: EngineInput): void {
    this.activeTool().onPointerMove(input, this);
  }
  handlePointerUp(input: EngineInput): void {
    this.activeTool().onPointerUp(input, this);
  }

  /** A `pointercancel` (touch interrupted, gesture stolen by the OS): abort cleanly (§8.3). */
  handlePointerCancel(): void {
    this.activeTool().onCancel(this);
  }

  /** Keyboard shortcuts; suppressed in a text input (except Escape) and entirely mid-IME (EDT-8). */
  handleKeyboard(input: KeyInput): void {
    if (input.isComposing) return; // never act on keys that are composing an IME character
    if (input.key === 'Escape') {
      // Route through the active tool so its internal gesture state resets too
      // (not just the store) — otherwise a later pointer move resurrects the
      // cancelled draft/offset (EDT-7). onCancel() delegates to cancelGesture().
      this.activeTool().onCancel(this);
      this.clearSelection();
      return;
    }
    if (input.inTextInput) return;
    if (input.modifiers.meta || input.modifiers.ctrl) {
      if (input.key.toLowerCase() === 'z') {
        if (input.modifiers.shift) this.redo();
        else this.undo();
      }
      return;
    }
    const tool = SHORTCUT_TOOLS[input.key.toLowerCase()];
    if (tool) {
      this.setTool(tool);
      return;
    }
    if (input.key === 'Delete' || input.key === 'Backspace') {
      this.deleteSelection();
      return;
    }
    const nudge = NUDGE[input.key];
    if (nudge) {
      const step = input.modifiers.shift ? 10 : 1;
      this.moveSelectionBy(new Vector2(nudge.x * step, nudge.y * step));
    }
  }

  hitTest(world: Point): NodeId | null {
    return hitTest(this.scene, world);
  }

  // ---- hover, handles, resize (interaction, ARCHITECTURE.md §8–§9) ---------

  /** Update the hovered node and hovered resize handle (drives the cursor + overlay). */
  updateHover(world: Point, screen: Point): void {
    const hover = hitTest(this.scene, world);
    const bounds = selectionWorldBounds(this.scene, this.state.selection.ids);
    const hoverHandle = bounds ? findHandle(bounds, this.state.viewport, screen) : null;
    this.store.set({ hover, hoverHandle });
    this.scheduler.requestRender();
  }

  /** The handle under `screen` for the current selection, or `null`. */
  hitTestHandle(screen: Point): HandlePosition | null {
    const bounds = selectionWorldBounds(this.scene, this.state.selection.ids);
    return bounds ? findHandle(bounds, this.state.viewport, screen) : null;
  }

  /** The selection's combined world AABB (for the transform overlay), or `null`. */
  selectionBounds(): BoundingBox | null {
    return selectionWorldBounds(this.scene, this.state.selection.ids);
  }

  /** Alignment guides for a single selected node relative to its parent frame (§9.4). */
  guides(): AlignmentGuide[] {
    const ids = this.state.selection.ids;
    return ids.length === 1 ? alignmentGuides(this.scene, ids[0]!) : [];
  }

  beginResize(handle: HandlePosition, world: Point): boolean {
    const primary = this.state.selection.primaryId;
    if (primary === null) return false;
    const node = this.scene.getOrThrow(primary);
    const size = (node as { size?: { w: number; h: number } | null }).size;
    if (!size) return false; // group/line/auto-sized text have no resizable box
    const inverseWorld = this.scene.worldMatrix(primary).tryInvert();
    if (!inverseWorld) return false;
    const pos = node.transform.position;
    this.resizeHandle = handle;
    this.resizeStartRect = { x: pos.x, y: pos.y, w: size.w, h: size.h };
    this.resizeInverseWorld = inverseWorld;
    this.resizeStartMatrix = node.transform.toMatrix();
    this.resizeStartLocal = inverseWorld.transformPoint(world);
    this.store.set({
      interaction: 'resizing',
      activeHandle: handle,
      resizePreview: { ...this.resizeStartRect },
    });
    this.scheduler.requestRender();
    return true;
  }

  updateResize(world: Point, modifiers: TransformModifiers): void {
    if (
      !this.resizeHandle ||
      !this.resizeStartRect ||
      !this.resizeInverseWorld ||
      !this.resizeStartMatrix ||
      !this.resizeStartLocal
    ) {
      return;
    }
    // Work entirely in the node's own local frame: the size box is [0,0,w,h]
    // there, so rotation/scale on the node are handled exactly.
    const local = this.resizeInverseWorld.transformPoint(world);
    const dx = local.x - this.resizeStartLocal.x;
    const dy = local.y - this.resizeStartLocal.y;
    const localRect = resizeRect(
      { x: 0, y: 0, w: this.resizeStartRect.w, h: this.resizeStartRect.h },
      this.resizeHandle,
      dx,
      dy,
      { aspect: modifiers.aspect, fromCenter: modifiers.fromCenter },
    );
    // Map the new local box origin back through the node's transform to a position.
    const pos = this.resizeStartMatrix.transformPoint({ x: localRect.x, y: localRect.y });
    this.store.set({ resizePreview: { x: pos.x, y: pos.y, w: localRect.w, h: localRect.h } });
    this.scheduler.requestRender();
  }

  commitResize(): void {
    const start = this.resizeStartRect;
    const preview = this.state.resizePreview;
    const primary = this.state.selection.primaryId;
    this.resizeHandle = null;
    this.resizeStartRect = null;
    this.resizeStartLocal = null;
    this.resizeInverseWorld = null;
    this.resizeStartMatrix = null;

    if (start && preview && primary !== null) {
      const commands: ICommand[] = [];
      if (preview.x !== start.x || preview.y !== start.y) {
        commands.push(new MoveNodeCommand(primary, new Vector2(preview.x, preview.y)));
      }
      if (preview.w !== start.w || preview.h !== start.h) {
        commands.push(new ResizeNodeCommand(primary, { w: preview.w, h: preview.h }));
      }
      if (commands.length > 0) {
        this.commit(
          commands.length === 1 ? commands[0]! : new CompositeCommand(commands, 'resize'),
        );
      }
    }
    this.store.set({ interaction: 'idle', activeHandle: null, resizePreview: null });
    this.scheduler.requestRender();
  }

  setGesture(phase: InteractionPhase, draft: Draft | null): void {
    this.store.set({ interaction: phase, draft });
    this.scheduler.requestRender();
  }

  setDragOffset(offset: Vector2): void {
    this.store.set({ dragOffset: offset });
    this.scheduler.requestRender();
  }

  cancelGesture(): void {
    this.resizeHandle = null;
    this.resizeStartRect = null;
    this.resizeStartLocal = null;
    this.resizeInverseWorld = null;
    this.resizeStartMatrix = null;
    this.store.set({
      interaction: 'idle',
      draft: null,
      dragOffset: null,
      activeHandle: null,
      resizePreview: null,
    });
    this.scheduler.requestRender();
  }

  /** The CSS cursor for the current tool, phase, and hovered handle (§8.2). */
  cursor(): string {
    return resolveCursor({
      tool: this.state.tool,
      phase: this.state.interaction,
      hoverHandle: this.state.hoverHandle,
    });
  }

  private activeTool(): Tool {
    const tool = this.tools.get(this.state.tool);
    if (!tool) throw new Error(`Unknown tool: "${this.state.tool}"`);
    return tool;
  }
}
