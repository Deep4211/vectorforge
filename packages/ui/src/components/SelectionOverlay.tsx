import { useMemo } from 'react';
import { worldToScreen, type Viewport } from '@vectorforge/editor';
import { useController } from '../context';
import { useDocumentVersion, useEditorSelector } from '../hooks/use-editor-selector';

interface ScreenRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function rectFromWorld(
  box: { minX: number; minY: number; maxX: number; maxY: number },
  vp: Viewport,
): ScreenRect {
  const tl = worldToScreen({ x: box.minX, y: box.minY }, vp);
  const br = worldToScreen({ x: box.maxX, y: box.maxY }, vp);
  return { x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y };
}

const HANDLE =
  'absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-[2px] border-[1.5px] border-brand bg-white';

/**
 * Screen-space selection chrome (DesignOS): per-selection outline + corner
 * handles + W×H badge, magenta alignment guides, and the marquee. The engine
 * owns the pixels; this overlay only projects editor state to screen and never
 * intercepts pointer input (pointer-events: none).
 */
export function SelectionOverlay() {
  const controller = useController();
  const viewport = useEditorSelector((s) => s.viewport);
  const selection = useEditorSelector((s) => s.selection);
  const draft = useEditorSelector((s) => s.draft);
  const dragOffset = useEditorSelector((s) => s.dragOffset);
  const resizePreview = useEditorSelector((s) => s.resizePreview);
  const version = useDocumentVersion();

  // previewBounds() reflects the in-progress move/resize so handles track the shape live.
  const bounds = useMemo(
    () => controller.previewBounds(),
    [controller, selection, version, dragOffset, resizePreview],
  );
  const guides = useMemo(() => controller.guides(), [controller, selection, version]);

  const sel = bounds ? rectFromWorld(bounds, viewport) : null;
  const widthLabel = bounds ? Math.round(bounds.maxX - bounds.minX) : 0;
  const heightLabel = bounds ? Math.round(bounds.maxY - bounds.minY) : 0;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {/* alignment guides */}
      {guides.map((g, i) => {
        const a = worldToScreen(g.from, viewport);
        const b = worldToScreen(g.to, viewport);
        const left = Math.min(a.x, b.x);
        const top = Math.min(a.y, b.y);
        const horizontal = g.orientation === 'horizontal';
        return (
          <div key={i}>
            <div
              className="border-guide absolute"
              style={
                horizontal
                  ? {
                      left,
                      top,
                      width: Math.abs(b.x - a.x),
                      borderTopWidth: 1,
                      borderStyle: 'dashed',
                    }
                  : {
                      left,
                      top,
                      height: Math.abs(b.y - a.y),
                      borderLeftWidth: 1,
                      borderStyle: 'dashed',
                    }
              }
            />
            {g.kind === 'gap' && (
              <span
                className="bg-guide absolute -translate-x-1/2 -translate-y-1/2 rounded px-1 py-px font-mono text-[10px] font-semibold text-white"
                style={{ left: (a.x + b.x) / 2, top: (a.y + b.y) / 2 }}
              >
                {Math.round(g.distance)}
              </span>
            )}
          </div>
        );
      })}

      {/* selection outline + handles + dimension badge */}
      {sel && (
        <div className="absolute" style={{ left: sel.x, top: sel.y, width: sel.w, height: sel.h }}>
          <div className="border-brand absolute inset-0 border-[1.5px] shadow-[0_0_0_1px_rgba(124,92,255,.2)]" />
          <div className="absolute left-1/2 top-[-22px] -translate-x-1/2">
            <span className="bg-brand rounded px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-white">
              {widthLabel} × {heightLabel}
            </span>
          </div>
          <span className={HANDLE} style={{ left: 0, top: 0 }} />
          <span className={HANDLE} style={{ left: sel.w, top: 0 }} />
          <span className={HANDLE} style={{ left: 0, top: sel.h }} />
          <span className={HANDLE} style={{ left: sel.w, top: sel.h }} />
        </div>
      )}

      {/* marquee selection box or shape-draw ghost */}
      {(draft?.type === 'marquee' || draft?.type === 'create') &&
        (() => {
          const r = rectFromWorld(
            {
              minX: draft.rect.x,
              minY: draft.rect.y,
              maxX: draft.rect.x + draft.rect.w,
              maxY: draft.rect.y + draft.rect.h,
            },
            viewport,
          );
          const ghost =
            draft.type === 'marquee'
              ? 'border-brand bg-brand/[0.12] border'
              : 'border-brand border border-dashed';
          return (
            <div
              className={`absolute ${ghost}`}
              style={{ left: r.x, top: r.y, width: r.w, height: r.h }}
            />
          );
        })()}

      {/* live line-draw preview */}
      {draft?.type === 'line' &&
        (() => {
          const a = worldToScreen(draft.a, viewport);
          const b = worldToScreen(draft.b, viewport);
          return (
            <svg className="absolute inset-0 h-full w-full" style={{ overflow: 'visible' }}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                style={{ stroke: 'var(--color-brand)' }}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                strokeLinecap="round"
              />
            </svg>
          );
        })()}
    </div>
  );
}
