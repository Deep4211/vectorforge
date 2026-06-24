/**
 * Theme store (presentation concern, UI-1). The chosen theme is reflected as a
 * `data-theme` attribute on the document element — every colour token in the
 * stylesheet keys off it — and persisted to localStorage. This module owns no
 * document state; theme is purely how the shell is painted.
 *
 * It is a tiny framework-agnostic external store; {@link useTheme} subscribes to
 * it via React's `useSyncExternalStore`. All DOM/storage access is guarded so
 * the module is safe to import in a non-DOM (test/SSR) environment.
 */
export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'vf-theme';
const DEFAULT_THEME: Theme = 'dark';

const listeners = new Set<() => void>();
let current: Theme = DEFAULT_THEME;

function hasDom(): boolean {
  return typeof document !== 'undefined' && document.documentElement != null;
}

function readStored(): Theme | null {
  try {
    const value = globalThis.localStorage?.getItem(STORAGE_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null; // private mode / disabled storage — fall back to system/default
  }
}

function systemPrefersLight(): boolean {
  try {
    return globalThis.matchMedia?.('(prefers-color-scheme: light)').matches ?? false;
  } catch {
    return false;
  }
}

/** Resolve the theme to use on first paint: explicit stored choice, else system, else dark. */
export function resolveInitialTheme(): Theme {
  return readStored() ?? (systemPrefersLight() ? 'light' : DEFAULT_THEME);
}

/** Apply a theme to the DOM (sets `data-theme`) without persisting or notifying. */
function reflectToDom(theme: Theme): void {
  if (hasDom()) document.documentElement.dataset.theme = theme;
}

/**
 * Initialize the store from the DOM/storage. Idempotent; call once at startup.
 * Reads the attribute a no-FOUC boot script may already have set, else resolves.
 */
export function initTheme(): Theme {
  const fromDom = hasDom() ? document.documentElement.dataset.theme : undefined;
  current = fromDom === 'dark' || fromDom === 'light' ? fromDom : resolveInitialTheme();
  reflectToDom(current);
  return current;
}

export function getTheme(): Theme {
  return current;
}

export function setTheme(theme: Theme): void {
  if (theme === current) return;
  current = theme;
  reflectToDom(theme);
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, theme);
  } catch {
    // ignore persistence failures (private mode); the in-memory choice still applies
  }
  for (const listener of listeners) listener();
}

export function toggleTheme(): void {
  setTheme(current === 'dark' ? 'light' : 'dark');
}

/** Subscribe to theme changes; returns an unsubscribe fn (for useSyncExternalStore). */
export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The current dot-grid colour for the canvas, read from the `--canvas-grid` CSS
 * variable so the palette stays defined in one place (the stylesheet). The
 * `theme` argument is unused at runtime but makes call sites re-read on change.
 */
export function canvasGridColor(_theme: Theme): string {
  if (!hasDom()) return '#d1d5db';
  const value = getComputedStyle(document.documentElement).getPropertyValue('--canvas-grid');
  return value.trim() || '#d1d5db';
}
