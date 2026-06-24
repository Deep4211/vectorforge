# @vectorforge/web

> Layer: **presentation / composition root** · App shell live from Sprint 0

The VectorForge web application — the **composition root** that wires every
layer together via dependency injection: it instantiates the editor core,
selects a concrete `IRenderer` (Canvas2D in V1), mounts the persistence adapter,
and renders the `@vectorforge/ui` chrome.

This is one of only two places React is allowed (the other being
`@vectorforge/ui`). It contains **no** business logic — it composes packages.

## Stack

React 19 · Vite 6 · Tailwind CSS v4 · TypeScript.

## Commands

```bash
pnpm dev          # start the dev server (from repo root)
pnpm build:web    # production build
pnpm preview      # preview the production build
```

Run directly inside the package with `pnpm --filter @vectorforge/web <script>`.

## Current state

A Sprint 0 boot screen that imports the public API of every workspace package to
prove the dependency graph resolves end to end. It is replaced by the editor
shell during Sprint 7 (UI Integration) — see [docs/ROADMAP.md](../../docs/ROADMAP.md).
