/**
 * `@vectorforge/editor` — public API entry.
 *
 * Editor core (application layer): the EditorController, the framework-agnostic
 * EditorStore, the tool state machine, the interaction engine, viewport and
 * selection (ARCHITECTURE.md §4). Implemented in Sprint 4 (see docs/ROADMAP.md).
 *
 * Until then this entry exports only the package identity so the build, lint
 * and test toolchain can be validated end to end.
 */
export const PACKAGE_ID = '@vectorforge/editor' as const;

/** Architectural layer (see docs/ENGINE_CONTRACT.md §6). */
export const LAYER = 'application' as const;
