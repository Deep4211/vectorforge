# @vectorforge/geometry

> Layer: **domain** · Status: **implemented (Sprint 1)** · Dependencies: **none**

The pure, dependency-free geometry & mathematics engine — the single source of
truth for every coordinate, transform, and bounds computation in VectorForge
(renderer, hit-testing, marquee, smart guides, rulers, minimap). See
[ARCHITECTURE.md §6](../../docs/ARCHITECTURE.md) and
[ENGINE_CONTRACT.md DOC-11](../../docs/ENGINE_CONTRACT.md).

## Principles

- **Immutable value objects.** Every operation returns a new instance; nothing
  mutates `this` or its inputs. The only exceptions are the explicit
  allocation-free `*Into(out)` variants, which mutate **only** the caller's
  output object.
- **Zero dependencies.** No `@vectorforge/*` packages, no React, no DOM/browser
  APIs. Portable to a Web Worker or a future WASM kernel.
- **Degrees everywhere.** All public angles are in degrees (consistent with
  `Transform.rotation`, the inspector, and the PRD). `degToRad`/`radToDeg` are
  provided for callers working in radians.
- **Numerically robust.** Helpers reject/clamp `NaN`/`Infinity`, normalize
  rotation to `[0, 360)`, and clamp corner radii to ≤ half the shorter side.

## Public API

Import only from the package entry — never a deep path (ENGINE_CONTRACT §6 DEP-5).

| Export                                                                                                                        | Kind      | Summary                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Vector2`                                                                                                                     | class     | 2D vector/point: `add` `subtract`/`sub` `multiply` `divide` `scale` `negate` `dot` `cross` `magnitude`/`length` `distanceTo` `normalize` `rotate` `lerp` `equals`; static `addInto`/`subtractInto`                 |
| `Matrix3`                                                                                                                     | class     | 2D affine `[a,b,c,d,e,f]`: `translation` `scaling` `rotation` `multiply` `translate` `scale` `rotate` `determinant` `invert`/`tryInvert` `transformPoint`/`transformPointInto` `decompose` `toArray` `toCSSMatrix` |
| `Rectangle` (alias `Rect`)                                                                                                    | class     | `x,y,w,h`: `left/right/top/bottom` `center` `corners` `area` `contains` `containsRect` `intersects` `intersection` `union` `inflate` `translate` `normalize`                                                       |
| `BoundingBox`                                                                                                                 | class     | AABB `minX,minY,maxX,maxY`: `fromPoints` `fromRect` `fromBoxes` `contains` `containsBox` `intersects` `intersection` `union` `expandToInclude` `inflate` `transform` `toRectangle`                                 |
| `Transform`                                                                                                                   | class     | `{ position, rotation°, scale }` → `toMatrix()` / `fromMatrix()`; `with*` copy helpers                                                                                                                             |
| `Point`, `MutablePoint`, `RectLike`, `BoxLike`                                                                                | types     | structural interfaces for interop                                                                                                                                                                                  |
| `Viewport`, `worldToScreen`, `screenToWorld`, `viewportMatrix`, `zoomViewportAt`, `MIN_ZOOM`, `MAX_ZOOM`                      | mixed     | the world ↔ screen coordinate pipeline                                                                                                                                                                             |
| `clamp`, `lerp`, `approxEqual`, `degToRad`, `radToDeg`, `normalizeRotation`, `clampCornerRadius`, `isFiniteNumber`, `EPSILON` | functions | scalar / numeric-safety utilities                                                                                                                                                                                  |

### Conventions

`Matrix3` stores a 2D affine as six numbers — exactly the
`ctx.setTransform(a, b, c, d, e, f)` / `DOMMatrix` layout — so `toArray()` feeds
the Canvas2D renderer directly:

```
| a  c  e |     x' = a·x + c·y + e
| b  d  f |     y' = b·x + d·y + f
| 0  0  1 |
```

`m.multiply(n)` returns `m · n`, which applies `n` **first**, then `m`:
`m.multiply(n).transformPoint(p) === m.transformPoint(n.transformPoint(p))`.
`Transform.toMatrix()` builds `translation · rotation · scaling` (a point is
scaled, then rotated, then translated).

ARCHITECTURE §6.1 also lists `Vector2.transformBy(m)` and `Matrix3.transformRect(r)`;
to keep the package's import graph acyclic these are provided as
`Matrix3.transformPoint(v)` and `BoundingBox.transform(m)` respectively.

## Usage

```ts
import {
  Matrix3,
  Vector2,
  Rectangle,
  BoundingBox,
  Transform,
  screenToWorld,
} from '@vectorforge/geometry';

// Vectors (immutable)
const a = new Vector2(3, 4);
a.magnitude(); // 5
a.add({ x: 1, y: 1 }); // Vector2(4, 5) — `a` is unchanged

// Transforms compose; feed straight to a canvas
const m = Matrix3.translation(100, 50).rotate(30).scale({ x: 2, y: 2 });
m.transformPoint({ x: 10, y: 0 }); // Vector2(...)
const inv = m.invert(); // undo it
// ctx.setTransform(...m.toArray());

// Node transform ⇄ matrix
const t = new Transform(new Vector2(100, 50), 30, new Vector2(2, 2));
Transform.fromMatrix(t.toMatrix()).equals(t); // true (round-trips)

// Bounds & hit-testing
const r = new Rectangle(0, 0, 200, 100);
r.contains({ x: 50, y: 50 }); // true
const worldAabb = BoundingBox.fromRect(r).transform(m); // rotated → world AABB

// Coordinate pipeline (renderer / interaction)
const viewport = { panX: 90, panY: 46, zoom: 0.82 };
const world = screenToWorld({ x: 400, y: 300 }, viewport);
```

## Performance

The immutable API is the default. For per-frame inner loops that transform many
points, the allocation-free variants avoid creating garbage:

```ts
const out = { x: 0, y: 0 }; // reused scratch object
for (const p of manyPoints) {
  view.transformPointInto(out, p); // no allocation
  // …consume out.x, out.y…
}
```

> Benchmarks (`pnpm bench`) show that at micro-scale V8's escape analysis makes
> the immutable path comparable to (even marginally faster than) the `*Into`
> variants; the allocation-free path is intended to remove GC pressure across
> the thousands-of-points-per-frame workloads that the renderer (Sprint 5) and
> hit-testing (Sprint 6) will drive.

## Testing

```bash
pnpm --filter @vectorforge/geometry test   # (or `pnpm test` from the root)
pnpm test:coverage                          # geometry is held at 100% line/branch/function
pnpm bench                                   # micro-benchmarks
```

Tests include hand-checked unit cases plus seeded, deterministic **property**
tests: matrix associativity, `M · M⁻¹ = I`, `Transform ⇄ Matrix3` round-trips,
and the cursor-anchored-zoom invariant.

## Dependency rules

|               |                                      |
| ------------- | ------------------------------------ |
| May import    | _nothing_ (`@vectorforge/*`)         |
| Imported by   | document, commands, editor, renderer |
| React allowed | ❌ no                                |

See [docs/ENGINE_CONTRACT.md §6](../../docs/ENGINE_CONTRACT.md).
