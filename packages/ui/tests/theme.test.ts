import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getTheme,
  initTheme,
  resolveInitialTheme,
  setTheme,
  subscribeTheme,
  toggleTheme,
} from '@vectorforge/ui';

/** A working in-memory Storage (this jsdom build ships only a no-op stub). */
function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
    clear: () => map.clear(),
    key: (i) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
  delete document.documentElement.dataset.theme;
  setTheme('dark'); // normalize the module singleton between tests
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('theme store', () => {
  it('setTheme reflects to data-theme, persists, and notifies subscribers', () => {
    let notified = 0;
    const unsub = subscribeTheme(() => (notified += 1));

    setTheme('light');
    expect(getTheme()).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('vf-theme')).toBe('light');
    expect(notified).toBe(1);

    setTheme('light'); // no-op: same value does not re-notify
    expect(notified).toBe(1);

    unsub();
    setTheme('dark');
    expect(notified).toBe(1); // unsubscribed
    expect(getTheme()).toBe('dark');
  });

  it('toggleTheme flips between dark and light', () => {
    setTheme('dark');
    toggleTheme();
    expect(getTheme()).toBe('light');
    toggleTheme();
    expect(getTheme()).toBe('dark');
  });

  it('resolveInitialTheme prefers the stored choice over the system preference', () => {
    localStorage.setItem('vf-theme', 'light');
    expect(resolveInitialTheme()).toBe('light');
    localStorage.setItem('vf-theme', 'dark');
    expect(resolveInitialTheme()).toBe('dark');
  });

  it('initTheme adopts an existing data-theme attribute (the no-FOUC boot script)', () => {
    document.documentElement.dataset.theme = 'light';
    expect(initTheme()).toBe('light');
    expect(getTheme()).toBe('light');
  });
});
