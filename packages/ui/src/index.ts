/**
 * `@vectorforge/ui` — public API entry.
 *
 * Presentation layer (ENGINE_CONTRACT.md §4 UI-1..6): the React chrome and the
 * hooks that bind it to the `EditorStore`. The ONLY package besides `apps/web`
 * permitted to import React. Components hold no business logic — they render
 * store-derived view models and dispatch intentions (UI-2); the `<canvas>` is
 * engine-owned via the injected {@link CanvasEngine} port (UI-4/UI-5).
 *
 * Import only through this entry (ENGINE_CONTRACT.md §6 DEP-5).
 */

// Engine port + store binding
export type { CanvasEngine } from './engine';
export { EditorProvider, useEngine, useController, useStore } from './context';
export {
  useEditorSelector,
  useDocumentVersion,
  type EditorSelector,
} from './hooks/use-editor-selector';
export { useGlobalKeyboard } from './hooks/use-keyboard';

// Input normalization (DOM → engine)
export { toEngineInput, toKeyInput } from './input/normalize';

// Chrome components
export { EditorShell } from './components/EditorShell';
export { Toolbar } from './components/Toolbar';
export { CanvasStage } from './components/CanvasStage';
export { LayersPanel } from './components/LayersPanel';
export { Inspector } from './components/Inspector';
export { ZoomControls } from './components/ZoomControls';
export { CommandPalette } from './components/CommandPalette';

/** Package identity (stable across the project; consumed by the app shell). */
export const PACKAGE_ID = '@vectorforge/ui' as const;

/** Architectural layer (see docs/ENGINE_CONTRACT.md §6). */
export const LAYER = 'presentation' as const;
