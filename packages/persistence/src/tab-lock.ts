/**
 * Best-effort multi-tab lock (ARCHITECTURE.md §11; PRD §11.4 — avoid two tabs
 * autosaving the same document and clobbering each other). Built on the Web
 * Locks API; when it is unavailable the lock is reported as not-acquired and the
 * app degrades to a soft warning rather than blocking editing.
 */
export interface TabLock {
  /** True if this tab holds the lock (false = another tab has it, or unsupported). */
  readonly acquired: boolean;
  /** Release the lock (idempotent). */
  release(): void;
}

interface LockManagerLike {
  request(
    name: string,
    options: { mode?: 'exclusive' | 'shared'; ifAvailable?: boolean },
    callback: (lock: unknown) => Promise<unknown>,
  ): Promise<unknown>;
}

function lockManager(): LockManagerLike | null {
  const nav = (globalThis as { navigator?: { locks?: unknown } }).navigator;
  const locks = nav?.locks as LockManagerLike | undefined;
  return locks && typeof locks.request === 'function' ? locks : null;
}

const NO_LOCK: TabLock = { acquired: false, release: () => {} };

/**
 * Try to take an exclusive lock for `documentId` without blocking. Resolves once
 * acquisition is decided; the lock is held until {@link TabLock.release}. Never
 * rejects — on any error or missing support it resolves to a not-acquired lock.
 */
export function acquireDocumentLock(documentId: string): Promise<TabLock> {
  const locks = lockManager();
  if (!locks) return Promise.resolve(NO_LOCK);

  const name = `vectorforge:doc:${documentId}`;
  let releaseHeld: (() => void) | null = null;
  const held = new Promise<void>((resolve) => {
    releaseHeld = resolve;
  });

  return new Promise<TabLock>((resolve) => {
    let settled = false;
    const settle = (lock: TabLock): void => {
      if (settled) return;
      settled = true;
      resolve(lock);
    };

    locks
      .request(name, { mode: 'exclusive', ifAvailable: true }, (lock) => {
        if (!lock) {
          settle(NO_LOCK); // someone else holds it
          return Promise.resolve();
        }
        settle({
          acquired: true,
          release: () => releaseHeld?.(),
        });
        return held; // keep the lock until release() resolves this promise
      })
      .catch(() => settle(NO_LOCK));
  });
}
