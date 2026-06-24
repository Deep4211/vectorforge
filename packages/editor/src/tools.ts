import { Rectangle, Vector2 } from '@vectorforge/geometry';
import type { Draft, EngineInput, ToolId } from './types';
import type { Tool, ToolHost } from './tool';

function draftFrom(type: Draft['type'], a: Vector2, b: Vector2): Draft {
  const r = Rectangle.fromPoints(a, b);
  return { type, rect: { x: r.x, y: r.y, w: r.w, h: r.h } };
}

/** Move/select tool: click to select, drag to move; drag on empty space to marquee-select. */
class MoveTool implements Tool {
  readonly id: ToolId = 'move';
  private start: Vector2 | null = null;
  private mode: 'idle' | 'drag' | 'marquee' = 'idle';

  onPointerDown(input: EngineInput, host: ToolHost): void {
    const hit = host.hitTest(input.world);
    if (hit !== null) {
      if (input.modifiers.shift) host.toggleSelect(hit);
      else if (!host.state.selection.ids.includes(hit)) host.select(hit);
      this.start = input.world;
      this.mode = 'drag';
      host.setGesture('dragging', null);
      host.setDragOffset(Vector2.ZERO);
    } else {
      if (!input.modifiers.shift) host.clearSelection();
      this.start = input.world;
      this.mode = 'marquee';
      host.setGesture('marquee', draftFrom('marquee', input.world, input.world));
    }
  }

  onPointerMove(input: EngineInput, host: ToolHost): void {
    if (!this.start) return;
    if (this.mode === 'drag') host.setDragOffset(input.world.subtract(this.start));
    else if (this.mode === 'marquee')
      host.setGesture('marquee', draftFrom('marquee', this.start, input.world));
  }

  onPointerUp(input: EngineInput, host: ToolHost): void {
    if (this.start) {
      if (this.mode === 'drag') {
        const delta = input.world.subtract(this.start);
        if (delta.x !== 0 || delta.y !== 0) host.moveSelectionBy(delta);
      } else if (this.mode === 'marquee') {
        host.selectMarquee(Rectangle.fromPoints(this.start, input.world), input.modifiers.shift);
      }
    }
    this.reset(host);
  }

  onCancel(host: ToolHost): void {
    this.reset(host);
  }

  cursor(): string {
    return 'default';
  }

  private reset(host: ToolHost): void {
    this.start = null;
    this.mode = 'idle';
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
