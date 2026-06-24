import type { RenderSchedulerLike } from './types';

type FrameCallback = () => void;

export interface FrameSchedulerOptions {
  /** Schedule a frame callback; returns a handle. Defaults to `requestAnimationFrame`. */
  readonly raf?: (cb: FrameCallback) => number;
  /** Cancel a scheduled frame. Defaults to `cancelAnimationFrame`. */
  readonly caf?: (handle: number) => void;
  /** Monotonic clock (ms) for the frame-budget watchdog. */
  readonly now?: () => number;
  /** Warn when a frame exceeds this paint budget in ms (RND-4; PRD §11.1 → 8ms). */
  readonly budgetMs?: number;
  readonly onSlowFrame?: (durationMs: number) => void;
}

const defaultRaf = (cb: FrameCallback): number => {
  const g = globalThis as { requestAnimationFrame?: (cb: FrameRequestCallback) => number };
  if (typeof g.requestAnimationFrame === 'function') return g.requestAnimationFrame(() => cb());
  return globalThis.setTimeout(cb, 16) as unknown as number;
};

const defaultCaf = (handle: number): void => {
  const g = globalThis as { cancelAnimationFrame?: (handle: number) => void };
  if (typeof g.cancelAnimationFrame === 'function') g.cancelAnimationFrame(handle);
  else globalThis.clearTimeout(handle as unknown as ReturnType<typeof setTimeout>);
};

/**
 * A single rAF-coalesced frame scheduler (ARCHITECTURE.md §7.5; RND-5). Many
 * `requestRender()` calls in one tick collapse into exactly one `onFrame`
 * invocation; no caller paints synchronously per mutation. The animation-frame
 * source is injectable so the scheduler is deterministic under test.
 */
export class FrameScheduler implements RenderSchedulerLike {
  private handle: number | null = null;
  private disposed = false;

  constructor(
    private readonly onFrame: () => void,
    private readonly options: FrameSchedulerOptions = {},
  ) {}

  /** Queue a paint for the next frame. A no-op if one is already queued (coalescing). */
  requestRender(): void {
    if (this.disposed || this.handle !== null) return;
    this.handle = (this.options.raf ?? defaultRaf)(() => this.tick());
  }

  /** True while a frame is queued — an introspection aid for tests and diagnostics. */
  get pending(): boolean {
    return this.handle !== null;
  }

  private tick(): void {
    this.handle = null;
    const now = this.options.now;
    const start = now ? now() : 0;
    this.onFrame();
    if (now && this.options.budgetMs !== undefined && this.options.onSlowFrame) {
      const duration = now() - start;
      if (duration > this.options.budgetMs) this.options.onSlowFrame(duration);
    }
  }

  /** Cancel any queued frame and stop accepting new ones. */
  dispose(): void {
    this.disposed = true;
    if (this.handle !== null) {
      (this.options.caf ?? defaultCaf)(this.handle);
      this.handle = null;
    }
  }
}
