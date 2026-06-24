/**
 * `@vectorforge/geometry` — public API entry.
 *
 * Geometry & mathematics engine: Vector2, Matrix3, Rect, BoundingBox, and the
 * world ↔ viewport ↔ screen coordinate pipeline (ARCHITECTURE.md §6).
 * Implemented in Sprint 1 (see docs/ROADMAP.md).
 *
 * Until then this entry exports only the package identity so the build, lint
 * and test toolchain can be validated end to end.
 */
export const PACKAGE_ID = '@vectorforge/geometry' as const;

/** Architectural layer (see docs/ENGINE_CONTRACT.md §6). */
export const LAYER = 'domain' as const;
