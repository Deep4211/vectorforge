import { describe, expect, it, vi } from 'vitest';
import { FrameScheduler } from '@vectorforge/renderer';

/** A manual rAF: captures the queued callback so the test controls when frames run. */
function manualRaf() {
  let queued: (() => void) | null = null;
  let scheduleCount = 0;
  let cancelCount = 0;
  return {
    raf: (cb: () => void): number => {
      queued = cb;
      scheduleCount += 1;
      return scheduleCount;
    },
    caf: (): void => {
      queued = null;
      cancelCount += 1;
    },
    flush: (): void => {
      const cb = queued;
      queued = null;
      cb?.();
    },
    get scheduleCount() {
      return scheduleCount;
    },
    get cancelCount() {
      return cancelCount;
    },
  };
}

describe('FrameScheduler — rAF coalescing (RND-5)', () => {
  it('collapses many requestRender calls in one tick into a single paint', () => {
    const clock = manualRaf();
    let frames = 0;
    const scheduler = new FrameScheduler(() => (frames += 1), { raf: clock.raf, caf: clock.caf });

    scheduler.requestRender();
    scheduler.requestRender();
    scheduler.requestRender();
    expect(clock.scheduleCount).toBe(1); // coalesced
    expect(scheduler.pending).toBe(true);
    expect(frames).toBe(0); // nothing painted synchronously

    clock.flush();
    expect(frames).toBe(1);
    expect(scheduler.pending).toBe(false);
  });

  it('schedules a fresh frame after the previous one runs', () => {
    const clock = manualRaf();
    let frames = 0;
    const scheduler = new FrameScheduler(() => (frames += 1), { raf: clock.raf, caf: clock.caf });

    scheduler.requestRender();
    clock.flush();
    scheduler.requestRender();
    clock.flush();
    expect(frames).toBe(2);
    expect(clock.scheduleCount).toBe(2);
  });

  it('honors a requestRender() issued from inside onFrame (re-entrancy)', () => {
    const clock = manualRaf();
    let frames = 0;
    let reentered = false;
    const scheduler = new FrameScheduler(
      () => {
        frames += 1;
        if (!reentered) {
          reentered = true;
          scheduler.requestRender(); // re-invalidate during the paint
        }
      },
      { raf: clock.raf, caf: clock.caf },
    );

    scheduler.requestRender();
    clock.flush(); // first frame; onFrame re-requests
    expect(frames).toBe(1);
    expect(scheduler.pending).toBe(true); // a fresh frame is queued (handle cleared before onFrame)
    expect(clock.scheduleCount).toBe(2);

    clock.flush(); // second frame; no further re-request
    expect(frames).toBe(2);
    expect(scheduler.pending).toBe(false);
  });

  it('dispose() cancels a queued frame and ignores later requests', () => {
    const clock = manualRaf();
    let frames = 0;
    const scheduler = new FrameScheduler(() => (frames += 1), { raf: clock.raf, caf: clock.caf });

    scheduler.requestRender();
    scheduler.dispose();
    expect(clock.cancelCount).toBe(1);
    expect(scheduler.pending).toBe(false);

    scheduler.requestRender();
    expect(clock.scheduleCount).toBe(1); // no new frame after dispose
  });

  it('warns via onSlowFrame when a frame exceeds the budget (RND-4)', () => {
    const clock = manualRaf();
    const times = [0, 12]; // start, end → 12ms frame
    let i = 0;
    const slow: number[] = [];
    const scheduler = new FrameScheduler(() => {}, {
      raf: clock.raf,
      caf: clock.caf,
      now: () => times[i++]!,
      budgetMs: 8,
      onSlowFrame: (d) => slow.push(d),
    });
    scheduler.requestRender();
    clock.flush();
    expect(slow).toEqual([12]);
  });

  it('falls back to a timer when no rAF is injected, and dispose cancels it', () => {
    vi.useFakeTimers();
    try {
      let frames = 0;
      const scheduler = new FrameScheduler(() => (frames += 1));
      scheduler.requestRender();
      expect(scheduler.pending).toBe(true);
      vi.advanceTimersByTime(16);
      expect(frames).toBe(1);

      // A second request that we cancel via dispose must not fire.
      scheduler.requestRender();
      scheduler.dispose();
      vi.advanceTimersByTime(50);
      expect(frames).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('stays silent for a within-budget frame', () => {
    const clock = manualRaf();
    const times = [0, 4];
    let i = 0;
    const slow: number[] = [];
    const scheduler = new FrameScheduler(() => {}, {
      raf: clock.raf,
      caf: clock.caf,
      now: () => times[i++]!,
      budgetMs: 8,
      onSlowFrame: (d) => slow.push(d),
    });
    scheduler.requestRender();
    clock.flush();
    expect(slow).toEqual([]);
  });
});
