import { Rectangle, Vector2 } from '@vectorforge/geometry';
import type { Draft, EngineInput, ToolId } from './types';
import type { Tool, ToolHost } from './tool';

function draftFrom(type: Draft['type'], a: Vector2, b: Vector2): Draft {
  const r = Rectangle.fromPoints(a, b);
  return { type, rect: { x: r.x, y: r.y, w: r.w, h: r.h } };
}

/** Movement (screen px) below which a gesture is treated as a click, not a drag/marquee (SEL edge). */
export const DRAG_THRESHOLD_PX = 4;

type MoveMode = 'idle' | 'drag' | 'marquee' | 'resize';

/**
 * Move/select tool. Click selects (overlap clicks cycle through stacked nodes);
 * drag a handle to resize, drag a body to move, drag empty space to marquee. A
 * gesture only commits once it passes the drag threshold, so a sub-threshold
 * press is a pure click (ARCHITECTURE.md §8.2). Shift axis-locks a move and
 * aspect-locks a resize; Alt resizes from center (§9.3).
 */
class MoveTool implements Tool {
  readonly id: ToolId = 'move';
  private startWorld: Vector2 | null = null;
  private startScreen: Vector2 | null = null;
  private mode: MoveMode = 'idle';
  private moved = false;
  /** True when this press landed on the already-primary node — a no-move release cycles. */
  private reclickPrimary = false;

  onPointerDown(input: EngineInput, host: ToolHost): void {
    this.startWorld = input.world;
    this.startScreen = input.screen;
    this.moved = false;
    this.reclickPrimary = false;

    // 1) A handle under the pointer (with a selection) starts a resize.
    if (host.state.selection.ids.length > 0) {
      const handle = host.hitTestHandle(input.screen);
      if (handle !== null && host.beginResize(handle, input.world)) {
        this.mode = 'resize';
        return;
      }
    }

    // 2) A node under the pointer: select and prepare to drag.
    const hit = host.hitTest(input.world);
    if (hit !== null) {
      const wasPrimary = hit === host.state.selection.primaryId;
      if (input.modifiers.shift) host.toggleSelect(hit);
      // Grabbing the already-selected node keeps it (so a drag moves it); a fresh
      // node selects the topmost. Re-clicking the same node without moving cycles
      // through the overlap stack — deferred to the no-move release below.
      else if (!wasPrimary) host.selectCycle(input.world, false);
      this.reclickPrimary = wasPrimary && !input.modifiers.shift;
      this.mode = 'drag';
      host.setGesture('dragging', null);
      host.setDragOffset(Vector2.ZERO);
      return;
    }

    // 3) Empty space → marquee.
    if (!input.modifiers.shift) host.clearSelection();
    this.mode = 'marquee';
    host.setGesture('marquee', draftFrom('marquee', input.world, input.world));
  }

  onPointerMove(input: EngineInput, host: ToolHost): void {
    if (this.mode === 'idle') {
      host.updateHover(input.world, input.screen);
      return;
    }
    if (!this.startWorld || !this.startScreen) return;
    if (!this.moved && this.startScreen.distanceTo(input.screen) > DRAG_THRESHOLD_PX)
      this.moved = true;
    if (!this.moved) return;

    if (this.mode === 'drag') {
      host.setDragOffset(this.constrainedDelta(input));
    } else if (this.mode === 'marquee') {
      host.setGesture('marquee', draftFrom('marquee', this.startWorld, input.world));
    } else if (this.mode === 'resize') {
      host.updateResize(input.world, {
        aspect: input.modifiers.shift,
        fromCenter: input.modifiers.alt,
      });
    }
  }

  onPointerUp(input: EngineInput, host: ToolHost): void {
    if (this.startWorld && this.moved) {
      if (this.mode === 'drag') {
        const delta = this.constrainedDelta(input);
        if (delta.x !== 0 || delta.y !== 0) host.moveSelectionBy(delta);
      } else if (this.mode === 'marquee') {
        host.selectMarquee(
          Rectangle.fromPoints(this.startWorld, input.world),
          input.modifiers.shift,
        );
      } else if (this.mode === 'resize') {
        host.commitResize();
      }
    } else if (this.mode === 'drag' && this.reclickPrimary && this.startWorld) {
      // A deliberate click (no drag) on the already-selected node digs to the next overlap.
      host.selectCycle(this.startWorld, false);
    }
    this.reset(host);
  }

