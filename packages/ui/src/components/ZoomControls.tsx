import { Vector2 } from '@vectorforge/editor';
import { useController, useEngine } from '../context';
import { useEditorSelector } from '../hooks/use-editor-selector';
import { Icon, PATHS } from './icons';

const STEP = 1.2;

/** Zoom pill (DesignOS, bottom-left): center-anchored zoom + reset to 100%. */
export function ZoomControls() {
  const controller = useController();
  const engine = useEngine();
  const zoom = useEditorSelector((state) => state.viewport.zoom);

  const zoomBy = (factor: number): void => {
    const { width, height } = engine.viewSize();
    controller.zoomAt(new Vector2(width / 2, height / 2), zoom * factor);
  };

  return (
    <div
      role="group"
      aria-label="Zoom"
      className="bg-surface-2 text-ink border-line flex items-center overflow-hidden rounded-[11px] border shadow-[0_8px_24px_rgba(0,0,0,.4)]"
    >
      <button
        type="button"
        aria-label="Zoom out"
        onClick={() => zoomBy(1 / STEP)}
        className="text-muted hover:bg-hover hover:text-ink flex h-[34px] w-8 items-center justify-center"
      >
        <Icon d={PATHS.minus} size={15} sw={2} />
      </button>
      <button
        type="button"
        aria-label="Reset zoom to 100%"
        onClick={() => controller.setViewport({ panX: 0, panY: 0, zoom: 1 })}
        className="hover:bg-hover h-[34px] min-w-[54px] font-mono text-xs font-semibold"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        aria-label="Zoom in"
        onClick={() => zoomBy(STEP)}
        className="text-muted hover:bg-hover hover:text-ink flex h-[34px] w-8 items-center justify-center"
      >
        <Icon d={PATHS.plus} size={15} sw={2} />
      </button>
    </div>
  );
}
