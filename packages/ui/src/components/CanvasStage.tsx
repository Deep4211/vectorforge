import {
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Vector2 } from '@vectorforge/editor';
import { useController, useEngine } from '../context';
import { toEngineInput } from '../input/normalize';

const ZOOM_WHEEL_SENSITIVITY = 0.0015;

/**
 * The engine-owned canvas (UI-4). React holds an opaque ref; the injected
 * {@link CanvasEngine} drives the render loop. This component only forwards size
 * changes and normalized pointer/wheel input — it never paints. The wheel
 * handler is a NON-passive native listener so it can preventDefault and stop the
 * browser's own page zoom/scroll (React's synthetic `onWheel` is passive).
 */
export function CanvasStage() {
  const engine = useEngine();
  const controller = useController();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Skip renderer wiring when there is no 2D context (e.g. jsdom in tests): the
    // chrome still mounts so component tests run without a canvas mock.
    let hasContext = false;
    try {
      hasContext = canvas.getContext('2d') !== null;
    } catch {
      hasContext = false;
    }
    if (!hasContext) return;

    engine.attach(canvas);

    const applySize = (): void => {
      const rect = canvas.getBoundingClientRect();
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      engine.resize(rect.width, rect.height, dpr);
    };
    applySize();

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(applySize) : null;
    observer?.observe(canvas);

    // Re-size when the display's device-pixel-ratio changes (e.g. window dragged
    // to a different-density monitor). The media query embeds the current dpr, so
    // it must be re-armed after each change.
    let dprMedia: MediaQueryList | null = null;
    const onDprChange = (): void => {
      applySize();
      armDprWatch();
    };
    const armDprWatch = (): void => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
      dprMedia?.removeEventListener('change', onDprChange);
      dprMedia = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      dprMedia.addEventListener('change', onDprChange);
    };
    armDprWatch();

    const onWheel = (e: WheelEvent): void => {
      e.preventDefault(); // own the gesture: no native page zoom/scroll (UI-4)
      const r = canvas.getBoundingClientRect();
      const screen = new Vector2(e.clientX - r.left, e.clientY - r.top);
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * ZOOM_WHEEL_SENSITIVITY);
        controller.zoomAt(screen, controller.state.viewport.zoom * factor);
      } else {
        controller.panBy(new Vector2(-e.deltaX, -e.deltaY));
      }
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      observer?.disconnect();
      dprMedia?.removeEventListener('change', onDprChange);
      canvas.removeEventListener('wheel', onWheel);
      engine.detach();
    };
  }, [engine, controller]);

  const rect = (): DOMRect => canvasRef.current!.getBoundingClientRect();

  // Pointer capture keeps a drag alive when the pointer leaves the canvas; it is a
  // progressive enhancement (absent under jsdom and some environments), so guard it.
  const capturePointer = (id: number): void => {
    const el = canvasRef.current;
    if (el && typeof el.setPointerCapture === 'function') {
      try {
        el.setPointerCapture(id);
      } catch {
        /* ignore — capture is best-effort */
      }
    }
  };
  const releasePointer = (id: number): void => {
    const el = canvasRef.current;
    if (el && typeof el.releasePointerCapture === 'function') {
      try {
        el.releasePointerCapture(id);
      } catch {
        /* ignore */
      }
    }
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>): void => {
    capturePointer(e.pointerId);
    canvasRef.current?.focus();
    controller.handlePointerDown(toEngineInput(e.nativeEvent, rect(), controller.state.viewport));
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>): void => {
    controller.handlePointerMove(toEngineInput(e.nativeEvent, rect(), controller.state.viewport));
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>): void => {
    controller.handlePointerUp(toEngineInput(e.nativeEvent, rect(), controller.state.viewport));
    releasePointer(e.pointerId);
  };
  const onDoubleClick = (e: ReactMouseEvent<HTMLCanvasElement>): void => {
    controller.handleDoubleClick(toEngineInput(e.nativeEvent, rect(), controller.state.viewport));
  };

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden overscroll-none bg-[#0B0B0E]">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        aria-label="Design canvas"
        className="absolute inset-0 h-full w-full touch-none outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#7C5CFF]/50"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => controller.handlePointerCancel()}
        onDoubleClick={onDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}
