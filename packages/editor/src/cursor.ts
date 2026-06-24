import type { HandlePosition } from './handles';
import type { InteractionPhase, ToolId } from './types';

/**
 * Resolve the CSS cursor name from the tool, the interaction phase, and any
 * handle under the pointer (ARCHITECTURE.md §8.2 cursor management). Pure: the
 * UI applies the returned string to the canvas element.
 */
const HANDLE_CURSORS: Record<HandlePosition, string> = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
};

export interface CursorContext {
  readonly tool: ToolId;
  readonly phase: InteractionPhase;
  readonly hoverHandle: HandlePosition | null;
}

export function resolveCursor(ctx: CursorContext): string {
  // An active resize keeps the directional cursor; a hovered handle previews it.
  if (ctx.hoverHandle && (ctx.tool === 'move' || ctx.phase === 'resizing')) {
    return HANDLE_CURSORS[ctx.hoverHandle];
  }
  if (ctx.phase === 'panning') return 'grabbing';
  if (ctx.phase === 'dragging') return 'move';
  switch (ctx.tool) {
    case 'hand':
      return 'grab';
    case 'text':
      return 'text';
    case 'frame':
    case 'rectangle':
    case 'ellipse':
    case 'line':
      return 'crosshair';
    case 'move':
      return 'default';
  }
}