  onCancel(host: ToolHost): void {
    this.reset(host);
  }

  cursor(): string {
    return 'default';
  }

  /** The move delta, axis-locked to the dominant axis while Shift is held (§9.3). */
  private constrainedDelta(input: EngineInput): Vector2 {
    const delta = input.world.subtract(this.startWorld!);
    if (!input.modifiers.shift) return delta;
    return Math.abs(delta.x) >= Math.abs(delta.y)
      ? new Vector2(delta.x, 0)
      : new Vector2(0, delta.y);
  }

  private reset(host: ToolHost): void {
    this.startWorld = null;
    this.startScreen = null;
    this.mode = 'idle';
    this.moved = false;
    this.reclickPrimary = false;
    host.cancelGesture();
  }
}

/** Draw tool for rectangle/ellipse/frame: drag to size, commit on release (skips zero-size). */
class DrawTool implements Tool {
  private start: Vector2 | null = null;

  constructor(
    readonly id: ToolId,
    private readonly kind: 'rectangle' | 'ellipse' | 'frame',
  ) {}

  onPointerDown(input: EngineInput, host: ToolHost): void {
    this.start = input.world;
    host.setGesture('drawing', draftFrom('create', input.world, input.world));
  }

  onPointerMove(input: EngineInput, host: ToolHost): void {
    if (this.start) host.setGesture('drawing', draftFrom('create', this.start, input.world));
  }

  onPointerUp(input: EngineInput, host: ToolHost): void {
    if (this.start) {
      const rect = Rectangle.fromPoints(this.start, input.world);
      if (rect.w !== 0 && rect.h !== 0) host.createShape(this.kind, rect);
    }
    this.onCancel(host);
  }

  onCancel(host: ToolHost): void {
    this.start = null;
    host.cancelGesture();
  }

  cursor(): string {
    return 'crosshair';
  }
}

/** Place a text node at the click point. */
class TextTool implements Tool {
  readonly id: ToolId = 'text';

  onPointerDown(input: EngineInput, host: ToolHost): void {
    host.createText(input.world);
  }

  onPointerMove(): void {}
  onPointerUp(): void {}
  onCancel(): void {}

  cursor(): string {
    return 'text';
  }
}

/** Pan the viewport (screen-space drag). */
class HandTool implements Tool {
  readonly id: ToolId = 'hand';
  private startScreen: Vector2 | null = null;
  private startPan: { x: number; y: number; zoom: number } | null = null;

  onPointerDown(input: EngineInput, host: ToolHost): void {
    this.startScreen = input.screen;
    const vp = host.state.viewport;
    this.startPan = { x: vp.panX, y: vp.panY, zoom: vp.zoom };
    host.setGesture('panning', null);
  }

  onPointerMove(input: EngineInput, host: ToolHost): void {
    if (this.startScreen && this.startPan) {
      const d = input.screen.subtract(this.startScreen);
      host.setViewport({
        panX: this.startPan.x + d.x,
        panY: this.startPan.y + d.y,
        zoom: this.startPan.zoom,
      });
    }
  }

  onPointerUp(_input: EngineInput, host: ToolHost): void {
    this.onCancel(host);
  }

  onCancel(host: ToolHost): void {
    this.startScreen = null;
    this.startPan = null;
    host.cancelGesture();
  }

  cursor(): string {
    return 'grab';
  }
}

/** The Sprint 4 tool set. One instance per tool; the active tool lives in editor state. */
export function createDefaultTools(): Map<ToolId, Tool> {
  const tools: Tool[] = [
    new MoveTool(),
    new DrawTool('frame', 'frame'),
    new DrawTool('rectangle', 'rectangle'),
    new DrawTool('ellipse', 'ellipse'),
    new TextTool(),
    new HandTool(),
  ];
  return new Map(tools.map((t) => [t.id, t]));
}
