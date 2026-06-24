# VectorForge

> A high-performance, browser-native collaborative vector & UI design platform —
> built on a custom rendering engine, a layer-based scene graph, and a
> framework-independent editor core.

[![CI](https://github.com/your-org/vectorforge/actions/workflows/ci.yml/badge.svg)](./.github/workflows/ci.yml)
&nbsp;·&nbsp; License: MIT &nbsp;·&nbsp; pnpm workspaces · TypeScript · React 19 · Vite 6 · Vitest 3

---

## Introduction

VectorForge is a professional, browser-native vector design platform for
designing, prototyping, and handing off digital product interfaces. It combines
an infinite zoomable canvas, a layer-based document model, reusable components,
real-time multiplayer, commenting, version history, and developer handoff into a
single tool that runs entirely in the browser with no install.

This repository is the engineering monorepo. It is currently at **Sprint 0 —
Repository Foundation**: the production-grade toolchain and package architecture
are in place; feature implementation begins at Sprint 1 (see
[docs/ROADMAP.md](./docs/ROADMAP.md)).

## Vision

> Make professional interface design a fast, multiplayer, browser-native craft —
> where a single shared document carries an idea from first rectangle to
> developer-ready handoff, with zero setup and no lost work.

Three principles drive every decision:

1. **The browser is the product.** No native app, no install. Rendering,
   editing, multiplayer, and export all happen in a modern browser at 60 FPS.
2. **Speed is a feature.** A keyboard-first workflow and single-digit-millisecond
   frame budgets let expert users operate as fast as they think.
3. **One file, end to end.** Design, review, iterate, and ship live in the same
   document, so context is never lost in a handoff.

## Architecture overview

VectorForge is a strict **layered** system; dependencies point downward only.
The most valuable, longest-lived asset — the editor core — is the most isolated
and is **independent of any UI framework**.

```
┌──────────────────────────────────────────────────────────────┐
│  PRESENTATION         apps/web · packages/ui   (React only)    │
├──────────────────────────────────────────────────────────────┤
│  APPLICATION          packages/editor          (controller,    │
│                                                  store, tools)  │
├──────────────────────────────────────────────────────────────┤
│  DOMAIN / CORE        packages/document, commands, geometry     │
│                       (pure, deterministic, no DOM, no React)   │
├──────────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE       packages/renderer, persistence            │
│                       (Canvas2D today, WebGL later; IndexedDB)  │
└──────────────────────────────────────────────────────────────┘
```

Four non-negotiable invariants (full list in [ENGINE_CONTRACT.md](./docs/ENGINE_CONTRACT.md)):

- The editor engine runs **without a DOM or UI framework** — it is testable in
  Node and survives a framework migration.
- The **document model is the single source of truth**; everything else is a
  projection.
- **All document mutations flow through commands** (one pathway powers undo/redo,
  autosave, and future multiplayer).
- The **renderer is an interface** (`IRenderer`), not a concrete class — Canvas2D
  now, WebGL/WebGPU later, with no feature rewrites.

Full design: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) · Product spec:
[docs/PRD.md](./docs/PRD.md).

## Monorepo structure

```
vectorforge/
├── apps/
│   └── web/                 # @vectorforge/web — React+Vite composition root
├── packages/
│   ├── geometry/            # pure math: Vector2, Matrix3, Rect, BoundingBox
│   ├── document/            # scene graph, BaseNode hierarchy, .vf schema
│   ├── commands/            # command pattern + undo/redo history
│   ├── editor/              # framework-independent controller + store + tools
│   ├── renderer/            # IRenderer port + Canvas2D renderer
│   ├── persistence/         # IndexedDB/localStorage + .vf I/O
│   ├── ui/                  # React chrome component library
│   └── shared/              # cross-cutting primitives + ports (leaf)
├── docs/                    # PRD, ARCHITECTURE, ENGINE_CONTRACT, ROADMAP
├── scripts/                 # boundary + package-standard guardrails
└── .github/workflows/       # CI pipeline
```

Each package owns `src/`, `tests/`, `README.md`, `package.json`, `tsconfig.json`,
and exposes a single public API via `src/index.ts`. Per-package responsibilities
and dependency rules are in [docs/ENGINE_CONTRACT.md §6](./docs/ENGINE_CONTRACT.md)
and each package's README.

## Technology stack

| Concern            | Choice                                                                      |
| ------------------ | --------------------------------------------------------------------------- |
| Language           | TypeScript (strict, project references)                                     |
| Monorepo           | pnpm workspaces                                                             |
| App framework      | React 19 (presentation layer only)                                          |
| Build / dev server | Vite 6                                                                      |
| Styling            | Tailwind CSS v4                                                             |
| Rendering          | Canvas 2D (V1) behind an `IRenderer` port (WebGL/WebGPU later)              |
| State              | Purpose-built framework-agnostic `EditorStore`                              |
| Storage            | IndexedDB (durable) + localStorage (prefs) → cloud (V2/V3)                  |
| Testing            | Vitest + Testing Library (unit/integration), Playwright (E2E/visual, later) |
| Quality            | ESLint (flat) · Prettier · commitlint · Husky · lint-staged                 |

Rationale and trade-offs for each: [docs/ARCHITECTURE.md §2](./docs/ARCHITECTURE.md).

## Development philosophy

- **Framework independence.** The editor core never imports React. Business
  logic lives in `editor`/`commands`, never in components.
- **Mutations via commands only.** Every document change is a reversible command.
- **Boundaries are enforced, not suggested.** Two independent guardrails (ESLint
  plus a package-graph checker) fail the build on any illegal dependency,
  circular dependency, or React import in the core.
- **Many small, focused files; high cohesion, low coupling.**
- **Tests first for domain logic.** ≥ 80% coverage on `geometry`, `document`,
  `commands`, `editor`.

## Getting started

**Prerequisites:** Node `>= 20` (see [`.nvmrc`](./.nvmrc)) and pnpm `>= 10`
(`corepack enable` will provide the pinned version).

```bash
# 1. install dependencies
pnpm install

# 2. start the dev server (http://localhost:5173)
pnpm dev

# 3. run the full local validation suite (what CI runs)
pnpm validate
```

## Available commands

Run from the repository root.

| Command                             | Description                                                  |
| ----------------------------------- | ------------------------------------------------------------ |
| `pnpm dev`                          | Start the web app dev server (Vite).                         |
| `pnpm build`                        | Typecheck-build all packages (`tsc -b` project references).  |
| `pnpm build:web`                    | Production build of the web app.                             |
| `pnpm preview`                      | Preview the production web build.                            |
| `pnpm typecheck`                    | Typecheck packages (project references) + the app.           |
| `pnpm lint` / `pnpm lint:fix`       | Lint (and auto-fix) with ESLint.                             |
| `pnpm format` / `pnpm format:check` | Format (or check) with Prettier.                             |
| `pnpm test`                         | Run all unit/integration tests once (Vitest).                |
| `pnpm test:watch`                   | Run tests in watch mode.                                     |
| `pnpm test:coverage`                | Run tests with a coverage report.                            |
| `pnpm check:packages`               | Verify every package follows the required layout.            |
| `pnpm check:boundaries`             | Verify the dependency DAG (no illegal/circular deps).        |
| `pnpm validate`                     | format:check → lint → typecheck → checks → test (CI parity). |
| `pnpm clean`                        | Remove build/test artifacts.                                 |

Target one package with pnpm filters, e.g. `pnpm --filter @vectorforge/web dev`.

## Roadmap summary

| Sprint   | Theme                                                              |
| -------- | ------------------------------------------------------------------ |
| **0** ✅ | Repository foundation & engineering setup                          |
| 1        | Geometry engine (Vector2/Matrix3/Rect, coordinate pipeline)        |
| 2        | Document model & scene graph                                       |
| 3        | Command system & history (undo/redo)                               |
| 4        | Editor core & state management                                     |
| 5        | Rendering engine (Canvas2D behind `IRenderer`)                     |
| 6        | Interaction system (selection, transform, shortcuts)               |
| 7        | UI integration (React chrome)                                      |
| 8        | Persistence & `.vf` file format                                    |
| 9        | Performance optimization (10k+ nodes, 60 FPS)                      |
| 10       | Advanced features (components, handoff, collaboration foundations) |

Detailed goals/deliverables/acceptance/testing per sprint:
[docs/ROADMAP.md](./docs/ROADMAP.md).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). In short: branch, follow Conventional
Commits (enforced by commitlint), keep changes within package boundaries, and
make `pnpm validate` pass before opening a PR.

## License

[MIT](./LICENSE) © Deep Maheshwari.
