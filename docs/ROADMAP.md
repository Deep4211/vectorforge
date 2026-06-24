# VectorForge — Engineering Roadmap

|                  |                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| **Status**       | Living plan                                                                                            |
| **Derived from** | [PRD.md](./PRD.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [ENGINE_CONTRACT.md](./ENGINE_CONTRACT.md) |
| **Granularity**  | Build order from foundation to a usable V1 editor, then performance + advanced features                |

This roadmap sequences construction so each sprint produces an independently
**testable** layer that the next sprint builds on. The hard rule from the PRD
holds throughout: **the MVP must be a fully usable single-player editor**;
collaboration, components, and handoff layer on without re-architecting the core.

Dependency build order (bottom-up):

```
Sprint 1 geometry → Sprint 2 document → Sprint 3 commands → Sprint 4 editor
   → Sprint 5 renderer → Sprint 6 interaction → Sprint 7 ui → Sprint 8 persistence
      → Sprint 9 performance → Sprint 10 advanced features
```

Each sprint lists **Goals**, **Deliverables**, **Acceptance criteria**, and
**Testing requirements**. The global testing bar (per the repo testing rules)
is **≥ 80% coverage** on `geometry`, `document`, `commands`, and `editor`, with
TDD for new domain logic.

---

## Sprint 0 — Repository Foundation ✅ (complete)

**Goals.** Stand up a production-grade monorepo that can support years of
development, with mechanically-enforced architectural boundaries.

**Deliverables.**

- pnpm workspace; 8 packages (`shared`, `geometry`, `document`, `commands`,
  `editor`, `renderer`, `persistence`, `ui`) + `apps/web`.
- TypeScript strict base config + project references.
- ESLint (flat) with per-package dependency-boundary + React-ban rules;
  Prettier; commitlint; Husky pre-commit and commit-msg hooks; lint-staged.
- Vitest (Node + jsdom projects) + Testing Library; coverage via v8.
- Guardrail scripts (`check-boundaries`, `check-package-standards`).
- CI workflow (install → format → lint → typecheck → boundaries → test → build).
- Docs: README, ENGINE_CONTRACT, ROADMAP, PRD, ARCHITECTURE; per-package READMEs.

**Acceptance criteria.**

- `pnpm install && pnpm validate` passes from a clean clone.
- A forbidden import (e.g. React in `geometry`, or `editor` in `document`) fails
  `pnpm lint` and `pnpm check:boundaries`.
- `pnpm dev` boots the app; `pnpm build:web` produces a bundle.

**Testing requirements.** A smoke test per package; an `<App />` render test
that proves the dependency graph resolves. Toolchain itself is the deliverable.

---

## Sprint 1 — Geometry Engine ✅ (complete)

> Delivered: `Vector2`, `Matrix3`, `Rectangle` (`Rect`), `BoundingBox`,
> `Transform`, scalar numeric-safety helpers, and the world ↔ screen coordinate
> pipeline (`screenToWorld` / `worldToScreen` / `viewportMatrix` /
> `zoomViewportAt`). Pure, immutable, zero-dependency; 100% line/branch/function
> coverage; seeded property tests; micro-benchmarks (`pnpm bench`).

**Goals.** Implement the pure math foundation every subsystem depends on
(ARCHITECTURE.md §6). PRD: CAN-001/003, TRN, GUI.

**Deliverables.**

- `Vector2`, `Matrix3` (2D affine), `Rect`, `BoundingBox`, `Transform` as
  immutable value objects with value equality.
- Composition/inversion; translate/rotate/scale; `decompose()`.
- Coordinate pipeline helpers: `screenToWorld`, `worldToScreen`, `worldMatrixOf`.
- Numeric-safety utilities (clamp radius, normalize rotation, reject NaN/∞).
- Allocation-free `*Into(out)` variants for the hot path.

**Acceptance criteria.**

- All primitives immutable; no method mutates its receiver.
- Cursor-anchored zoom math keeps the world point under the cursor fixed.
- Conforms to ENGINE_CONTRACT DOC-11.

**Testing requirements.**

- Unit + **property-based** tests: `invert(m) ∘ m = identity`, compose
  associativity, `screen→world→screen` round-trips within ε.
- 100% line coverage target for `geometry` (it is small and foundational).

---

## Sprint 2 — Document Model & Scene Graph ✅ (complete)

> Delivered: the `BaseNode` discriminated-union hierarchy (Frame, Group,
> Rectangle, Ellipse, Line, Text, Image), the id-indexed `SceneGraph` (immutable
> nodes in a mutable, versioned container), traversal (render/hit order,
> descendants/ancestors, render/outline tree), z-order ops, cycle-checked
> reparent, remove/restore for undo, computed effective lock/visibility, cached
> world matrices/bounds, and deterministic validated serialization. ~99% line
> coverage. Scoped out (documented): the virtual-group overlay (Sprint 7), the
> full `.vf` envelope (Sprint 8), ComponentInstance nodes (V2).

**Goals.** The authoritative document model (ARCHITECTURE.md §5; PRD §9, F-3).

**Deliverables.**

- `BaseNode` + subclasses (Frame, Group, Rectangle, Ellipse, Line, Text, Image).
- Id-indexed scene graph (`Map<NodeId, Node>` + parent/child links).
- Authoritative graph vs. virtual groups; `renderTree()` / `outlineTree()`.
- Traversal (render order, reverse-z hit order, memoized flatten), z-order ops,
  world-matrix caching with dirty propagation.
- `toJSON`/`fromJSON` with deterministic key ordering; integrity validation.

**Acceptance criteria.**

- Satisfies DOC-1 … DOC-11.
- Reparent rejects cycles; lock cascades to descendants and restores on unlock.
- Round-trip serialization is byte-stable.

**Testing requirements.**

- Unit tests for add/remove/reparent integrity, z-order, traversal order,
  lock/visibility cascade, virtual-vs-real separation.
- Serialization round-trip + determinism tests. ≥ 80% coverage.

---

## Sprint 3 — Command System & History

**Goals.** The sole mutation pathway + undo/redo (ARCHITECTURE.md §10; PRD F-7).

**Deliverables.**

- `ICommand` contract; commands: Create, Delete, Move, Resize, SetProperty,
  Reorder, Group/Ungroup, Reparent, `CompositeCommand`.
- `HistoryManager` (undo/redo stacks, redo invalidation, bounded depth).
- Gesture coalescing + command merging; `toOp()` lowering scaffold.

**Acceptance criteria.**

- Satisfies CMD-1 … CMD-8.
- `undo(execute(d)) === d` (deep-equal) for every command, including
  delete-with-subtree and group/ungroup, restoring prior selection.

**Testing requirements.**

- Property-based invertibility tests across randomized documents.
- Coalescing/merge tests; redo-clear-on-new-edit; composite atomicity.
  ≥ 80% coverage.

---

## Sprint 4 — Editor Core & State Management

**Goals.** The framework-independent application layer (ARCHITECTURE.md §4).

**Deliverables.**

- `EditorStore` (document + ephemeral state, synchronous reads, fine-grained
  selector subscriptions).
- `EditorController` (intentions → commands; lifecycle).
- Tool state machine (Move/Frame/Rect/Ellipse/Text/Hand) — pointer-handling
  contracts (no DOM yet; driven by synthetic `EngineInput`).
- Viewport (pan/zoom) and selection models; render-scheduler interface.

**Acceptance criteria.**

- Satisfies EDT-1 … EDT-8. Runs fully **headless** in Node (no React, no DOM).
- A scripted intention sequence produces the expected command log + state.

**Testing requirements.**

- Integration tests: intention → command → model → scheduled-render-call, with
  a recording mock renderer; selection/primary reassignment; tool gesture
  lifecycle + cancellation. ≥ 80% coverage.

---

## Sprint 5 — Rendering Engine

**Goals.** Paint the document at 60 FPS (ARCHITECTURE.md §7; PRD F-1, §11.1).

**Deliverables.**

- `IRenderer` port + `RenderScene` projection.
- `CanvasRenderer` (Canvas 2D): frames, shapes, text, gradients, shadows.
- rAF-coalesced scheduler; viewport culling; dirty-rectangle rendering;
  high-DPI backing store; rulers/dot-grid/overlay layers.

**Acceptance criteria.**

- Satisfies RND-1 … RND-9.
- Reference document renders correctly; backend swap requires no feature changes.

**Testing requirements.**

- Logical render tests (correct culled, z-sorted display list per viewport).
- Playwright screenshot-diff regression on the reference document across
  Chromium/Firefox/WebKit.

---

## Sprint 6 — Interaction System

**Goals.** Connect real pointer/keyboard input to the editor (ARCHITECTURE.md
§8–§9; PRD F-2, F-4, F-5, F-6, §8.9).

**Deliverables.**

- Pointer Events normalization (mouse/trackpad/pen) → `EngineInput`.
- Hit-testing (broad-phase index + narrow-phase geometry, front-to-back),
  hover, cursor management.
- Selection (click/shift/marquee), transform handles + dimension badge,
  modifier system (Shift aspect/axis-lock, Alt center/duplicate, Space pan),
  smart alignment guides; keyboard shortcuts + command palette.

**Acceptance criteria.**

- PRD selection/transform/guide edge cases handled (marquee normalization, drag
  threshold, locked nodes, cross-artboard select, overlapping-click cycling).
- Shortcuts respect the input-focus and IME guards.

**Testing requirements.**

- Integration tests with synthetic pointer/keyboard streams; hit-test unit
  tests (overlap order, rotated geometry); E2E for marquee + transform + nudge.

---

## Sprint 7 — UI Integration

**Goals.** Build the React chrome and bind it to the store (ARCHITECTURE.md §4.2,
PRD §10; against the approved high-fidelity UI design provided as the project's
source-of-truth design file). PRD F-9, F-10, IA §10.

**Deliverables.**

- `@vectorforge/ui` components: toolbar, left panel (Layers/Assets/Pages), right
  inspector (empty/single/multi modes), bottom dock, command palette, context
  menu, zoom pill, minimap shell.
- `useEditorSelector` store binding via `useSyncExternalStore`; Tailwind theme
  from the design tokens.
- `apps/web` composition root wiring editor + renderer + persistence + ui.

**Acceptance criteria.**

- Satisfies UI-1 … UI-6. No business logic in components; pan does not re-render
  the inspector. Keyboard-only operability (WCAG 2.2 AA) for core flows.

**Testing requirements.**

- Component tests (Testing Library) for inspector modes, layer tree a11y roles,
  palette focus trap; E2E for the create→edit→inspect flow.

---

## Sprint 8 — Persistence & File Format

**Goals.** Durability, autosave, and the `.vf` format (ARCHITECTURE.md §11, §14;
PRD F-8, §9.3, §11.4).

**Deliverables.**

- IndexedDB adapter (documents, autosave, offline op-queue, asset blobs);
  localStorage prefs adapter.
- Debounced diff-based autosave with status state machine; crash/offline
  recovery + last-known-good snapshots.
- `.vf` reader/writer: schema validation, sequential idempotent migrations;
  PNG export of a frame (MVP). `vfcli` validate/migrate/inspect.

**Acceptance criteria.**

- Round-trip `.vf` is lossless and deterministic; corrupted/unknown-version
  files open read-only with recovery, never silent overwrite.
- Multi-tab writer lock prevents concurrent-write corruption.

**Testing requirements.**

- Round-trip + determinism tests; corrupted/versioned fixture loading; migration
  fixtures (1.0→current); autosave debounce + offline-queue flush integration.

---

## Sprint 9 — Performance Optimization

**Goals.** Meet the PRD performance contract at scale (ARCHITECTURE.md §12;
PRD §11.1).

**Deliverables.**

- Spatial index (loose quadtree/grid) for culling + hit-test broad phase.
- Object pooling + allocation-free hot paths; layer caching (`OffscreenCanvas`).
- Layer-tree virtualization; event throttling/coalescing; progressive load.
- Perf benchmark harness + CI perf-regression gate.

**Acceptance criteria (measurable, PRD §11.1).**

- 60 FPS interaction; p95 paint ≤ 8 ms on the reference doc; 10,000+ nodes
  smooth; selection < 16 ms; transform < 16 ms/frame; undo/redo < 50 ms;
  TTI < 2 s; ~0 hot-path allocation.

**Testing requirements.**

- Playwright + CDP FPS/paint benchmarks; heap-profile allocation assertions;
  10k/50k-node stress fixtures gating CI.

---

## Sprint 10 — Advanced Editor Features

**Goals.** Begin the V2/V3 layers the V1 seams were built for (ARCHITECTURE.md
§15). Scheduled per product priority; each is additive.

**Deliverables (candidate, prioritized per PRD release matrix).**

- Components (variants/states/properties) + Assets library (V2, F-13/F-14).
- Multi-select align/distribute; Pages (V2, F-15).
- Dev handoff (measurements + generated CSS + copy) (V3, F-16).
- Version history + restore; export expansion (SVG/PDF); console; device
  preview (V3, F-17/F-18).
- Foundations for real-time collaboration: wire the `toOp()` log to a
  `@vectorforge/sync` package (CRDT/OT), presence, comments (V3, F-11/F-12).

**Acceptance criteria.**

- Each feature attaches at an existing port or reserved schema field with **no**
  change to `geometry`, the `BaseNode` base schema, or the command pathway
  (ARCHITECTURE.md §15.4).

**Testing requirements.**

- Per-feature unit + integration + E2E; component propagation tests; CSS-output
  fidelity tests; (for sync) convergence + per-user-undo tests.

---

### Cross-sprint definition of done

A sprint is done when, on a clean clone: `pnpm validate` passes, coverage gates
hold, the relevant ENGINE_CONTRACT invariants have explicit tests, the affected
package READMEs are updated, and (from Sprint 5) Playwright suites are green
across the supported browser matrix.
