import { Vector2 } from '@vectorforge/editor';
import { useController, useEngine } from '../context';
import { useEditorSelector } from '../hooks/use-editor-selector';

const STEP = 1.2;

/** Zoom pill — cursor-anchored zoom about the canvas center, plus reset to 100%. */
export function ZoomControls() {
  const controller = useController();
  const engine = useEngine();
  const zoom = useEditorSelector((state) => state.viewport.zoom);

  const zoomBy = (factor: number): void => {
    const { width, height } = engine.viewSize();
    controller.zoomAt(new Vector2(width / 2, height / 2), zoom * factor);
  };
  const reset = (): void => controller.setViewport({ panX: 0, panY: 0, zoom: 1 });

  return (
    <div
      role="group"
      aria-label="Zoom"
      className="flex items-center gap-1 rounded-full border border-[#26262F] bg-[#16161D] px-1 py-1 text-[#ECECF1] shadow-lg"
    >
      <button
        type="button"
        aria-label="Zoom out"
        onClick={() => zoomBy(1 / STEP)}
        className="h-7 w-7 rounded-full text-lg leading-none hover:bg-[#1E1E27] focus-visible:outline-2 focus-visible:outline-[#7C5CFF]"
      >
        −
      </button>
      <button
        type="button"
        aria-label="Reset zoom to 100%"
        onClick={reset}
        className="min-w-14 rounded-full px-2 text-center font-mono text-xs hover:bg-[#1E1E27] focus-visible:outline-2 focus-visible:outline-[#7C5CFF]"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        aria-label="Zoom in"
        onClick={() => zoomBy(STEP)}
        className="h-7 w-7 rounded-full text-lg leading-none hover:bg-[#1E1E27] focus-visible:outline-2 focus-visible:outline-[#7C5CFF]"
      >
        +
      </button>
    </div>
  );
}
