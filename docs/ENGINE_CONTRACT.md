# VectorForge — Engine Contract

|                  |                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| **Status**       | Binding engineering contract                                                                                  |
| **Derived from** | [PRD.md](./PRD.md) · [ARCHITECTURE.md](./ARCHITECTURE.md)                                                     |
| **Scope**        | Invariants every package, sprint, and pull request must uphold                                                |
| **Enforcement**  | ESLint boundaries · `scripts/check-boundaries.mjs` · `scripts/check-package-standards.mjs` · CI · code review |

This document defines the **invariants** — the properties that must hold true at
all times, regardless of which feature is being built. Architecture (in
ARCHITECTURE.md) explains _how_ the system is shaped; this contract states the
rules that shape must never violate. Invariant IDs are stable for traceability
in code review and tests.

The key words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are used in the
RFC 2119 sense.

---

## 1. Document invariants

The document model (`@vectorforge/document`) is the single source of truth. All
other state is a projection of it.

- **DOC-1 — Single source of truth.** The scene graph is the only authoritative
  representation of document content. The renderer, inspector, layer panel,
  export, and (future) sync layers MUST derive from it and MUST NOT hold a
  competing copy of document state.
- **DOC-2 — Mutation only via commands.** Document content MUST NOT be mutated
  except through a command executed by the history manager (see §3). No
  setter, tool, React component, or renderer may mutate a node directly.
- **DOC-3 — Stable identity.** Every node has a stable, unique `id` that
  survives moves, renames, reparents, and serialization round-trips. Comments,
  components, selection, and history reference nodes by `id`, never by position
  or array index.
- **DOC-4 — Common base schema.** Every node carries the common fields defined
  in PRD §9.2 (`id`, `name`, `transform`, `visibility`, `locking`, `zIndex`,
  `metadata`). Type-specific fields extend — never replace — this base.
- **DOC-5 — Local coordinates.** Children store coordinates **local** to their
  parent. World position resolves through the chain of parent transforms. The
  inspector displays local coordinates; canvas overlays use world coordinates.
- **DOC-6 — Containment is a tree.** The authoritative scene graph is an acyclic
  containment tree (Document → Page → Frame → Group → Layer → Shape/Text/Image).
  Reparenting MUST NOT create a cycle.
- **DOC-7 — Virtual groups are not transform parents.** Logical "virtual groups"
  used only to organize the layer panel MUST be representable distinctly from
  authoritative container nodes; the renderer and transform cascade MUST ignore
  virtual groups.
- **DOC-8 — Non-empty names.** A node name MUST NOT be empty; renaming to empty
  is rejected or falls back to a per-type default.
- **DOC-9 — Deterministic serialization.** Serialization MUST be deterministic
  (stable key ordering) so files diff cleanly and snapshots are reproducible.
  A `serialize → deserialize` round trip MUST reproduce the document exactly.
- **DOC-10 — Validate on load.** Any document loaded from outside the running
  process (a `.vf` file, the network) MUST be validated against its schema
  before use. Invalid input fails safe (read-only / recovery), never a silent
  partial load (PRD §8.1, §9.3).
- **DOC-11 — Numeric sanity.** `NaN`/`Infinity` are rejected; scale is non-zero
  (negative flips, never collapses); rotation is normalized to `[0, 360)`;
  corner radius is clamped to ≤ half the shorter side.

---

## 2. Rendering invariants

The renderer (`@vectorforge/renderer`) is a pure consumer of the document.

- **RND-1 — Read-only.** The renderer MUST NOT mutate the document model or
  editor state. It consumes a `RenderScene` projection and produces pixels.
- **RND-2 — Renderer is a port.** All rendering goes through the `IRenderer`
  interface. Feature code MUST NOT call Canvas2D (or any backend) APIs
  directly. A backend swap (Canvas2D → WebGL/WebGPU) MUST require zero changes
  outside `@vectorforge/renderer`.
- **RND-3 — Single view transform.** World content is positioned by exactly one
  transform `translate(panX, panY) · scale(zoom)`. Per-node layout MUST NOT run
  on pan/zoom.
- **RND-4 — Frame budget.** Interaction (pan, zoom, drag, resize) MUST sustain
  60 FPS; p95 frame paint on the reference document MUST be ≤ 8 ms (PRD §11.1).
- **RND-5 — Coalesced frames.** All draw requests funnel through a single
  rAF-coalesced scheduler. Many mutations in one tick produce at most one paint.
  No code path may call the renderer's draw method synchronously per mutation.
