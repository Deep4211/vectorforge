import type { Context2DLike, RenderItem, TextItem } from './types';

const TAU = Math.PI * 2;

/** Trace a rounded-rectangle path from (0,0) to (w,h) with a clamped corner radius. */
function roundedRectPath(ctx: Context2DLike, w: number, h: number, radius: number): void {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  ctx.beginPath();
  if (r === 0) {
    ctx.rect(0, 0, w, h);
    ctx.closePath();
    return;
  }
  ctx.moveTo(r, 0);
  ctx.lineTo(w - r, 0);
  ctx.quadraticCurveTo(w, 0, w, r);
  ctx.lineTo(w, h - r);
  ctx.quadraticCurveTo(w, h, w - r, h);
  ctx.lineTo(r, h);
  ctx.quadraticCurveTo(0, h, 0, h - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
}

const CANVAS_TEXT_ALIGN = {
  left: 'left',
  center: 'center',
  right: 'right',
  justify: 'left', // Canvas2D has no justify; left is the safe fallback (§7.4).
} as const;

/** The x anchor (in local px) for a text line given its alignment and optional box width. */
function textAnchorX(item: TextItem): number {
  const width = item.size?.w ?? 0;
  if (item.textAlign === 'center') return width / 2;
  if (item.textAlign === 'right') return width;
  return 0;
}

function paintText(ctx: Context2DLike, item: TextItem): void {
  ctx.font = `${item.fontWeight} ${item.fontSize}px ${item.fontFamily}`;
  ctx.fillStyle = item.fill;
  ctx.textBaseline = 'top';
  ctx.textAlign = CANVAS_TEXT_ALIGN[item.textAlign];
  // Per-character spacing (Canvas2D `letterSpacing`); harmless where unsupported.
  ctx.letterSpacing = `${item.letterSpacing}px`;
  const x = textAnchorX(item);
  const lineHeight = item.lineHeight > 0 ? item.lineHeight : item.fontSize;
  const lines = item.content.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    ctx.fillText(lines[i]!, x, i * lineHeight);
  }
}

/**
 * Paint one display-list item in its **local** coordinate space. The caller has
 * already applied the combined device·view·world transform and the item's
 * effective `globalAlpha`, so each branch draws as if the node sat at the origin
 * (RND-3 — a single view transform; no per-node layout math here).
 */
export function paintItem(ctx: Context2DLike, item: RenderItem): void {
  switch (item.kind) {
    case 'frame': {
      // V1 paints only the frame background. `item.clipsContent` is carried in the
      // display list but content-clipping is deferred (it needs a hierarchical pass;
      // children are flattened siblings here) — see the renderer README scope notes.
      ctx.fillStyle = item.backgroundColor;
      ctx.fillRect(0, 0, item.size.w, item.size.h);
      return;
    }
    case 'rectangle': {
      ctx.fillStyle = item.fill;
      if (item.cornerRadius > 0) {
        roundedRectPath(ctx, item.size.w, item.size.h, item.cornerRadius);
        ctx.fill();
      } else {
        ctx.fillRect(0, 0, item.size.w, item.size.h);
      }
      return;
    }
    case 'ellipse': {
      const rx = item.size.w / 2;
      const ry = item.size.h / 2;
      ctx.fillStyle = item.fill;
      ctx.beginPath();
      ctx.ellipse(rx, ry, rx, ry, 0, 0, TAU);
      ctx.closePath();
      ctx.fill();
      return;
    }
    case 'line': {
      ctx.strokeStyle = item.stroke;
      ctx.lineWidth = item.strokeWidth;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(item.a.x, item.a.y);
      ctx.lineTo(item.b.x, item.b.y);
      ctx.stroke();
      return;
    }
    case 'text': {
      paintText(ctx, item);
      return;
    }
    case 'image': {
      // No asset store until Sprint 8: draw a neutral placeholder box + diagonals.
      const { w, h } = item.size;
      ctx.fillStyle = '#E5E7EB';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#9CA3AF';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.moveTo(0, 0);
      ctx.lineTo(w, h);
      ctx.moveTo(w, 0);
      ctx.lineTo(0, h);
      ctx.stroke();
      return;
    }
  }
}
