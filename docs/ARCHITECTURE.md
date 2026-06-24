# VectorForge — Technical Architecture

| | |
|---|---|
| **Document** | ARCHITECTURE.md |
| **Status** | Authoritative engineering blueprint (pre-implementation) |
| **Source of truth** | `VectorForge_PRD (1).md` (v1.1) + approved UI design (`DesignOS.dc.html`) |
| **Audience** | Senior/Principal engineers, tech leads, EM, design-systems |
| **Scope** | V1 (editor core) architecture designed to absorb V2/V3/Future without rewrite |
| **Owner** | Principal Architect |

> This document defines *how* VectorForge is built. It deliberately does **not** contain application code, React components, or visual styling. It defines system boundaries, contracts, data models, algorithms, trade-offs, and the decisions a team needs to begin implementation with confidence.

---

## Table of contents

1. [Architecture Philosophy](#1--architecture-philosophy)
2. [Technology Decisions](#2--technology-decisions)
3. [Monorepo Architecture](#3--monorepo-architecture)
4. [Editor Core Architecture](#4--editor-core-architecture)
5. [Document Model & Scene Graph](#5--document-model--scene-graph)
6. [Geometry & Mathematics Engine](#6--geometry--mathematics-engine)
7. [Rendering Architecture](#7--rendering-architecture)
8. [Interaction Engine](#8--interaction-engine)
9. [Transform System](#9--transform-system)
10. [Command & History Architecture](#10--command--history-architecture)
11. [File System Architecture](#11--file-system-architecture)
12. [Performance Architecture](#12--performance-architecture)
13. [Testing Strategy](#13--testing-strategy)
14. [Security & Reliability](#14--security--reliability)
15. [Future Architecture Roadmap](#15--future-architecture-roadmap)
16. [Engineering Decisions (ADRs)](#16--engineering-decisions-adrs)

---

## 1 — Architecture Philosophy

### 1.1 First principles

VectorForge is, at its core, **a real-time editor of a structured document rendered to a canvas**. Three properties from the PRD dominate every architectural decision:

1. **The browser is the product** (PRD §2.1) — no native runtime; rendering, editing, multiplayer, and export all happen in a browser tab at 60fps.
2. **Speed is a feature** (PRD §2.2) — single-digit-millisecond frame budgets, keyboard-first, no per-frame allocation on the hot path.
3. **One file, end to end** (PRD §2.3) — a single document model carries the design from first rectangle through review, history, and developer handoff.

These translate into four non-negotiable engineering invariants:

| Invariant | Consequence |
|---|---|
| The **editor engine must run without a DOM or a UI framework** | It is testable in Node, embeddable in a worker, and survives a UI-framework migration. |
| The **document model is the single source of truth** | Rendering, inspector, layers, export, and (later) sync are all *projections* of it. |
| **All mutations flow through commands** | Undo/redo, autosave diffs, and multiplayer ops share one mutation pathway. |
| The **renderer is an interface, not a class** | Canvas2D today, WebGL/WebGPU later, with zero feature rewrites. |

### 1.2 Separation of concerns — the layered model

VectorForge is a strict layered system. **Dependencies point downward only.** A lower layer never imports a higher one. This is the spine of the whole architecture.

```
┌─────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER            (apps/editor — React + Vite)   │
│  React components, panels, toolbar, inspector, DOM events.    │
│  Knows about pixels and the user. Holds NO document logic.    │
└───────────────────────────────┬─────────────────────────────┘
                                 │  intentions ↓     state ↑ (subscribe)
┌───────────────────────────────┴─────────────────────────────┐
│  APPLICATION LAYER             (packages/editor)              │
│  EditorController, EditorStore, tool state machine,           │
│  interaction engine, viewport, selection. Orchestrates use    │
│  cases. Framework-agnostic. Speaks "intentions" → "commands". │
└───────────────────────────────┬─────────────────────────────┘
                                 │  commands ↓
┌───────────────────────────────┴─────────────────────────────┐
│  DOMAIN / EDITOR CORE          (packages/document, /commands, │
│                                 /geometry, /scene)            │
│  Scene graph, BaseNode hierarchy, geometry math, command      │
│  definitions, serialization. Pure, deterministic, no I/O,     │
│  no DOM, no time, no randomness leaking in.                   │
└───────────────────────────────┬─────────────────────────────┘
                                 │  scene reads ↓        ↑ render calls
┌───────────────────────────────┴─────────────────────────────┐
│  INFRASTRUCTURE LAYER  (packages/renderer, /persistence,      │
│                         /sync [V3], /export)                  │
│  Renderer impls (Canvas2D/WebGL), IndexedDB/localStorage,     │
│  cloud sync transport, export pipeline, telemetry.            │
│  Implements ports defined by the layers above.                │
└──────────────────────────────────────────────────────────────┘
```

**Why this ordering matters.** The Domain/Editor Core is the most valuable and longest-lived asset. It must be the *most isolated* — depending on nothing but the geometry primitives and the language runtime. Everything volatile (React, Canvas2D, IndexedDB, WebSocket) lives at the edges where it can be swapped.

### 1.3 Domain-Driven Design alignment

We map the PRD's nouns onto DDD building blocks:

| DDD concept | VectorForge realization |
|---|---|
| **Aggregate root** | `Document` — the consistency boundary; all mutations are scoped to one document. |
| **Entities** | `Node` subclasses (Frame, Group, Shape, Text, Image, ComponentInstance) — identity via stable `id`. |
| **Value objects** | `Vector2`, `Matrix3`, `Rect`, `Color`, `Transform`, `BoundingBox` — immutable, equality by value. |
| **Domain services** | Geometry engine, hit-testing, alignment-guide computation. |
| **Application services** | `EditorController` use cases (create, move, group, delete…). |
| **Repository (port)** | `DocumentRepository` — load/save a `.vf`, implemented by persistence infra. |
| **Domain events** | `NodeCreated`, `NodeMoved`, `SelectionChanged`, `DocumentDirty` — drive projections and (V3) sync. |

**Bounded contexts.** Editing, Collaboration (V3), Handoff (V3), and Assets/Components (V2) are separate contexts that communicate through the document model and explicit events, not through shared mutable internals. This keeps the V1 surface small and lets later contexts evolve independently.

### 1.4 Clean architecture boundaries (the dependency rule)

```
        can depend on  →
Presentation ─────► Application ─────► Domain ◄───── implements ──── Infrastructure
                                         ▲                                  │
                                         └──── defines PORTS (interfaces) ──┘
```

- The Domain defines **ports** (TypeScript interfaces): `IRenderer`, `DocumentRepository`, `IClock`, `IdGenerator`, `SyncTransport`.
- Infrastructure provides **adapters** implementing those ports.
- Dependency injection wires adapters at the composition root (`apps/editor` bootstrap) so the core never names a concrete adapter.

This is what makes the core deterministic: time (`IClock`) and identity (`IdGenerator`) are injected, so tests are reproducible and serialization is diffable.

### 1.5 Why the editor engine must be independent of the UI framework

This is the single most important decision in the document. Reasons, in priority order:

1. **Longevity.** A vector editor is a 5–10 year asset. React's API will change; the dominant framework may not be React in 2030. Coupling the document model to React component lifecycles would make the core un-migratable. The PRD explicitly plans a multi-year horizon (PRD §6, §15).
2. **Testability.** A framework-free core runs in plain Node/Vitest with no jsdom, no render harness. Math, scene-graph mutations, commands, and serialization get fast, deterministic unit tests (PRD §13).
3. **Performance.** React's reconciliation is the wrong tool for a 60fps canvas with 10k nodes (PRD §11.1). The hot path (pan/zoom/drag) must bypass React entirely and write straight to the renderer. If the engine *were* React state, every pointer move would trigger reconciliation.
4. **Reusability.** The same core can power a headless export service, a thumbnail/render worker, server-side `.vf` validation, and (Future) a CLI — none of which have a DOM.
5. **Multiplayer (V3).** CRDT/OT operates on the document model, not on React state. The engine must be the authority that sync layers attach to.

**The rule:** `packages/editor` and everything below it may not `import react`. Enforced by an ESLint boundary rule and CI dependency-graph checks (see §3.5).

### 1.6 Supporting future technologies

The architecture creates explicit seams for technologies we don't use yet:

- **Renderer swap** → `IRenderer` port (§7). Canvas2D → WebGL/WebGPU is an adapter change.
- **WASM acceleration (Future/V4)** → geometry and hit-testing are pure functions behind module boundaries; hot kernels can be replaced with WASM exports implementing the same TypeScript signatures.
- **Real-time collaboration (V3)** → the command/op log (§10) is designed to compose with CRDT/OT; document mutations are already discrete and serializable.
- **Plugin SDK (V4)** → plugins target the same public ports (commands, scene queries, renderer overlays) the first-party UI uses; no privileged backdoor.
- **Off-main-thread engine (Future)** → because the engine has no DOM dependency, it can move into a Web Worker; the UI layer talks to it via a message-port adapter implementing the same `EditorController` facade.

---

## 2 — Technology Decisions

For every decision: **what**, **why**, **alternatives**, **trade-offs**.

### 2.1 Language — TypeScript (strict)

- **Why:** A long-lived editor with a complex domain model needs static types for refactoring safety and as living documentation of the node/command/op contracts. `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes` on.
- **Alternatives:** Plain JS (rejected — refactors across a multi-year codebase become unsafe); ReScript/Elm (rejected — ecosystem and hiring friction); Rust→WASM for the whole core (rejected for V1 — slows iteration, complicates DOM/event interop; reserved for *hot kernels* in V4).
- **Trade-offs:** Build step and type-maintenance cost; occasional `unknown`/generic gymnastics in the renderer interface. Accepted — the safety dividend on a domain this large is decisive.

### 2.2 Frontend framework — React 18

- **Why:** It renders **only the chrome** — panels, toolbar, inspector, dialogs, command palette (the parts in `DesignOS.dc.html`). React is excellent for this declarative, low-frequency UI. Huge hiring pool, mature a11y ecosystem (PRD §11.2 WCAG 2.2 AA), concurrent features for non-blocking panel updates.
- **Critical constraint:** React **never** touches the canvas render loop or the document model. The canvas is an imperatively-driven `<canvas>` the engine owns; React treats it as an opaque ref.
- **Alternatives:** Svelte/SolidJS (leaner reactivity, smaller runtime — but smaller hiring pool and ecosystem; the chrome isn't the bottleneck so the win is marginal); Web Components (framework-neutral but weaker tooling/DX). Vue (viable; React chosen for ecosystem depth).
- **Trade-offs:** React's bundle and reconciliation overhead — mitigated by keeping it out of the hot path. We pay for ecosystem with weight.

### 2.3 Build tooling — Vite + Turborepo + pnpm

- **Vite** for the app: fast dev server (native ESM), Rollup production builds, first-class worker and WASM support (needed for Future off-thread/WASM).
- **pnpm workspaces** for the monorepo: content-addressed store, strict node_modules (prevents phantom dependencies that would let a package import across a forbidden boundary).
- **Turborepo** for task orchestration and remote caching: `build`/`test`/`lint`/`typecheck` are cached per-package; CI only rebuilds what changed.
- **Alternatives:** Webpack (slower dev, heavier config); Nx (more features than we need at start, steeper config); Bun (promising, but we prioritize ecosystem maturity for a foundational project — revisit later).
- **Trade-offs:** Three tools to learn; Turborepo cache configuration discipline required. Accepted for monorepo scale.

### 2.4 Rendering — Canvas 2D for V1, behind a renderer abstraction

- **Why Canvas2D for V1:** The PRD ships a focused single-player editor first (PRD §6). Canvas2D is immediate-mode, has zero shader/pipeline complexity, draws gradients/shadows/text natively (matching the design's gradient cards and shadows), and reaches 60fps for the reference document with culling. It gets us to a correct, shippable editor fastest.
- **Why an abstraction now (`IRenderer`):** PRD §11.1 demands 10,000+ objects and 120fps headroom; Canvas2D will hit a ceiling at high node counts and heavy effects. The PRD §8.1 explicitly says "abstract the renderer behind a scene API" so a WebGL/WebGPU backend can replace it in V3 without rewriting features.
- **Why NOT SVG:** See [ADR-001](#adr-001--canvas-over-svg-for-the-artwork-surface). Summary: SVG creates one retained DOM node per element → 10k nodes melts layout/style/paint; no control over the paint loop; selection/marquee/handles become DOM soup.
- **Alternatives:** WebGL from day one (rejected for V1 — text rendering, crisp strokes, and dev velocity all suffer; premature optimization before product-market fit); pixi.js/two.js (rejected — adopting a scene-graph library would fight our own document model and constrain the renderer port).
- **Trade-offs:** Canvas2D text metrics and high-DPI handling need care (§7.4); we will outgrow it — but the port means that's an adapter swap, not a rewrite.

### 2.5 State management — a purpose-built EditorStore (not Redux, not React state)

**Why React state is insufficient (explicitly):**

1. **Frequency mismatch.** Pointer-move during a drag fires at 60–120Hz. Routing each through React state → reconcile → commit would blow the 16ms budget (PRD §11.1: selection <16ms, transform <16ms/frame). The engine must mutate and repaint without React in the loop.
2. **Source-of-truth conflict.** The document is a graph with cross-references (components, comment anchors, z-order). Modeling it as React state forces unnatural normalization and prop-drilling, and couples domain truth to component lifecycles.
3. **Determinism & testing.** The store must run headless (§1.5). React state can't.
4. **Granular subscriptions.** The inspector should re-render when *the selected node's fill* changes — not on every pan. We need selector-level subscriptions, which React's built-in state doesn't give cheaply.

**The design:** a framework-agnostic observable store (see §4.2) exposing:
- `getState()` — synchronous snapshot read for the engine.
- `subscribe(selector, listener)` — fine-grained, memoized; the React binding (`useEditorSelector`) sits on top via `useSyncExternalStore`.
- `dispatch(intention)` — the only write path; routes to the controller → commands.

State is partitioned into **document state** (the persisted scene graph — mutated only by commands) and **ephemeral editor state** (selection, viewport, active tool, hover, marquee — not persisted, not in history except where the PRD requires selection restoration).

- **Alternatives:** Redux/RTK (action/reducer boilerplate, immutable-everything penalty on a 10k-node graph, and it still wouldn't keep up with the hot path); Zustand/Jotai (good for chrome state, but we still need a domain-owned store for the document — we *do* use a Zustand-like pattern for pure-UI chrome state); MobX (observability is nice but its proxy magic obscures the hot-path cost and complicates serialization).
- **Trade-offs:** We build and maintain a small store ourselves. Justified: the store is ~300 lines and is the heart of performance and testability.

### 2.6 Storage — layered: in-memory → IndexedDB → cloud

| Tier | Tech | Role | Release |
|---|---|---|---|
| Hot | In-memory document + op log | Live editing truth | V1 |
| Local durable | **IndexedDB** | Autosave, crash recovery, offline queue, asset blob cache | V1 |
| Small prefs | **localStorage** | Viewport prefs, last-open doc id, feature flags (tiny, synchronous) | V1 |
| Cloud | REST + object store; WebSocket (V3) | Source of truth across devices, sharing, presence | V2/V3 |

- **Why IndexedDB (not localStorage) for documents:** localStorage is ~5MB, synchronous (blocks the main thread — violates §11.1 "never block the main thread"), strings only. IndexedDB is async, large (hundreds of MB+), stores structured data and Blobs (for image assets), and supports transactions — exactly what autosave + offline queue (PRD §11.4) need.
- **Why localStorage *for tiny prefs only*:** synchronous read at boot for viewport/theme is acceptable and simpler than IDB for a handful of keys.
- **Cloud strategy:** V2/V3 introduces a `DocumentRepository` cloud adapter: diff-based, debounced autosave (PRD §8.8) with optimistic local writes and server confirmation; assets by reference to an object store/CDN; V3 sync over WebSocket carrying CRDT/OT ops (§15). The V1 port shape is designed so the cloud adapter drops in without touching the core.
- **Alternatives:** OPFS (Origin-Private File System) — attractive for large files and is a strong Future option for `.vf` blobs; we keep IDB for V1 for broader support and transactional autosave. WebSQL (dead). 
- **Trade-offs:** IndexedDB's API is awkward (mitigated with a thin typed wrapper, no heavy library); cross-tab coordination needs a `BroadcastChannel` lock (§14.6).

### 2.7 Testing stack

| Layer | Tool | What |
|---|---|---|
| Unit | **Vitest** | Math engine, scene graph, commands, serialization (pure, fast, headless). |
| Component | Vitest + Testing Library | Chrome behavior, a11y roles, keyboard nav. |
| Integration | Vitest (jsdom) + canvas mock | Controller workflows: tool→command→model→render-call. |
| Visual/render | **Playwright** screenshot diffs | Pixel-accurate render regression on reference doc. |
| E2E | **Playwright** | Full user flows in a real browser. |
| Performance | Playwright + custom harness | FPS, frame-paint, memory, stress (10k nodes). |

- **Why Vitest:** native ESM/TS, Vite-shared config, fast watch, Jest-compatible API.
- **Why Playwright:** real Chromium/Firefox/WebKit (matches PRD §11.5 browser matrix), screenshot diffing, trace viewer, scriptable perf metrics via CDP.
- **Alternatives:** Jest (slower with ESM/TS); Cypress (weaker multi-browser + no WebKit). 
- **Trade-offs:** Two runners (Vitest + Playwright) — clean split between logic and browser; worth it.

---

## 3 — Monorepo Architecture

### 3.1 Layout

```
vectorforge/
├── apps/
│   ├── editor/                 # The web app (React + Vite). Composition root.
│   ├── render-worker/          # (Future) headless render/export service
│   └── docs-site/              # (Optional) public docs / component gallery
│
├── packages/
│   ├── geometry/               # Vector2, Matrix3, Rect, BBox — pure math (no deps)
│   ├── document/               # BaseNode hierarchy, scene graph, schema, serialization
│   ├── commands/               # Command pattern, history (undo/redo), op log
│   ├── editor/                 # EditorController, EditorStore, tools, interaction, viewport
│   ├── renderer/               # IRenderer port + CanvasRenderer (+ future WebGLRenderer)
│   ├── persistence/            # IndexedDB/localStorage adapters, autosave, .vf I/O
│   ├── export/                 # PNG (V1) → SVG/PDF (V3) export pipeline
│   ├── sync/                   # (V3) CRDT/OT, presence, transport
│   ├── ui/                     # React component library (chrome): panels, inspector, palette
│   ├── tokens/                 # Design tokens (color/type/spacing) as data
│   ├── shared/                 # IDs, Result type, event emitter, assert, logger, clock port
│   └── testing/                # Test utilities, fixtures, .vf sample docs, perf harness
│
├── docs/
│   ├── ARCHITECTURE.md         # this file
│   ├── adr/                    # individual ADR records (0001-*.md …)
│   ├── schemas/                # JSON Schema for .vf, per version
│   └── runbooks/               # ops, recovery, release
│
├── tools/
│   ├── eslint-config/          # shared lint incl. import-boundary rules
│   ├── tsconfig/               # base tsconfigs (strict)
│   └── vfcli/                  # .vf validate/migrate/inspect CLI (uses document + persistence)
│
├── scripts/                    # CI, codegen (schema→types), release, perf-bench runners
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### 3.2 Package responsibilities & dependency direction

**The dependency graph is a DAG and points toward `geometry`/`shared` (the leaves).**

```
                         ┌────────────┐
                         │  apps/editor│  (composition root: wires everything)
                         └─────┬───────┘
        ┌──────────┬──────────┼───────────┬────────────┬──────────┐
        ▼          ▼          ▼           ▼            ▼          ▼
     ui (React) editor    renderer   persistence    export    tokens
        │          │          │           │            │
        │          ▼          ▼           ▼            ▼
        │      commands ───► document ──► geometry ◄───┘
        │          │            │            ▲
        └──────────┴────────────┴────────────┘
                         shared (leaf, depended on by all)
```

| Package | Owns | Depends on | May import React? |
|---|---|---|---|
| `geometry` | Vec2, Matrix3, Rect, BBox, intersection, transforms | (nothing) | ❌ |
| `shared` | `id()`, `Result<T,E>`, `Emitter`, `IClock`, assert, logger | (nothing) | ❌ |
| `document` | `BaseNode`+subclasses, `SceneGraph`, schema, (de)serialize | geometry, shared | ❌ |
| `commands` | `ICommand`, concrete commands, `HistoryManager`, op log | document, geometry, shared | ❌ |
| `editor` | `EditorController`, `EditorStore`, tools, interaction, viewport, selection | commands, document, geometry, shared | ❌ |
| `renderer` | `IRenderer`, `CanvasRenderer`, render queue, culling | document, geometry, shared | ❌ |
| `persistence` | IDB/localStorage adapters, autosave, `.vf` read/write, migrations | document, shared | ❌ |
| `export` | frame→PNG (V1), SVG/PDF (V3) | document, renderer, geometry | ❌ |
| `sync` (V3) | CRDT/OT, presence, transport | commands, document, shared | ❌ |
| `tokens` | color/type/spacing token data + types | shared | ❌ |
| `ui` | React chrome components, hooks, store bindings | editor, tokens, shared | ✅ |
| `apps/editor` | bootstrap, DI wiring, routing, layout | everything | ✅ |

**Only `ui` and `apps/*` may import React.** This single rule operationalizes §1.5.

### 3.3 Why this decomposition

- **Editor Core, Rendering, Geometry, Document, Commands are separate packages** because each has a distinct rate of change and a distinct test profile. Geometry is stable and pure; renderer is volatile (will get a second implementation); commands grow constantly. Separate packages give independent versioning, caching, and clear ownership.
- **`document` and `geometry` are the crown jewels** and have **zero** infra dependencies. They could be published standalone.
- **`ui` is intentionally thin** — it binds to the store and dispatches intentions; it holds no domain logic, so a future framework swap rewrites only `ui` + `apps/editor`.

### 3.4 Ownership matrix

| System | Owning package | Primary maintainers |
|---|---|---|
| Math/coordinate pipeline | `geometry` | Core/Engine team |
| Document model & schema | `document` | Core/Engine team |
| Undo/redo, op log | `commands` | Core/Engine team |
| Controller, store, tools, interaction | `editor` | Editor team |
| Render loop & backends | `renderer` | Rendering team |
| Storage, autosave, recovery | `persistence` | Platform team |
| Export | `export` | Rendering/Platform |
| Sync, presence (V3) | `sync` | Collaboration team |
| Chrome UI & a11y | `ui` | App/Design-systems team |
| Tokens | `tokens` | Design-systems team |

### 3.5 Enforcing boundaries (mechanical, not cultural)

- ESLint `no-restricted-imports` + `eslint-plugin-boundaries`: each package declares allowed dependencies; violations fail lint.
- `dependency-cruiser` runs in CI to assert the DAG has no cycles and no upward edges (e.g., `document → editor` is an error).
- `react` is banned from all non-`ui`/non-`apps` packages via an import rule.
- pnpm strict mode prevents phantom dependencies (you can't import what you didn't declare).

---

## 4 — Editor Core Architecture

The editor core is the application layer that turns user **intentions** into **commands** against the document, and projects state back to the UI. It is the seam between the volatile UI and the pure domain.

### 4.1 EditorController

The **single entry point** for everything a user can do. It is a thin orchestrator — it contains *use cases*, not algorithms (algorithms live in domain services).

**Responsibilities:**
- Receive **intentions** (high-level, UI-agnostic: "create rectangle at world (x,y)", "move selection by (dx,dy)", "group selection", "delete selection").
- Validate the intention against current state (e.g., reject group of <1 node, reject edit of a locked node — PRD LAY-005, SEL-003).
- Build the appropriate **command(s)** and submit them to the `HistoryManager`.
- Manage **editor lifecycle**: load/initialize a document, mount/unmount the renderer, install/teardown input handlers, flush autosave on unload.
- Coordinate cross-cutting concerns: after a command applies, mark the document dirty (triggers autosave), schedule a render, emit domain events.

```
interface EditorController {
  // lifecycle
  loadDocument(doc: Document): void
  dispose(): void

  // use cases (intentions) — each builds & dispatches command(s)
  createNode(intent: CreateIntent): NodeId
  deleteSelection(): void
  moveSelection(delta: Vector2): void
  resizeNode(id: NodeId, box: Rect, opts: TransformOpts): void
  setProperty(id: NodeId, path: PropPath, value: unknown): void
  group(): void; ungroup(): void
  reorder(id: NodeId, op: 'front'|'back'|'forward'|'backward'): void

  // history
  undo(): void; redo(): void

  // queries (read-only, no mutation)
  hitTest(worldPt: Vector2): NodeId | null
  getSelectionBounds(): BoundingBox | null
}
```

**Key rule:** the controller **never mutates the document directly**. It only constructs commands. This guarantees every change is undoable, serializable, and (V3) syncable.

### 4.2 EditorStore

The observable state container the UI subscribes to and the engine reads synchronously.

**Responsibilities:**
- Hold the **document reference** + **ephemeral editor state**.
- Provide synchronous `getState()` for the engine's hot path.
- Provide **fine-grained, memoized subscriptions** so React re-renders minimally.
- Be the *only* write path (`dispatch`), keeping mutation centralized and observable.

```
type EditorState = {
  document: Document            // the scene graph (mutated only by commands)
  selection: { ids: Set<NodeId>; primaryId: NodeId | null }   // SEL-005
  viewport: { panX: number; panY: number; zoom: number }      // CAN-001/002
  tool: ToolId                                                 // TOOL-007
  hover: NodeId | null
  marquee: Rect | null
  interaction: InteractionPhase // idle | dragging | resizing | marquee | panning
  ui: { leftTab; rightCollapsed; bottomTab; ... }              // chrome
}

interface EditorStore {
  getState(): Readonly<EditorState>
  subscribe<T>(selector: (s: EditorState) => T, cb: (v: T) => void, eq?: Eq<T>): Unsub
  // internal: applied by controller/commands, never by UI directly
  _commit(mutator: (draft: EditorState) => void, change: ChangeTag): void
}
```

**`ChangeTag`** classifies each commit (`document`, `selection`, `viewport`, `tool`, `ephemeral`) so subscribers and the render scheduler can react selectively — e.g., a `viewport` change schedules a render but does **not** mark the document dirty; a `document` change does both.

**React binding:** `useEditorSelector(selector, eq)` wraps `store.subscribe` via `useSyncExternalStore`. The inspector subscribes to `(s) => projectInspector(s)`; the layer panel to the flattened tree; neither re-renders on pan.

### 4.3 Why the editor must not depend on React

Restating §1.5 concretely at the core level:

- **Hot path bypasses React.** During a drag, the interaction engine calls `controller.moveSelection(delta)` → command applies → `renderer.requestFrame()`. React is **not** notified per move; only on *commit* does the store emit a `document` change that the (low-frequency) inspector reads. A pointer-move at 120Hz produces 120 cheap engine mutations and 0 React renders.
- **The store is plain JS** with `useSyncExternalStore` as the *only* React touchpoint — replaceable by a Svelte store or a worker message bridge without touching engine logic.
- **No component lifecycle in domain logic.** Tools, commands, and the scene graph have no `useEffect`, no JSX, no React imports (enforced, §3.5).

### 4.4 Complete data-flow diagram

```
   ┌──────────────┐
   │  User Input  │  (mouse / touch / pen / keyboard)
   └──────┬───────┘
          │ DOM event (pointerdown/move/up, keydown, wheel)
          ▼
   ┌────────────────────────────┐
   │ UI Event Layer (apps/ui)   │  React/DOM handlers — translate raw DOM
   │  - normalize coords        │  into engine-level input; NO domain logic
   │  - screen→world (geometry) │
   └──────┬─────────────────────┘
          │ EngineInput {worldPt, modifiers, button, deltas}
          ▼
   ┌────────────────────────────┐
   │ Interaction Engine         │  active Tool's onDown/Move/Up state machine
   │ (packages/editor)          │  decides: select? draw? drag? marquee? pan?
   └──────┬─────────────────────┘
          │ Intention (create/move/resize/setProp/group/delete)
          ▼
   ┌────────────────────────────┐
   │ EditorController           │  validates → builds Command(s)
   └──────┬─────────────────────┘
          │ ICommand
          ▼
   ┌────────────────────────────┐
   │ HistoryManager (commands)  │  execute(), push to undo stack, clear redo
   └──────┬─────────────────────┘
          │ command.execute(ctx)
          ▼
   ┌────────────────────────────┐
   │ Document Model / SceneGraph│  mutates nodes; bumps version; emits events
   │ (packages/document)        │  marks affected bounds DIRTY
   └──────┬───────────────┬─────┘
          │ events         │ dirty regions
          ▼                ▼
   ┌──────────────┐  ┌───────────────────────────┐
   │ EditorStore  │  │ Render Scheduler           │
   │ _commit()    │  │ (rAF-coalesced)            │
   └──────┬───────┘  └──────┬────────────────────┘
          │ change-tagged    │ on next animation frame
          │ notifications    ▼
          ▼            ┌───────────────────────────┐
   ┌──────────────┐    │ Renderer (IRenderer)      │
   │ React Chrome │    │  cull → draw dirty nodes  │
   │ (inspector,  │    └──────┬────────────────────┘
   │  layers…)    │           ▼
   │ re-renders   │    ┌───────────────────────────┐
   │ selectively  │    │ Canvas (<canvas> 2D ctx)  │
   └──────────────┘    └───────────────────────────┘
          ▲
          │ (autosave path, async, off hot path)
   ┌──────┴───────────────────────────┐
   │ Persistence: debounced diff → IDB │  (PRD FILE-001, §11.4)
   └───────────────────────────────────┘
```

**Two distinct propagation channels** from a document mutation:
1. **To pixels** — via the render scheduler → renderer → canvas (synchronous-ish, every animation frame, hot).
2. **To chrome** — via the store's tagged notifications → React selectors (low frequency, only when relevant slices change).

This dual-channel design is *the* reason VectorForge can hit 60fps while still having a rich, reactive inspector.

### 4.5 Tool state machine

Each tool implements a small interface; exactly one is active (PRD TOOL-007). The interaction engine delegates pointer events to it.

```
interface Tool {
  id: ToolId
  cursor(state): CursorSpec                       // CAN-007
  onActivate(ctx) / onDeactivate(ctx)
  onPointerDown(ev: EngineInput, ctx): void
  onPointerMove(ev: EngineInput, ctx): void
  onPointerUp(ev: EngineInput, ctx): void
  onKey(ev, ctx): void
}
```

Tools: `MoveTool`, `FrameTool`, `RectTool`, `EllipseTool`, `TextTool`, `HandTool` (V1); `CommentTool` (V2); `PenTool` (Future). A tool **never mutates the document** — it calls controller intentions. Mid-drag tool switch cancels the in-flight gesture cleanly (PRD TOOL edge case) by routing through the interaction engine's `cancelGesture()`.

---

## 5 — Document Model & Scene Graph

### 5.1 Why a scene graph

The PRD §9.1 mandates a strict containment tree (Document → Page → Frame → Group → Layer → Shape/Text/Image). A scene graph is the natural representation:

- **Hierarchical transforms** — a group moves its children; coordinates resolve through parents (PRD §9.2 coordinate model, GUI-002 local-space distances).
- **Z-order & traversal** — front-to-back hit testing, painter's-order rendering, "bring to front/send to back" (PRD §8.1 overlapping selection).
- **Containment semantics** — frames clip, define coordinate origins; groups transform together.
- **Serialization** — the tree maps directly to the `.vf` JSON structure.

### 5.2 Node hierarchy

```
                         ┌───────────┐
                         │ BaseNode  │  (abstract)
                         └─────┬─────┘
        ┌──────────────┬───────┼─────────┬───────────────┐
        ▼              ▼       ▼         ▼               ▼
   ┌─────────┐   ┌──────────┐ ┌──────┐ ┌────────┐ ┌──────────────────┐
   │ PageNode│   │ FrameNode│ │Group │ │ShapeNode│ │ ComponentInstance │ (V2)
   └─────────┘   └──────────┘ │ Node │ └───┬────┘ └──────────────────┘
                              └──────┘     │
                       ┌───────────┬───────┼───────────┐
                       ▼           ▼       ▼           ▼
                  ┌─────────┐ ┌────────┐ ┌──────┐ ┌────────┐
                  │Rectangle│ │Ellipse │ │ Line │ │  Path  │ (Future: pen/vector)
                  └─────────┘ └────────┘ └──────┘ └────────┘

   TextNode and ImageNode are leaf nodes extending BaseNode directly
   (they are "layers" with type-specific payloads, per PRD §9.2).
```

### 5.3 BaseNode — the common schema

Directly from PRD §9.2 ("common element schema"). Every node carries:

```
abstract class BaseNode {
  readonly id: NodeId            // stable, unique; survives moves/renames (PRD)
  type: NodeType                 // 'frame'|'group'|'rect'|'ellipse'|'text'|'image'|'component'|...
  name: string                   // non-empty; defaults per type (LAY edge case)
  transform: Transform           // { position {x,y} (LOCAL), rotation (0–360°), scale {x,y} }
  visibility: boolean            // hidden but still in tree & selectable via panel (LAY-004)
  locked: boolean                // non-selectable/editable; cascades to descendants (LAY-005)
  zIndex: number                 // stacking within parent (PRD §9.2)
  opacity: number                // 0..1 (appearance)
  metadata: Record<string,unknown> // namespaced free-form bag: altText, export, links (a11y §11.2)

  parentId: NodeId | null        // tree linkage (stored as id, not ref — see §5.7)
  childIds: NodeId[]             // ordered; order encodes paint/z within parent
}
```

**Type-specific extensions** (PRD §9.2):
- `FrameNode`: `size {w,h}`, `origin`, `clipsContent`, `backgroundColor`.
- `ShapeNode`: `fill`, `stroke`, `cornerRadius`, `effects[]`, `size`.
- `TextNode`: `content`, `font`, `weight`, `size`, `lineHeight`, `letterSpacing`, `align`, `fill`.
- `ImageNode`: `assetRef`, `fit`, `altText`.
- `ComponentInstance` (V2): `componentRef`, `variant`, `state`, `propertyOverrides`.

### 5.4 Authoritative scene graph vs. virtual groups

The design (`DesignOS.dc.html`) and PRD §7.3/§9.1 draw a sharp distinction the model **must** honor:

- **Authoritative scene graph** — real container nodes the renderer walks and transforms cascade through (frames, real groups). One source of geometric truth.
- **Virtual groups** — logical organizers in the *layer panel tree only* (the design's `VGROUP`: "Header", "Quick Actions", "Transactions"). They group rows for the user but are **not** transform parents on the canvas.

Implementation: the `SceneGraph` exposes two views — `renderTree()` (authoritative, used by renderer + hit-testing) and `outlineTree()` (authoritative + virtual groupings, used by the layer panel). Virtual groups are stored as lightweight grouping nodes flagged `virtual: true`, skipped by the renderer and transform cascade.

### 5.5 Parent–child relationships & coordinate resolution

- Children store **local** coordinates relative to the parent's origin (PRD §9.2). The inspector shows local; canvas overlays use world.
- World transform of a node = product of ancestor transforms:
  `worldMatrix(node) = parent.worldMatrix × node.localMatrix` (see §6).
- A node's world matrix is **cached** and invalidated when its own or any ancestor's transform changes (dirty-flag propagation downward).

### 5.6 Traversal algorithms

| Need | Algorithm |
|---|---|
| **Render** | Depth-first, pre-order, children in ascending `zIndex` → painter's order (back-to-front). |
| **Hit test** | Depth-first, **reverse** z-order (front-to-back); return first node whose world AABB + precise geometry contains the point and that is visible & unlocked (PRD §8.1). |
| **Marquee** | Iterate selectable leaves; AABB-intersect against marquee rect in world space (PRD SEL-002). |
| **Bounds of selection** | Union of selected nodes' world AABBs (PRD TRN-002). |
| **Flatten for layer panel** | Pre-order walk of `outlineTree` honoring expand/collapse; **memoized**, recomputed only on structural/selection/visibility change (PRD §8.3). |

All traversals are iterative or bounded-recursion with explicit stacks to avoid stack overflow on deep trees (PRD: deeply nested trees).

### 5.7 Storage representation: id-indexed map + tree

The scene graph is stored as a **flat `Map<NodeId, BaseNode>` plus parent/child id links**, not as nested object references.

- **Why:** O(1) lookup by id (selection, comments, components, history all reference ids); cheap structural sharing for snapshots; no deep-clone hazards; trivial serialization; safe under future CRDT (ids are the stable addressing scheme).
- Tree shape is derived from `parentId`/`childIds`. Reordering = array reorder of `childIds` + `zIndex` recompute.

### 5.8 Z-order management

- Within a parent, paint/hit order is the `childIds` array order, mirrored by contiguous `zIndex` values.
- `bringToFront`/`sendToBack`/`forward`/`backward` (PRD KEY-005) reorder within the parent's `childIds`; cross-parent reordering is a reparent + insert.
- Overlapping-click cycling (PRD §8.1): repeated click / Alt-click at the same point walks down the z-sorted hit list (the hit-test returns the *ordered* list; the interaction engine tracks the cycle index).

### 5.9 Serialization

- Each node implements `toJSON()` / static `fromJSON()` producing the `.vf` shape (§11). Serialization is **deterministic** (sorted keys) for clean diffs and multiplayer snapshots (PRD §9.3 determinism).
- The scene graph (de)serializes by walking nodes and rebuilding the id map + links; integrity is validated on load (no dangling parent/child ids, no cycles) — fail-safe to recovery mode on violation (§14).

---

## 6 — Geometry & Mathematics Engine

`packages/geometry` — pure, dependency-free, exhaustively unit-tested. It is the foundation every other system stands on (renderer, hit-test, marquee, guides, rulers, minimap — PRD §8.1 "single source of truth").

### 6.1 Primitives

All primitives are **immutable value objects** (per global coding rule: never mutate; return new). Methods return new instances; equality is by value.

```
Vector2  { x, y }
  add, sub, scale, dot, length, normalize, distanceTo, lerp, rotate(θ), transformBy(m)

Matrix3  // 2D affine, stored as 6 numbers [a,b,c,d,e,f] (the 3rd row is implicit 0,0,1)
  identity, multiply(m), invert, translate(v), rotate(θ), scale(v),
  transformPoint(v), transformRect(r), decompose() → {translation, rotation, scale}

Rect     { x, y, w, h }
  contains(pt), intersects(rect), union(rect), inflate(d), center(), corners()

BoundingBox  // axis-aligned; union of points/rects
  fromRect, fromPoints, expandToInclude, intersects, contains

Transform // node-level convenience: { position: Vector2, rotation: number, scale: Vector2 }
  toMatrix(): Matrix3
```

**Why Matrix3 (3×3 affine) and not full 4×4:** all V1 operations are 2D affine (translate, rotate, scale, skew-free). A 6-number affine matrix is compact, fast, and sufficient; we avoid the cost and confusion of 3D matrices. A WebGL backend (Future) can promote to mat4 at the GPU boundary without changing the domain math.

### 6.2 The three coordinate spaces

```
   WORLD SPACE                 VIEWPORT/SCREEN SPACE             CANVAS PIXELS
   (document units,        →   (CSS px in the canvas       →    (device pixels,
    infinite, where             element, after pan/zoom)         × devicePixelRatio)
    nodes live)

   node.localPosition ──(ancestor matrices)──► world point
   world point ──( translate(pan)·scale(zoom) )──► screen point
   screen point ──( × DPR )──► physical canvas pixel
```

- **World space:** where the document lives; infinite; node local coords resolve to world through ancestor transforms (PRD CAN-001).
- **Viewport (screen) space:** the visible CSS-pixel region of the `<canvas>`, after the single view transform `V = translate(panX, panY) · scale(zoom)` (PRD CAN-001).
- **Canvas pixel space:** physical pixels = screen × `devicePixelRatio` (PRD §11.1 high-DPI, EXP export at 1x/2x/3x).

### 6.3 The transformation pipeline

```
  localPoint
     │  Lnode  (node local matrix)
     ▼
  × parent world matrix  ───►  worldPoint
     │  V = translate(pan)·scale(zoom)   (the ONE view transform, CAN-001)
     ▼
  screenPoint (CSS px)
     │  × DPR
     ▼
  devicePixel  →  ctx.setTransform(DPR,0,0,DPR,0,0) once; then ctx applies V
```

**Single source of truth helpers** (used everywhere — selection, marquee, guides, rulers, minimap, hit-test):

```
screenToWorld(pt, viewport): Vector2   // (pt - pan) / zoom
worldToScreen(pt, viewport): Vector2   // pt * zoom + pan
worldMatrixOf(nodeId): Matrix3         // cached product of ancestor transforms
```

### 6.4 Operations

- **Translation / Rotation / Scaling** — composed via `Matrix3.multiply`; node transforms stored as `{position, rotation, scale}` and lowered to a matrix on demand (and cached).
- **Cursor-anchored zoom** (PRD CAN-003): keep the world point under the cursor fixed:
  `newPan = cursor − worldUnderCursor × newZoom`. (This exact math is already prototyped in the design's `zoomAt`/`onWheel`.)
- **Rotated bounds** (PRD TRN edge case): distinguish *geometry box* (local AABB) from *bounding box* (world AABB of rotated corners). Handles operate on geometry box transformed by world matrix; measurements report the disambiguated box explicitly.
- **Numeric robustness** (PRD §8.1 invalid transforms): clamp/reject `NaN`/`Infinity`; zero/negative scale flips rather than collapses; rotation normalized to `[0,360)`; corner radius clamped to ≤ half the shorter side. All validated at the geometry boundary so no bad matrix reaches the renderer.

### 6.5 Why geometry is its own pure package

- Determinism + exhaustive property-based tests (associativity of compose, invert∘transform = identity, etc.).
- Zero dependencies → trivially portable to a Web Worker or replaced by a WASM/SIMD kernel in V4 implementing identical signatures.
- No allocation on hot paths: provide both immutable APIs (default) and `*Into(out)` mutating variants for the render/drag inner loop where GC pressure matters (§12.1).

---

## 7 — Rendering Architecture

### 7.1 Pipeline

```
   SceneGraph (document)
        │  (1) Scheduler collects dirty regions + invalidated nodes
        ▼
   Render Queue
        │  (2) Cull: drop nodes whose world AABB ∉ expanded viewport
        │  (3) Sort: painter's order (parent pre-order, child zIndex asc)
        ▼
   IRenderer  (CanvasRenderer | WebGLRenderer)
        │  (4) Apply view transform once; draw each visible node
        ▼
   Canvas (<canvas> 2D context | WebGL context)
```

The pipeline is driven by a **frame scheduler** (§7.5), never by direct draw calls from tools or React.

### 7.2 Renderer interface (the critical port)

```
interface IRenderer {
  attach(canvas: HTMLCanvasElement): void
  resize(cssWidth: number, cssHeight: number, dpr: number): void
  setViewport(v: Viewport): void

  // Imperative frame: the scheduler calls this with what changed.
  renderFrame(scene: RenderScene, dirty: DirtyRegion): void

  // Capabilities probe (so the engine can adapt features per backend)
  capabilities(): { maxTextureSize?: number; supportsFilters: boolean; ... }

  dispose(): void
}
```

- `RenderScene` is a **renderer-facing projection** of the document (flat, culled, z-sorted display list of `RenderItem`s) — the renderer never walks the live scene graph or mutates it. This decoupling is what lets a WebGL backend slot in (PRD §8.1).
- Implementations: **`CanvasRenderer`** (V1), **`WebGLRenderer`** (V3/Future). Both consume identical `RenderScene`.

### 7.3 Optimizations

**Dirty-rectangle rendering.** Mutations mark the union of the node's *previous* and *new* world AABBs dirty. The scheduler clips the canvas to the dirty region and redraws only nodes intersecting it. A full-canvas repaint happens only on pan/zoom/resize. This keeps a single-node drag near-constant-cost regardless of document size.

**Viewport culling** (PRD §11.1, §8.1). Before drawing, drop any node whose world AABB doesn't intersect the viewport expanded by a margin (so partially-scrolled nodes appear). For 10k nodes with ~50 on screen, we draw ~50. Off-screen nodes remain fully in the model and selectable (PRD §8.1 — culling affects *rendering only, never logical state*). Acceleration structure: a **uniform spatial grid / loose quadtree** over world space for O(visible) culling instead of O(n) scans (built lazily, V3-scale).

**Layer caching.** Expensive, rarely-changing subtrees (e.g., a complex component instance, a static frame background) render once to an offscreen canvas (`OffscreenCanvas` where available) and blit as a bitmap until invalidated. The balance card's gradient + shadow is a prime candidate.

**High-DPI rendering** (PRD §11.1). Backing store sized `cssSize × devicePixelRatio`; `ctx.setTransform(dpr,0,0,dpr,0,0)` so all drawing is in CSS px while staying crisp on retina. Export reuses this at selectable 1x/2x/3x (PRD EXP-001).

### 7.4 Canvas2D specifics & risks

- **Text** (PRD TextNode): `measureText` for metrics; cache measured layouts keyed by `(content, font, size, weight, width)`. Text reflow-vs-scale on resize is a defined per-node policy (PRD open question Q3) resolved in the TextNode model, not the renderer.
- **Crisp strokes:** align 1px strokes to half-pixel; account for zoom so hairlines don't disappear at low zoom (PRD §8.1 boundary-zoom).
- **Effects:** drop shadows via `shadowBlur`/`shadowColor`; gradients via `createLinearGradient`. Unsupported-in-2D effects degrade gracefully and are annotated for export (PRD DEV-002 edge case).

### 7.5 Frame scheduling

- All draw requests funnel through `scheduleRender()` which **coalesces** to one `requestAnimationFrame` callback — many mutations in one tick produce one paint (PRD §11.1 no per-frame redundant work).
- The rAF callback: process input → apply pending engine state → cull → draw dirty → emit frame-timing to the console/telemetry (PRD CON-001 render timings).
- A frame-budget watchdog: if a frame exceeds budget, log a `warn` (feeds the diagnostics Console, PRD §7.3 F-18) and (V3) trigger adaptive quality (e.g., skip layer-cache refresh).

### 7.6 Performance goals (rendering)

| Metric | Target (PRD §11.1) |
|---|---|
| Interaction frame rate | 60 FPS (120 headroom on capable displays) |
| p95 frame paint (reference doc) | ≤ 8 ms |
| Objects per document | 10,000+ with smooth interaction |
| Selection response (input→highlight) | < 16 ms |
| Transform feedback | < 16 ms / frame |

---

## 8 — Interaction Engine

`packages/editor` — converts normalized pointer/keyboard input into intentions, owning selection, hover, hit-testing, and cursor.

### 8.1 Pointer system (mouse / touch / pen)

- Built on the unified **Pointer Events** API (`pointerdown/move/up/cancel`) so mouse, trackpad, touch, and pen share one path. `pointerType` distinguishes them (PRD §11.5: mouse/trackpad/keyboard V1; touch/pen Future-leaning but the plumbing exists now).
- Raw DOM events are normalized at the UI boundary into `EngineInput { worldPt, screenPt, modifiers:{shift,alt,meta,ctrl}, button, buttons, pointerType, deltas }`. The engine never sees a raw DOM event → it's testable with synthetic inputs.
- **Pinch-zoom** arrives as `ctrlKey` wheel events (PRD CAN edge case) and is handled identically to ⌘+scroll.
- Pointer capture during drags so a gesture that leaves the canvas still completes (matches the design's global `onMouseMove`/`onUp`).

### 8.2 Features

| Feature | PRD | Mechanism |
|---|---|---|
| Click select | SEL-001 | Hit-test topmost → set `selection={[id], primary:id}` |
| Shift multi-select | SEL-001 | Toggle id in set; reassign `primaryId` correctly on removal |
| Marquee | SEL-002 | Drag on empty → AABB-intersect selectable, lock-aware |
| Hit testing | §8.1 | Front-to-back z-ordered (§8.4) |
| Hover detection | — | Throttled hit-test on move; drives cursor + hover overlay |
| Cursor management | CAN-007 | Tool + interaction phase → `CursorSpec` (default/grab/crosshair) |
| Drag threshold | SEL edge | <~4px movement = click, not marquee/drag |
| Marquee normalization | SEL edge | Negative drag normalized to positive w/h |
| Cross-artboard select | SEL edge | World-space hit/intersect spans frames |

### 8.3 Cancellation & gesture lifecycle

The engine tracks an explicit `InteractionPhase` (idle → pressing → dragging/marquee/resizing/panning → committing). `Escape`, tool-switch, or `pointercancel` invokes `cancelGesture()` which restores pre-gesture state without producing a history entry (PRD TOOL edge: mid-drag tool switch cancels cleanly).

### 8.4 Hit-testing architecture

**Two-phase, front-to-back:**

1. **Broad phase** — query the spatial index (loose quadtree/grid, §7.3) for nodes whose world AABB contains the point. O(log n + k).
2. **Narrow phase** — for candidates, test precise geometry in the node's *local* space (point transformed by inverse world matrix): rect/rounded-rect containment, ellipse equation, text/​image bbox, stroke proximity for lines. Respect `visibility` and `locked` (PRD SEL-003: locked never hits).

Return the **z-ordered list** of hits (not just the top), enabling overlapping-selection cycling (PRD §8.1). Frame *backgrounds* are special: clicking a frame's empty area (hit resolves to the frame, not a child) clears selection unless shift held (PRD SEL-004).

**Handle hit-testing** (transform handles, §9): handles are screen-space fixed-size; their hit areas are computed in screen space (inverse-scaled by zoom) so they stay grabbable at any zoom (PRD TRN technical note).

---

## 9 — Transform System

`packages/editor` (interaction) + `packages/geometry` (math) + `packages/commands` (commit).

### 9.1 Operations

| Op | PRD | Notes |
|---|---|---|
| Move | TRN drag body | Δ applied to local position (axis-lock with Shift) |
| Resize | TRN-001/004 | Corner/edge handles; updates size (+ position for anchored handle) |
| Rotate | TRN-006 | Numeric in V1; handle in V2; 15° snap with Shift |
| Scale | TRN | Proportional via Shift; from-center via Alt |
| Flip | §9.2 model | Negative scale flips, never collapses |

### 9.2 Transform handles

- Single selection: 4 corner handles + dimension badge "W × H" (PRD TRN-001), rendered as a screen-space overlay (the design already shows this). V2 adds edge handles + rotation handle.
- Multi-selection: one outline per node + a combined primary bounding frame (PRD TRN-002).
- Handles are drawn at constant screen size regardless of zoom; their geometry is computed in screen space and mapped back to world for the actual transform (PRD TRN technical note).

### 9.3 Constraint & modifier system (PRD §8.9)

Modifiers are interpreted *during* a gesture and are consistent across canvas, handles, and layer tree; suppressed while a text input is focused:

| Modifier | Behavior |
|---|---|
| **Shift** | Aspect-lock on resize; axis-lock on move; 15° snap on rotate; ×10 arrow-nudge |
| **Alt/Option** | Resize/scale from center; duplicate-on-drag (drag a copy, leave original) |
| **Space** | Temporary pan with any tool; release returns to prior tool |

### 9.4 Snapping & smart guides (PRD F-6, GUI-001/002)

- V1: when a single non-frame node is selected/moved, compute distances to the parent frame's edges/center in the frame's **local space** (world position − frame origin) and render magenta dashed guides + numeric labels (the design's `guides` object is the exact target).
- V2 (GUI-003): live snapping to sibling edges/centers and equal-spacing relationships during drag, with a snap tolerance in screen px (so snapping feels consistent at all zooms). Snap candidates come from the spatial index restricted to the active frame.

### 9.5 Commit model

A transform gesture mutates a **live working copy** for instant feedback (no history entry per move). On `pointerup`, the net change is committed as **one** command (`MoveCommand`/`ResizeCommand`) capturing before/after — satisfying PRD HIS-003 (gestures coalesce into a single history entry). Numeric inspector edits commit on Enter/blur (PRD TRN-005).

---

## 10 — Command & History Architecture

`packages/commands`. Every document mutation is a command. This single rule powers undo/redo, autosave diffs, and V3 multiplayer.

### 10.1 Command interface

```
interface ICommand {
  readonly type: string
  execute(ctx: CommandContext): void     // apply mutation
  undo(ctx: CommandContext): void        // exact inverse
  redo(ctx: CommandContext): void        // default: execute()
  // for coalescing (HIS-003) and merging (rapid edits)
  mergeWith?(next: ICommand): ICommand | null
  // for V3 sync: a serializable op representation
  toOp(): Op
}
```

`CommandContext` exposes the scene graph and emits events; commands are pure w.r.t. injected context (no global state, injected `IClock`/`IdGenerator` for determinism).

### 10.2 Concrete commands (V1)

```
CreateNodeCommand     { node, parentId, index }         // inverse: remove
DeleteNodeCommand     { capturedSubtree, parentId, idx } // captures full subtree+z+selection (PRD §8.1 undo-delete-group)
MoveNodeCommand       { id, fromPos, toPos }
ResizeNodeCommand     { id, fromRect, toRect }
SetPropertyCommand    { id, path, fromValue, toValue }   // generic; covers fill, opacity, radius, text props…
ReorderCommand        { id, fromIndex, toIndex, fromParent, toParent }
GroupCommand / UngroupCommand
ReparentCommand
CompositeCommand      { children: ICommand[] }           // atomic multi-op (group, multi-delete, align)
```

`CompositeCommand` makes complex operations a single undo unit (PRD: undo group/ungroup/delete-with-children as one reversible op).

### 10.3 Undo / redo stacks (HistoryManager)

```
class HistoryManager {
  private undoStack: ICommand[] = []
  private redoStack: ICommand[] = []
  execute(cmd): void   // cmd.execute(); try-merge with top; push; clear redo (HIS-005)
  undo(): void         // pop undo → cmd.undo(); push to redo
  redo(): void         // pop redo → cmd.redo(); push to undo
}
```

- **Redo cleared on new edit** (PRD HIS-005).
- **Selection restoration:** commands optionally snapshot the selection so undo restores the prior selection state (PRD HIS-004, §8.1 undo restores prior selection) — selection itself is *not* a separate undoable action.

### 10.4 Command merging & coalescing

- **Coalescing (gestures):** the transform system already commits one command per gesture (§9.5).
- **Merging (rapid discrete edits):** consecutive `SetPropertyCommand`s on the same node+path within a short window (e.g., dragging the opacity slider, typing in a numeric field) merge via `mergeWith` into a single entry, so undo doesn't replay every intermediate value.

### 10.5 Memory considerations

- **Bounded depth** (PRD HIS edge): cap at N entries (e.g., 200); evict oldest. For very long sessions, old entries can be compacted.
- Commands store **minimal diffs** (before/after of changed fields), not full document snapshots — keeps history light even on a 10k-node doc.
- `DeleteNodeCommand` is the exception: it must retain the deleted subtree to restore it; this memory is bounded by what was deleted and released when the entry is evicted.

### 10.6 Designed to compose with multiplayer (V3)

`toOp()` lowers each command to a transport-ready **operation** that a CRDT/OT layer (`packages/sync`) can apply remotely. Undo becomes **local-intent, per-user** (PRD HIS edge, §15): a user's undo inverts *their* op against the converged state, not the global timeline. Because mutations are already discrete, serializable ops, V3 attaches without re-architecting the core ([ADR-002](#adr-002--command-pattern-for-all-mutations)).

---

## 11 — File System Architecture (`.vf`)

### 11.1 Format overview (PRD §9.3)

- **JSON-based**, extension **`.vf`**, human-readable, pretty-printable, **deterministic (sorted keys)** so files diff cleanly and multiplayer snapshots are stable.
- **Versioned schema** — every file declares `version`; loader validates against a JSON Schema (`docs/schemas/vf-<version>.json`).
- **Round-trip lossless** — serialize → `.vf` → deserialize reproduces the document exactly (PRD export/import requirement).
- **Assets by reference** — large images are stored by `assetRef` (IDB blob / CDN id), not inline, keeping JSON within parse limits (PRD §9.3 large documents). Small inline base64 only as an isolated fallback.

### 11.2 Document structure (V1)

```json
{
  "version": "1.0",
  "document": { "id": "doc-1", "title": "Finance App — Mobile", "schemaCreatedBy": "vectorforge/1.0" },
  "pages": [
    {
      "id": "page-1",
      "name": "Home Flow",
      "frames": [
        {
          "id": "frame-home",
          "type": "frame",
          "name": "Home",
          "position": { "x": 0, "y": 0 },
          "rotation": 0,
          "scale": { "x": 1, "y": 1 },
          "visibility": true,
          "locking": false,
          "zIndex": 0,
          "opacity": 1,
          "metadata": {},
          "size": { "w": 390, "h": 844 },
          "origin": { "x": 0, "y": 0 },
          "clipsContent": true,
          "backgroundColor": "#0B0B0F",
          "children": [
            {
              "id": "node-amount",
              "type": "text",
              "name": "Amount",
              "position": { "x": 24, "y": 162 },
              "rotation": 0, "scale": { "x": 1, "y": 1 },
              "visibility": true, "locking": false, "zIndex": 4, "opacity": 1,
              "metadata": {},
              "content": "$24,580.00",
              "font": "Onest", "weight": 800, "size": 34,
              "lineHeight": 40, "letterSpacing": -0.5, "align": "left",
              "fill": "#FFFFFF"
            }
          ]
        }
      ]
    }
  ],
  "styles": { "colors": {}, "text": {}, "spacing": { "base": 8 } },
  "components": [],
  "comments": [],
  "versions": []
}
```

`styles`, `components`, `comments`, `versions` are present (possibly empty) from V1 so V2/V3 additions don't bump the structural schema — only populate reserved fields (forward compatibility).

### 11.3 Serialization pipeline

```
Document (in-memory scene graph)
   │  node.toJSON() walk, deterministic key order
   ▼
Canonical VF object  ──► JSON.stringify (stable) ──► .vf text / Blob
                                                       │
Import:  .vf text ──► JSON.parse ──► schema-validate ──► migrate(version→current)
   │  fromJSON rebuild scene graph ──► integrity check (no dangling/cyclic ids)
   ▼
Document (validated)
```

### 11.4 Versioning, forward compatibility & migration

- **Migrations are sequential and idempotent** (1.0 → 1.1 → 1.2…); each is an independently-testable pure function `Migration: (docVN) => docVN+1` with fixture files (PRD §9.3 migration ordering).
- **Unknown/newer version** → open **read-only**, refuse to write back, prompt to update the app (PRD §9.3) — never silently overwrite/corrupt.
- **Forward compatibility** — unknown fields are preserved on round-trip (a newer file opened read-only in an older app keeps fields it doesn't understand rather than dropping them), reducing data loss across version skew.
- Schema + types are **codegen-linked**: JSON Schema is the source; TS types are generated from it (`scripts/`) so validator and compiler never drift.

### 11.5 Import/export & the `vfcli` tool

`tools/vfcli` (built on `document` + `persistence`) provides `vf validate <file>`, `vf migrate <file>`, `vf inspect <file>` for CI, support, and pipelines — and doubles as a headless test of the format contract.

---

## 12 — Performance Architecture

Targets restated and made measurable. The strategy: **do less work, allocate less, defer non-critical work.**

### 12.1 Memory management & object pooling

- **No allocation on the hot path** (PRD §11.1). Pan/zoom/drag inner loops use pre-allocated, reused `Vector2`/`Matrix3` scratch buffers (`*Into(out)` geometry variants, §6.5) — zero garbage per frame.
- **Object pools** for transient objects created per frame/gesture: hit-test result arrays, render-item structs, dirty-rect rectangles. Pools are bounded and cleared, not grown unbounded.
- **Structural sharing** for document snapshots (history/autosave) — copy only changed nodes, share the rest, avoiding deep clones of a 10k-node graph.

### 12.2 Virtualization

- **Layer panel** (PRD §8.3): virtualized list — render only visible rows of the flattened tree; the flatten is memoized and recomputed only on structural/selection/visibility change.
- **Canvas** (PRD §7.3, §11.1): viewport culling via spatial index (§7.3) — render only on/near-screen nodes.
- **Console/comments/versions docks:** windowed lists with capped retention (PRD CON: cap log retention).

### 12.3 Event throttling & debouncing

| Signal | Policy |
|---|---|
| Pointer-move (drag) | Coalesced to one update per rAF (don't process every event) |
| Hover hit-test | Throttled (e.g., ≤ rAF cadence) |
| Cursor presence (V3) | Throttled 30–60Hz, interpolated (PRD MUL) |
| Autosave | Debounced diff write (PRD §8.8), off main thread |
| Resize/DPR change | Debounced renderer `resize()` |
| Minimap snapshot | Throttled downscaled snapshot, not per-frame (PRD §7.3) |

### 12.4 Incremental rendering

Dirty-rectangle + layer caching (§7.3) make most frames redraw a tiny region. Initial load renders **progressively** (frames/visible content first) to hit TTI < 2s (PRD §11.1).

### 12.5 Measurable goals (the contract)

| Metric | Target | How verified |
|---|---|---|
| Interaction FPS | 60 (120 headroom) | Playwright perf harness, CDP frame stats |
| p95 frame paint (reference doc) | ≤ 8 ms | render-timing telemetry + bench |
| Objects/document | 10,000+ smooth | stress fixture (§13) |
| Selection response | < 16 ms | input→highlight timer |
| Transform feedback | < 16 ms/frame | gesture frame timing |
| Undo/redo apply+repaint | < 50 ms | bench |
| Initial load (TTI, typical doc) | < 2 s | Lighthouse/Playwright |
| Autosave success | ≥ 99.95% | telemetry counter |
| Hot-path allocation (pan/zoom/drag) | 0 bytes/frame | heap-profile assertion in perf CI |

Performance budgets are enforced in CI: a perf-regression job runs the stress fixture and fails the build if p95 paint or FPS regresses beyond a threshold.

---

## 13 — Testing Strategy

Aligned to PRD §13 and the global 80%+ coverage rule; TDD for new domain logic.

### 13.1 Unit tests (Vitest, headless, fast)

| Target | What's tested |
|---|---|
| **Math engine** (`geometry`) | Matrix compose/invert (property-based: `invert∘transform=id`, associativity), screen↔world round-trips, rect intersect/union, rotated-bounds, NaN/Infinity rejection, radius clamp. |
| **Scene graph** (`document`) | Add/remove/reparent integrity, z-order ops, traversal order (render vs hit), virtual-vs-real group separation, lock cascade, serialization round-trip determinism. |
| **Commands** (`commands`) | Every command's `execute`/`undo`/`redo` invariants: `undo∘execute = identity` (deep-equal doc), redo-clear-on-new-edit, composite atomicity, merge/coalesce behavior, delete-restores-subtree+selection. |

Property-based tests (fast-check) are mandatory for geometry and command invertibility.

### 13.2 Integration tests (Vitest + jsdom + canvas mock)

- **Editor workflows:** tool→intention→command→model→render-call. E.g., "Rect tool drag creates one RectNode + one CreateNodeCommand + one render request"; "shift-click toggles selection and reassigns primary"; "group then undo restores exact tree + selection".
- **File loading:** load valid `.vf` fixtures (incl. the reference finance-app doc), corrupted/truncated files (→ recovery mode), unknown-version files (→ read-only), and migration fixtures (1.0→current).
- **Rendering (logical):** assert the renderer receives the correct culled, z-sorted display list for a given viewport (renderer mocked to record calls).

### 13.3 Visual & E2E (Playwright, real browsers)

- **Visual regression:** screenshot-diff the reference document at fixed viewports across Chromium/Firefox/WebKit (PRD §11.5 matrix); fail on pixel drift beyond tolerance.
- **E2E flows:** create frame → draw shapes → edit text → group → reorder → undo/redo → export PNG → reload (autosave restored). Keyboard-only run for a11y (PRD §11.2): full operation via keyboard, focus trap in palette, ESC behavior.

### 13.4 Performance tests

- **FPS & frame-paint benchmarks** on the reference doc and a 10k-node stress fixture, via Playwright + CDP, asserting §12.5 targets.
- **Memory benchmarks:** heap snapshots during a sustained drag assert ~0 hot-path allocation; long-session test asserts history depth cap holds memory bounded.
- **Stress tests:** 10k/50k node documents — pan/zoom/marquee/select-all must stay within budget or fail CI.

### 13.5 Test infrastructure

`packages/testing` ships: `.vf` fixtures (valid/corrupt/versioned/stress), a synthetic-input driver for the interaction engine, a recording mock `IRenderer`, and the perf harness. Coverage gate ≥ 80% (lines+branches) on `geometry`/`document`/`commands`/`editor`; CI blocks merges below threshold.

---

## 14 — Security & Reliability

### 14.1 Corrupted / invalid file handling (PRD §8.1, §9.3)

- **Validate on load** against JSON Schema + structural integrity (no dangling/cyclic ids, numeric sanity).
- On failure: **fail safe** — open a **read-only recovery view**, surface a clear error, and **never silently overwrite** the source. Offer last-known-good recovery (autosave/version).
- Defensive parsing: size limits, depth limits (reject pathologically nested JSON → DoS guard), and a hard cap on node count before warning.

### 14.2 Data recovery

- Every save path keeps a **last-known-good** snapshot in IndexedDB separate from the live autosave slot, so a bad write can't destroy the prior good state.
- Version history (V3, PRD F-17) provides coarse recovery points; autosave provides fine-grained ones.

### 14.3 Autosave strategy (PRD FILE-001, §8.8, §11.4)

- **Debounced, diff-based** writes to IndexedDB on the document-dirty signal; payloads are minimal diffs, written off the main thread (via an idle callback / worker), never blocking interaction.
- Visible status state machine: `Saving… → All changes saved → Offline` (matches the design's save indicator).
- Autosave is decoupled from history boundaries (saving ≠ undo step).

### 14.4 Crash recovery

- On boot, check for an unflushed autosave/op-queue for the open document; if present and newer than the last clean save, prompt **"Recover unsaved changes?"**.
- The op-queue (commands not yet persisted) is itself persisted incrementally so a tab crash mid-gesture loses at most the in-flight gesture.

### 14.5 Offline support (PRD §11.4)

- Detect connectivity loss → status `Offline`; **queue mutations locally** (op-queue in IDB); keep editing against cached state.
- On reconnect: flush queue with conflict reconciliation (V1: single-user, last-write; V3: CRDT/OT merge — no dup/lost ops).
- Recently-used fonts/assets cached (IDB) with graceful font fallback (`system-ui`, PRD TOK edge).

### 14.6 Browser storage failures & multi-tab

- **Quota/permission errors:** wrap all IDB access in `Result`-returning calls; on failure, degrade to in-memory-only with a prominent "changes not being saved" warning rather than crashing.
- **Multi-tab safety** (PRD FILE edge): a `BroadcastChannel` + IndexedDB lease lock designates one tab as the writer for a given document; other tabs open read-only or follow, preventing concurrent-write corruption.
- **Private-mode / blocked storage:** detect at boot; warn and run in-memory.

### 14.7 Input & content safety

- All numeric inspector inputs validated/clamped before commit (PRD §8.1 invalid transforms).
- Text content and layer names are treated as data, never `innerHTML`; rendered to canvas as text (no XSS surface on the canvas). Chrome (React) escapes by default.
- `.vf` is data-only; no executable content is ever evaluated from a document. Plugin code (V4) runs sandboxed (§15).

---

## 15 — Future Architecture Roadmap

The V1 seams that make each future capability additive, not a rewrite.

### 15.1 V2 — Components, Assets, multi-select align, Pages

| Capability | V1 seam that absorbs it |
|---|---|
| **Components** (variants/states/properties, PRD F-13) | `ComponentInstance` already in the node union; a `ComponentDefinition` registry on `Document.components` (reserved field). Instances reference definition + `propertyOverrides`. Editing a definition emits events; instances re-resolve. |
| **Assets library** (F-14) | Presentation over existing token + component models — no new store (PRD §8.4 note). |
| **Multi-select align/distribute** (F-15) | New `CompositeCommand`s over existing transform math; selection already supports multi + bounds. |
| **Pages** (F-15) | `Document.pages[]` already the top level; only-active-page rendering is a render-scene filter; cross-page component refs resolve via the id map. |
| **Auto-layout** (Future) | A layout pass over the scene graph that writes positions before render; modeled as derived geometry, not stored absolute positions. |
| **Design tokens → managed styles** (PRD §8.10) | Tokens already structured data in `packages/tokens`; promotion to editable shared styles populates `Document.styles` without schema break. |

### 15.2 V3 — Real-time collaboration, comments, presence

| Capability | V1 seam |
|---|---|
| **CRDT/OT sync** | `packages/sync` consumes the command op-log (`ICommand.toOp()`, §10.6). The document's id-indexed map is the addressing scheme CRDTs need; deterministic serialization gives stable snapshots. |
| **Per-user undo** | History already command-based; `toOp()` enables local-intent inversion against converged state. |
| **Comments** (F-12) | Anchored to stable node `id` + offset, stored in `Document.comments` (reserved); degrade to free-floating canvas pin if the node is deleted (PRD CMT edge). |
| **Presence/cursors** (F-11) | An ephemeral, non-persisted channel parallel to the document; cursor render is an overlay layer (already in the render layering, §8.1). |
| **Dev handoff** (F-16) | CSS generation derives from the same node model the renderer uses → guaranteed fidelity; pure function `node → css`. |
| **Export expansion / minimap / console / device preview** (F-18) | Export reuses the `IRenderer` (render to offscreen at scale); minimap reuses world-bounds+viewport math (§6); console consumes the frame-timing/telemetry events already emitted (§7.5). |

### 15.3 V4 — Plugins, custom renderers, WASM

| Capability | V1 seam |
|---|---|
| **Plugin SDK** | Plugins target the same public ports first-party UI uses: dispatch commands, query the scene (read-only), register renderer overlays and panels. Run in a **sandboxed worker** with a capability-scoped message API (no direct DOM/document access) → security + stability. |
| **Custom renderers** | New `IRenderer` implementations (WebGPU, server-side); the `RenderScene` projection is backend-agnostic. |
| **WASM acceleration** | Geometry + hit-testing are pure modules with stable signatures; hot kernels swap to WASM/SIMD exports with no caller changes. The engine can also move off-main-thread (worker) since it has no DOM dependency. |

### 15.4 The invariant that protects the future

Every future layer attaches at an **existing port or reserved field** — `IRenderer`, `DocumentRepository`, `SyncTransport`, command op-log, `Document.{styles,components,comments,versions}`. No future feature requires changing `geometry`, the `BaseNode` base schema, or the command/mutation pathway. That is the definition of "support V2/V3/Future without major rewrites" (PRD §15).

---

## 16 — Engineering Decisions (ADRs)

Each ADR: **Decision · Context/Reason · Alternatives · Trade-offs · Status.**

### ADR-001 — Canvas over SVG for the artwork surface
- **Decision:** Render artwork to a single `<canvas>` (2D in V1), not retained SVG/DOM.
- **Reason:** PRD demands 10k+ nodes at 60fps (§11.1). SVG creates one persistent DOM node per element → browser layout/style/paint cost scales with node count and is uncontrollable; selection overlays/handles/marquee become DOM soup; no dirty-rect or culling control. Canvas is immediate-mode: we own the paint loop, do culling + dirty-rects, and keep cost proportional to *visible* nodes.
- **Alternatives:** SVG (great for small docs, accessibility-friendly, but doesn't scale); WebGL from day one (best ceiling but kills V1 velocity — text, crisp strokes, debugging all harder); hybrid SVG-for-chrome (we *do* use DOM for chrome, canvas for artwork).
- **Trade-offs:** We give up SVG's free DOM accessibility/hit-testing and must implement hit-testing, text layout, and a11y annotations ourselves; high-DPI needs manual handling. Accepted — performance and control are existential for this product.
- **Status:** Accepted.

### ADR-002 — Command pattern for all mutations
- **Decision:** Every document change is an `ICommand` with `execute/undo/redo`; nothing mutates the model directly.
- **Reason:** One mutation pathway gives undo/redo (PRD F-7), autosave diffs (§8.8), and a serializable op-log that V3 CRDT/OT composes with (§10.6) — for free, consistently.
- **Alternatives:** Immutable-snapshot diffing (simpler conceptually, but full-doc snapshots are memory-heavy at 10k nodes and lose semantic intent needed for merge/coalesce); event-sourcing only (heavier, harder to bound memory); ad-hoc setters (no undo, no sync path).
- **Trade-offs:** Boilerplate (every operation is a command class) and discipline (no shortcuts). Mitigated by a generic `SetPropertyCommand` + `CompositeCommand`. Accepted.
- **Status:** Accepted.

### ADR-003 — Scene graph as id-indexed map + tree links
- **Decision:** Store nodes in `Map<NodeId, Node>` with `parentId`/`childIds`, deriving the tree; not nested object references.
- **Reason:** O(1) id lookup (selection, comments, components, history all key by id), cheap structural sharing for snapshots, trivial deterministic serialization, and the stable addressing CRDTs need (§15.2).
- **Alternatives:** Nested object tree (natural traversal but O(n) find, deep-clone hazards, harder structural sharing); ECS/flat component arrays (great for raw perf but overkill and alien to a design-doc model in V1).
- **Trade-offs:** Traversal indirects through the map; we maintain parent/child consistency invariants (enforced by the scene-graph API + tests). Accepted.
- **Status:** Accepted.

### ADR-004 — Editor core is framework-independent (no React below `ui`)
- **Decision:** `geometry/document/commands/editor/renderer/persistence` must not import React; React lives only in `ui`/`apps`.
- **Reason:** Longevity (multi-year, framework may change), testability (headless), performance (hot path bypasses reconciliation), reusability (export/worker/server), and multiplayer (sync attaches to the model, not components). See §1.5.
- **Alternatives:** Build the editor *in* React state/hooks (fast to start, but couples domain truth to component lifecycle, can't hit perf budgets, un-migratable).
- **Trade-offs:** We build our own store + React binding (`useSyncExternalStore`) instead of using React state directly; a small, well-understood cost. Accepted.
- **Status:** Accepted (enforced mechanically, §3.5).

### ADR-005 — Purpose-built EditorStore over Redux/MobX
- **Decision:** A small observable store with selector subscriptions; not Redux/MobX for the document.
- **Reason:** Need synchronous engine reads, fine-grained subscriptions, headless operation, and zero reconciliation on the hot path (§2.5).
- **Alternatives:** Redux/RTK (boilerplate + immutable penalty, still too slow for the hot path); MobX (proxy cost obscured, serialization friction); Zustand/Jotai (good — and we *do* use a Zustand-like pattern for pure chrome state, but the document needs a domain-owned store).
- **Trade-offs:** ~300 lines to own and test. Accepted — it's the performance/testability fulcrum.
- **Status:** Accepted.

### ADR-006 — Renderer behind an `IRenderer` port from day one
- **Decision:** Define `IRenderer` + a backend-agnostic `RenderScene`; ship `CanvasRenderer` in V1; allow `WebGLRenderer` later.
- **Reason:** PRD §8.1/§11.1 require a path to 10k+ nodes / 120fps that Canvas2D won't fully meet; the port lets us swap backends without touching features.
- **Alternatives:** Hard-code Canvas2D (cheaper now, expensive later — a rewrite when scale hits); WebGL now (premature, §2.4).
- **Trade-offs:** A projection layer (`RenderScene`) and interface discipline add indirection. Accepted as cheap insurance against an inevitable rewrite.
- **Status:** Accepted.

### ADR-007 — Monorepo (pnpm + Turborepo) with enforced boundaries
- **Decision:** Single repo, many packages, mechanically-enforced dependency DAG.
- **Reason:** Atomic cross-package changes, shared tooling, fast cached CI, and *enforceable* architecture boundaries (the layering is only real if CI rejects violations).
- **Alternatives:** Multi-repo (versioning/coordination overhead, boundaries drift); single package (no boundaries at all — the core would rot into the UI).
- **Trade-offs:** Monorepo tooling complexity (Turborepo cache, pnpm workspaces). Accepted for a foundational, multi-team project.
- **Status:** Accepted.

### ADR-008 — IndexedDB as the local durable store
- **Decision:** IndexedDB for documents/autosave/offline-queue/asset blobs; localStorage only for tiny prefs.
- **Reason:** Async, large, structured, transactional, Blob-capable — fits autosave + offline without blocking the main thread (§2.6, §14).
- **Alternatives:** localStorage (sync, ~5MB, strings — disqualified for documents); OPFS (excellent for large files, a strong Future migration, narrower support today).
- **Trade-offs:** Awkward API (thin typed wrapper), cross-tab coordination needed (BroadcastChannel lock). Accepted.
- **Status:** Accepted; revisit OPFS for large-document storage in V3/Future.

### ADR-009 — `.vf` is deterministic, versioned JSON
- **Decision:** JSON format, sorted keys, declared `version`, schema-validated, assets by reference, sequential idempotent migrations.
- **Reason:** Diff-friendly (VCS + multiplayer snapshots), human-readable, safe to evolve, round-trip lossless (PRD §9.3).
- **Alternatives:** Binary format (smaller/faster parse, but opaque, hard to diff/debug/migrate); inline-asset JSON (parse-limit and bloat problems).
- **Trade-offs:** Larger on disk than binary; mitigated by asset-by-reference and gzip on the wire. Accepted — debuggability and evolvability win for a document format.
- **Status:** Accepted.

### ADR-010 — Geometry as a pure, dependency-free package
- **Decision:** All math in `packages/geometry` with immutable value objects (+ opt-in mutating `*Into` for hot loops); no other deps.
- **Reason:** Determinism, exhaustive property-based testing, portability to Worker/WASM, and a single source of truth for all coordinate math (§6).
- **Alternatives:** Inline math per module (drift, duplication, untestable); a third-party math lib (dependency risk, mismatch with our affine-2D needs).
- **Trade-offs:** Immutable-by-default allocates; solved with the `*Into` variants on the hot path. Accepted.
- **Status:** Accepted.

---

### Closing note

This architecture is deliberately conservative where it must last (the pure core: geometry, document, commands) and deliberately swappable where the industry moves fast (renderer, storage, framework, transport). Every PRD future capability — components, collaboration, plugins, WASM — has a named seam it attaches to. A senior team can begin implementation by building, in order: `geometry` → `document` → `commands` → `editor` (store/controller/tools) → `renderer` (Canvas2D) → `persistence`, with the React `ui` binding to the store last. Each is independently testable the day it's written.

*End of ARCHITECTURE.md.*
