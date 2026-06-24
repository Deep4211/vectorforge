# @vectorforge/geometry

> Layer: **domain** · Implementation: **Sprint 1**

The pure, dependency-free geometry & mathematics engine. Every other system
(renderer, hit-testing, marquee, guides, rulers, minimap) resolves coordinates
through this single source of truth (ARCHITECTURE.md §6).

## Responsibilities

- Immutable value objects: `Vector2`, `Matrix3` (2D affine), `Rect`, `BoundingBox`, `Transform`.
- Translation / rotation / scaling and matrix composition/inversion.
- The world ↔ viewport ↔ screen coordinate pipeline (`screenToWorld`, `worldToScreen`).
- Numeric robustness: NaN/Infinity rejection, rotation normalization, radius clamping.
- Allocation-free `*Into(out)` variants for hot-path loops.

## Public API

Re-exported from [`src/index.ts`](./src/index.ts).

## Dependency rules

|               |                                      |
| ------------- | ------------------------------------ |
| May import    | _nothing_ (`@vectorforge/*`)         |
| Imported by   | document, commands, editor, renderer |
| React allowed | ❌ no                                |

See [docs/ENGINE_CONTRACT.md §6](../../docs/ENGINE_CONTRACT.md).