- **RND-6 — Cull, don't drop.** Off-screen nodes are skipped during paint
  (viewport culling) but remain fully present in the model and the selection
  set. Culling affects rendering only — never logical state (PRD §8.1).
- **RND-7 — No hot-path allocation.** Pan/zoom/drag inner loops MUST NOT
  allocate per frame; geometry uses pre-allocated scratch buffers (PRD §11.1).
- **RND-8 — High-DPI correctness.** Rendering accounts for `devicePixelRatio`;
  output stays crisp on retina and exports at selectable scale (1×/2×/3×).
- **RND-9 — Determinism.** Given the same `RenderScene` and viewport, a renderer
  produces the same pixels (enables screenshot regression testing).

---

## 3. Command invariants

The command system (`@vectorforge/commands`) is the sole mutation pathway.

- **CMD-1 — Invertibility.** Every command implements `execute`, `undo`, and
  `redo`. For any command `c` applied to document state `d`,
  `c.undo(c.execute(d))` MUST restore `d` exactly (deep-equal), including tree
  structure, z-order, and (where captured) selection.
- **CMD-2 — Total coverage.** Every operation that changes document content is
  expressed as a command. There is no "back door" mutation.
- **CMD-3 — Gesture coalescing.** A continuous gesture (drag-move, drag-resize,
  slider drag) produces exactly **one** history entry on commit, not one per
  frame (PRD HIS-003).
- **CMD-4 — Redo invalidation.** Executing a new command after an undo clears
  the redo stack (PRD HIS-005).
- **CMD-5 — Atomic composites.** Multi-step operations (group, ungroup,
  multi-delete, align) are a single `CompositeCommand` — one undo step.
- **CMD-6 — Bounded history.** History depth is capped; eviction releases the
  memory a command retained (e.g. a deleted subtree). Commands store minimal
  diffs, not full-document snapshots.
- **CMD-7 — Determinism.** Commands depend only on their captured payload and an
  injected context (clock, id generator). They MUST NOT read ambient globals,
  wall-clock time, or randomness directly.
- **CMD-8 — Serializable ops.** Every command can lower to a serializable op
  (`toOp()`) so the V3 sync layer composes with it without re-architecting the
  core. Undo is local-intent (per-user) under future multiplayer.

---

## 4. Editor state invariants

The editor core (`@vectorforge/editor`) owns ephemeral state and orchestration.

- **EDT-1 — Framework independence.** `@vectorforge/editor` and every package it
  depends on MUST NOT import React (or any UI framework). The editor runs
  headless in Node for tests (ARCHITECTURE.md §1.5). Enforced by ESLint.
- **EDT-2 — Document vs. ephemeral split.** Editor state is partitioned into
  **document state** (persisted; mutated only by commands) and **ephemeral
  state** (selection, viewport, active tool, hover, marquee, interaction phase;
  not persisted). Ephemeral state changes MUST NOT mark the document dirty.
- **EDT-3 — Single write path.** All state writes go through the store's
  dispatch/commit path. UI code MUST NOT mutate store state directly; it
  dispatches intentions.
- **EDT-4 — Controller builds commands.** The `EditorController` translates
  intentions into commands and submits them to the history manager. It MUST NOT
  mutate the document itself.
- **EDT-5 — Synchronous reads for the hot path.** The store exposes a
  synchronous snapshot read so the interaction/render hot path never waits on
  React. React subscribes via fine-grained selectors only.
- **EDT-6 — Selection model.** Selection is a set of node ids plus a
  `primaryId`. It is lock-aware (locked nodes are never selected), and it drives
  canvas overlays, layer-tree highlight, and inspector mode simultaneously and
  consistently.
- **EDT-7 — Tools don't mutate.** A tool interprets pointer input and calls
  controller intentions; it MUST NOT mutate the document or store directly. A
  mid-gesture tool switch cancels the in-flight gesture cleanly with no history
  entry.
- **EDT-8 — Input-focus guard.** Single-key tool shortcuts and modifier
  behaviors are suppressed while a text input/textarea is focused (PRD §8.9).

---

## 5. UI boundaries

The presentation layer (`@vectorforge/ui`, `apps/web`) is the only React.

- **UI-1 — React is presentation only.** React MAY be imported only in
  `@vectorforge/ui` and `apps/web`. No other package may import it.
