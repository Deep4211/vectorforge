import { useSyncExternalStore } from 'react';
import type { EditorState } from '@vectorforge/editor';
import { useStore } from '../context';

export type EditorSelector<T> = (state: Readonly<EditorState>) => T;

/**
 * Subscribe a component to a derived slice of editor state (UI-3). Backed by
 * `useSyncExternalStore` over the store's fine-grained `subscribe`, so a pan
 * does not re-render a selection-only consumer.
 *
 * The selector MUST return a stable reference for unchanged state (return a
 * state slice, not a freshly built object/array) — `getSnapshot` is compared by
 * `Object.is`, matching the store's own change detection.
 */
export function useEditorSelector<T>(selector: EditorSelector<T>): T {
  const store = useStore();
  return useSyncExternalStore(
    (onChange) => store.subscribe(selector, onChange),
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}

/** Document-change counter; gate scene-derived view models (outline/inspection) on it. */
export function useDocumentVersion(): number {
  return useEditorSelector((state) => state.documentVersion);
}
