/**
 * `@vectorforge/renderer` — public API entry.
 *
 * Rendering infrastructure: the `IRenderer` port, the Canvas2D renderer (V1),
 * the render queue, viewport culling and dirty-region scheduling
 * (ARCHITECTURE.md §7). Implemented in Sprint 5 (see docs/ROADMAP.md).
 *
 * Until then this entry exports only the package identity so the build, lint
 * and test toolchain can be validated end to end.
 */
export const PACKAGE_ID = '@vectorforge/renderer' as const;

/** Architectural layer (see docs/ENGINE_CONTRACT.md §6). */
export const LAYER = 'infrastructure' as const;
