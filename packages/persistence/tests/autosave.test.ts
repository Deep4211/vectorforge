import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Autosave,
  InMemoryDocumentRepository,
  type AutosaveSnapshot,
} from '@vectorforge/persistence';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function snapshot(vf: string): AutosaveSnapshot {
  return { id: 'doc-1', name: 'Doc', vf };
}

describe('Autosave', () => {
  it('coalesces a burst of changes into a single save after the quiet window', async () => {
    const repo = new InMemoryDocumentRepository();
    const saveSpy = vi.spyOn(repo, 'save');
    let current = 'v1';
    const auto = new Autosave(repo, () => snapshot(current), { delayMs: 1000, now: () => 42 });

    auto.schedule();
    current = 'v2';
    auto.schedule();
    current = 'v3';
    auto.schedule(); // three edits, one window

    expect(saveSpy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);

    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(await repo.load('doc-1')).toBe('v3'); // latest value
  });

  it('flush() saves immediately and fires onSaved', async () => {
    const repo = new InMemoryDocumentRepository();
    const onSaved = vi.fn();
    const auto = new Autosave(repo, () => snapshot('vX'), { now: () => 7, onSaved });

    auto.schedule();
    await auto.flush();
    expect(await repo.load('doc-1')).toBe('vX');
    expect(onSaved).toHaveBeenCalledWith({ id: 'doc-1', updatedAt: 7 });
  });

  it('cancel() prevents a pending save', async () => {
    const repo = new InMemoryDocumentRepository();
    const saveSpy = vi.spyOn(repo, 'save');
    const auto = new Autosave(repo, () => snapshot('v'), { delayMs: 500 });
    auto.schedule();
    auto.cancel();
    await vi.advanceTimersByTimeAsync(1000);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('does not save when the snapshot is null (no active document)', async () => {
    const repo = new InMemoryDocumentRepository();
    const saveSpy = vi.spyOn(repo, 'save');
    const auto = new Autosave(repo, () => null, { delayMs: 100 });
    auto.schedule();
    await vi.advanceTimersByTimeAsync(200);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('reports save failures via onError without throwing', async () => {
    const repo = new InMemoryDocumentRepository();
    vi.spyOn(repo, 'save').mockRejectedValueOnce(new Error('quota exceeded'));
    const onError = vi.fn();
    const auto = new Autosave(repo, () => snapshot('v'), { onError });
    await auto.flush();
    expect(onError).toHaveBeenCalledOnce();
  });

  it('re-arms a save that arrived while a write was in flight', async () => {
    const repo = new InMemoryDocumentRepository();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    let current = 'first';
    const saveSpy = vi
      .spyOn(repo, 'save')
      .mockImplementationOnce(async () => {
        await gate; // hold the first write open
      })
      .mockImplementation(async (id, vf) => {
        await new InMemoryDocumentRepository().save(id, vf, 'Doc', 0);
      });

    const auto = new Autosave(repo, () => snapshot(current), { delayMs: 10 });
    auto.schedule();
    await vi.advanceTimersByTimeAsync(10); // first save starts, awaits gate
    current = 'second';
    auto.schedule(); // arrives mid-write → should re-arm
    await vi.advanceTimersByTimeAsync(10);
    release();
    await vi.runAllTimersAsync();

    expect(saveSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(saveSpy.mock.calls.at(-1)?.[1]).toBe('second'); // last write is the latest value
  });
});
