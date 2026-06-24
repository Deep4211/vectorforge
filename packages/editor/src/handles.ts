import {
  BoundingBox,
  Rectangle,
  Vector2,
  worldToScreen,
  type Point,
  type Viewport,
} from '@vectorforge/geometry';
import type { NodeId, SceneGraph } from '@vectorforge/document';

/**
 * Transform handles (ARCHITECTURE.md §9.2). A single selection shows eight
 * handles — four corners + four edge midpoints — drawn at a constant *screen*
 * size regardless of zoom, so their geometry is computed in screen space and the
 * resize is mapped back to world (PRD TRN technical note). The resize math here is
 * pure and framework-free; the overlay is drawn by the UI/renderer later.
 */
export type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const HANDLE_POSITIONS: readonly HandlePosition[] = [
  'nw',
  'ne',
  'se',
  'sw', // corners first (preferred when a click is ambiguous)
  'n',
  'e',
  's',
  'w',
];

/** Default screen-space hit radius (CSS px) for grabbing a handle. */
export const HANDLE_HIT_RADIUS = 8;

const LEFT = new Set<HandlePosition>(['nw', 'w', 'sw']);
const RIGHT = new Set<HandlePosition>(['ne', 'e', 'se']);
const TOP = new Set<HandlePosition>(['nw', 'n', 'ne']);
const BOTTOM = new Set<HandlePosition>(['sw', 's', 'se']);

export interface ResizeOptions {
  /** Lock the start aspect ratio (Shift). */
  readonly aspect?: boolean;
  /** Resize symmetrically about the center (Alt). */
  readonly fromCenter?: boolean;
  /** Smallest allowed width/height; never collapses below this (default 1). */
  readonly minSize?: number;
}

/** The union of the selected nodes' world AABBs, or `null` if none have bounds. */
export function selectionWorldBounds(
  scene: SceneGraph,
  ids: readonly NodeId[],
): BoundingBox | null {
  const boxes: BoundingBox[] = [];
  for (const id of ids) {
    const b = scene.worldBounds(id);
    if (b) boxes.push(b);
  }
  return boxes.length > 0 ? BoundingBox.fromBoxes(boxes) : null;
}

function worldHandlePoints(b: BoundingBox): Record<HandlePosition, Vector2> {
  const midX = (b.minX + b.maxX) / 2;
  const midY = (b.minY + b.maxY) / 2;
  return {
    nw: new Vector2(b.minX, b.minY),
    n: new Vector2(midX, b.minY),
    ne: new Vector2(b.maxX, b.minY),
    e: new Vector2(b.maxX, midY),
    se: new Vector2(b.maxX, b.maxY),
    s: new Vector2(midX, b.maxY),
    sw: new Vector2(b.minX, b.maxY),
    w: new Vector2(b.minX, midY),
  };
}

/** Handle anchor points in **screen** pixels (for drawing the overlay). */
export function handleScreenPoints(
  bounds: BoundingBox,
  viewport: Viewport,
): Record<HandlePosition, Vector2> {
  const world = worldHandlePoints(bounds);
  const out = {} as Record<HandlePosition, Vector2>;
  for (const pos of HANDLE_POSITIONS) out[pos] = worldToScreen(world[pos], viewport);
  return out;
}

/** Which handle (if any) is within `radius` screen px of `screenPoint`; corners win ties. */
export function hitTestHandle(
  bounds: BoundingBox,
  viewport: Viewport,
  screenPoint: Point,
  radius: number = HANDLE_HIT_RADIUS,
): HandlePosition | null {
  const points = handleScreenPoints(bounds, viewport);
  const r2 = radius * radius;
  for (const pos of HANDLE_POSITIONS) {
    const p = points[pos];
    const dx = p.x - screenPoint.x;
    const dy = p.y - screenPoint.y;
    if (dx * dx + dy * dy <= r2) return pos;
  }
  return null;
}

/**
 * The new rectangle after dragging `handle` by `(dx, dy)` (in the rect's own
 * coordinate space). Honors aspect-lock and resize-from-center, and never
 * collapses below `minSize`. The edge opposite the dragged handle stays put
 * (the center stays put with `fromCenter`); perpendicular edges stay centered.
 */
export function resizeRect(
  start: { x: number; y: number; w: number; h: number },
  handle: HandlePosition,
  dx: number,
  dy: number,
  options: ResizeOptions = {},
): Rectangle {
  const { x, y, w, h } = start;
  const minSize = options.minSize ?? 1;
  const left = LEFT.has(handle);
  const right = RIGHT.has(handle);
  const top = TOP.has(handle);
  const bottom = BOTTOM.has(handle);

  let nw = w + (right ? dx : 0) - (left ? dx : 0);
  let nh = h + (bottom ? dy : 0) - (top ? dy : 0);
  if (options.fromCenter) {
    nw = w + 2 * (nw - w);
    nh = h + 2 * (nh - h);
  }

  if (options.aspect && w > 0 && h > 0) {
    const ratio = w / h;
    const horizontalOnly = (left || right) && !(top || bottom);
    const verticalOnly = (top || bottom) && !(left || right);
    const widthDriven = horizontalOnly
      ? true
      : verticalOnly
        ? false
        : Math.abs(nw - w) / w >= Math.abs(nh - h) / h;
    if (widthDriven) nh = nw / ratio;
    else nw = nh * ratio;
  }

  nw = Math.max(minSize, nw);
  nh = Math.max(minSize, nh);

  const cx = x + w / 2;
  const cy = y + h / 2;
  let nx: number;
  let ny: number;
  if (options.fromCenter) nx = cx - nw / 2;
  else if (left)
    nx = x + w - nw; // right edge fixed
  else if (right)
    nx = x; // left edge fixed
  else nx = cx - nw / 2; // n/s handle: horizontal center fixed
  if (options.fromCenter) ny = cy - nh / 2;
  else if (top)
    ny = y + h - nh; // bottom edge fixed
  else if (bottom)
    ny = y; // top edge fixed
  else ny = cy - nh / 2; // e/w handle: vertical center fixed

  return Rectangle.of(nx, ny, nw, nh);
}
