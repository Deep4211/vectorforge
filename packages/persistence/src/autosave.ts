import type { DocumentRepository } from './repository';

/**
 * Debounced, diff-free autosave (ARCHITECTURE.md §11; PRD FILE-001 §11.4). The
 * editor/app calls {@link schedule} whenever the document changes; saves coalesce
 * into one write per quiet window. Overlapping writes are serialized (a change
 * during an in-flight save re-arms a follow-up), so the last edit always lands.
 * Persistence stays decoupled from the editor: the current snapshot is supplied
 * by a callback rather than imported.
 */
export interface AutosaveSnapshot {
  readonly id: string;
  readonly name: string;
  readonly vf: string;
}

export interface AutosaveOptions {
  /** Quiet window before a save fires (default 1000ms). */
  readonly delayMs?: number;
  /** Clock (injectable for tests). */
  readonly now?: () => number;
  /** Notified after each successful save (e.g. to clear the dirty flag / stamp "saved"). */
  readonly onSaved?: (meta: { id: string; updatedAt: number }) => void;
  /** Notified if a save throws (e.g. quota exceeded) so the UI can warn. */
  readonly onError?: (error: unknown) => void;
}

export class Autosave {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private saving = false;
  private rearm = false;
  private disposed = false;

  constructor(
    private readonly repo: DocumentRepository,
    private readonly getSnapshot: () => AutosaveSnapshot | null,
    private readonly options: AutosaveOptions = {},
  ) {}

  private get delay(): number {
    return this.options.delayMs ?? 1000;
  }

  /** Arm (or re-arm) the debounce timer. Safe to call on every keystroke/gesture. */
  schedule(): void {
    if (this.disposed) return;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.run();
    }, this.delay);
  }

  /** Save immediately (e.g. on tab hide / explicit save), bypassing the debounce. */
  async flush(): Promise<void> {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await this.run();
  }

  /** Cancel a pending save without writing. */
  cancel(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  dispose(): void {
    this.cancel();
    this.disposed = true;
  }

  private async run(): Promise<void> {
    if (this.disposed) return;
    if (this.saving) {
      this.rearm = true; // a write is in flight; remember to save again after it
      return;
    }
    const snapshot = this.getSnapshot();
    if (!snapshot) return;

    this.saving = true;
    const updatedAt = (this.options.now ?? Date.now)();
    try {
      await this.repo.save(snapshot.id, snapshot.vf, snapshot.name, updatedAt);
      this.options.onSaved?.({ id: snapshot.id, updatedAt });
    } catch (error: unknown) {
      this.options.onError?.(error);
    } finally {
      this.saving = false;
      if (this.rearm && !this.disposed) {
        this.rearm = false;
        await this.run(); // flush the change that arrived mid-save
      }
    }
  }
}