- **UI-2 — No business logic in components.** React components MUST NOT contain
  document/business logic. They render store-derived view models and dispatch
  intentions. Logic lives in `@vectorforge/editor` and `@vectorforge/commands`.
- **UI-3 — Read via selectors.** Components subscribe to the editor store with
  fine-grained selectors so a pan does not re-render the inspector and a fill
  change does not re-render the canvas chrome.
- **UI-4 — The canvas is engine-owned.** The `<canvas>` element is driven
  imperatively by the renderer/engine. React treats it as an opaque ref and
  MUST NOT drive the render loop.
- **UI-5 — Composition at the root.** Concrete adapters (renderer backend,
  persistence) are selected and injected only at the `apps/web` composition
  root. Lower layers depend on ports, never on a concrete adapter.
- **UI-6 — Accessibility.** Chrome targets WCAG 2.2 AA: full keyboard
  operability, correct roles/names/state, visible focus, focus trapping in
  modals, and honoring `prefers-reduced-motion` (PRD §11.2).

---

## 6. Package dependency rules

The dependency graph is a DAG; edges point toward the leaves
(`shared`, `geometry`). It is enforced by two independent guardrails: ESLint
`no-restricted-imports` (source level — forbidden edges, the React ban, and deep
imports) **and** `scripts/check-boundaries.mjs` (package.json level — allowed
edges + cycle detection). The **enforced** map lives in exactly three places that
MUST agree: the §6.1 table below, `ALLOWED_DEPS` in `eslint.config.js`, and
`ALLOWED_DEPS` in `scripts/check-boundaries.mjs`. ARCHITECTURE.md §3.2 is the
forward-looking blueprint (a superset that names future packages such as
`tokens`/`export`/`sync`); it is kept broadly aligned but is **not** a
byte-exact enforcement source.

### 6.1 Allowed dependencies

| Package                    | May depend on                        | Layer            | React? |
| -------------------------- | ------------------------------------ | ---------------- | ------ |
| `@vectorforge/shared`      | _(nothing)_                          | cross-cutting    | ❌     |
| `@vectorforge/geometry`    | _(nothing)_                          | domain           | ❌     |
| `@vectorforge/document`    | geometry, shared                     | domain           | ❌     |
| `@vectorforge/commands`    | document, geometry, shared           | domain           | ❌     |
| `@vectorforge/editor`      | commands, document, geometry, shared | application      | ❌     |
| `@vectorforge/renderer`    | document, geometry, shared           | infrastructure   | ❌     |
| `@vectorforge/persistence` | document, shared                     | infrastructure   | ❌     |
| `@vectorforge/ui`          | editor, shared                       | presentation     | ✅     |
| `@vectorforge/web` (app)   | all of the above                     | composition root | ✅     |

### 6.2 Rules

- **DEP-1 — DAG only.** The internal dependency graph MUST remain acyclic.
- **DEP-2 — Whitelist, not blacklist.** A package MUST declare only the
  dependencies in its allowed set above. Anything else is a build failure.
- **DEP-3 — Down only.** Dependencies point downward (toward leaves). A lower
  layer MUST NOT import a higher one (e.g. `document` MUST NOT import `editor`).
- **DEP-4 — No app imports.** No package may depend on `@vectorforge/web`.
- **DEP-5 — Public API only.** Cross-package imports MUST go through the
  package's public entry (`@vectorforge/<pkg>`), never a deep path into its
  `src`. Each package's public surface is its `src/index.ts`. Enforced by the
  ESLint deep-import rule (`@vectorforge/<pkg>/…` is rejected); `check-boundaries`
  covers DEP-1 through DEP-4 at the package.json level.
- **DEP-6 — Ports break would-be cycles.** When two non-adjacent layers must
  communicate (e.g. editor ↔ renderer), the contract is expressed as a **port**
  (interface) that both can depend on, with the concrete adapter injected at the
  composition root. This preserves the DAG (ARCHITECTURE.md §1.4).
- **DEP-7 — Framework independence.** No package except `ui` and `web` may
  import React or any UI framework (restates UI-1 / EDT-1).

> Any change to the dependency map MUST be made in all **three** enforced
> locations together: this §6.1 table, `ALLOWED_DEPS` in `eslint.config.js`, and
> `ALLOWED_DEPS` in `scripts/check-boundaries.mjs`. ARCHITECTURE.md §3.2 (the
> long-term blueprint) should be kept broadly consistent but is not part of the
> byte-exact enforced set.
