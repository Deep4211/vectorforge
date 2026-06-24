/**
 * `@vectorforge/persistence` — public API entry.
 *
 * Persistence infrastructure: IndexedDB/localStorage adapters, debounced
 * diff-based autosave, the `.vf` reader/writer, schema migrations and offline
 * recovery (ARCHITECTURE.md §11, §14). Implemented in Sprint 8
 * (see docs/ROADMAP.md).
 *
 * Until then this entry exports only the package identity so the build, lint
 * and test toolchain can be validated end to end.
 */
export const PACKAGE_ID = '@vectorforge/persistence' as const;

/** Architectural layer (see docs/ENGINE_CONTRACT.md §6). */
export const LAYER = 'infrastructure' as const;
