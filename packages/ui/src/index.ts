/**
 * `@vectorforge/ui` — public API entry.
 *
 * Presentation layer: the React component library for the editor chrome —
 * toolbar, layers/assets/pages panels, inspector, command palette, docks — plus
 * the hooks that bind React to the EditorStore (ARCHITECTURE.md §4.2). This is
 * the ONLY package besides apps/web permitted to import React. Implemented in
 * Sprint 7 (see docs/ROADMAP.md).
 *
 * Until then this entry exports only the package identity so the build, lint
 * and test toolchain can be validated end to end.
 */
export const PACKAGE_ID = '@vectorforge/ui' as const;

/** Architectural layer (see docs/ENGINE_CONTRACT.md §6). */
export const LAYER = 'presentation' as const;
