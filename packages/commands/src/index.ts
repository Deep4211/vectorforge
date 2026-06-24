/**
 * `@vectorforge/commands` — public API entry.
 *
 * Command & history architecture: the `ICommand` contract, concrete commands,
 * the HistoryManager (undo/redo), and the serializable op-log that V3
 * collaboration composes with (ARCHITECTURE.md §10). Implemented in Sprint 3
 * (see docs/ROADMAP.md).
 *
 * Until then this entry exports only the package identity so the build, lint
 * and test toolchain can be validated end to end.
 */
export const PACKAGE_ID = '@vectorforge/commands' as const;

/** Architectural layer (see docs/ENGINE_CONTRACT.md §6). */
export const LAYER = 'domain' as const;
