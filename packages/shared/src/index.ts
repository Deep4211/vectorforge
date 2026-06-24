/**
 * `@vectorforge/shared` — public API entry.
 *
 * Cross-cutting primitives depended on by every layer: stable id generation,
 * the `Result` type, a typed event emitter, assertion helpers, the logger, and
 * the framework-agnostic port interfaces (IClock, IdGenerator, …). These land
 * incrementally alongside Sprints 1–4 (see docs/ROADMAP.md).
 *
 * Until then this entry exports only the package identity so the build, lint
 * and test toolchain can be validated end to end.
 */
export const PACKAGE_ID = '@vectorforge/shared' as const;

/** Architectural layer (see docs/ENGINE_CONTRACT.md §6). */
export const LAYER = 'cross-cutting' as const;
