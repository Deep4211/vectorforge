/**
 * `@vectorforge/document` — public API entry.
 *
 * Document model & scene graph: the BaseNode hierarchy, the id-indexed scene
 * graph, the `.vf` schema, and (de)serialization (ARCHITECTURE.md §5).
 * Implemented in Sprint 2 (see docs/ROADMAP.md).
 *
 * Until then this entry exports only the package identity so the build, lint
 * and test toolchain can be validated end to end.
 */
export const PACKAGE_ID = '@vectorforge/document' as const;

/** Architectural layer (see docs/ENGINE_CONTRACT.md §6). */
export const LAYER = 'domain' as const;
