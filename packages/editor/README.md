# @vectorforge/editor

> Layer: **application** · Implementation: **Sprint 4**

The editor core — the framework-independent heart of VectorForge. It turns user
**intentions** into **commands** against the document and projects state back to
the UI (ARCHITECTURE.md §4). It runs headless (no DOM, no React).

## Responsibilities

- `EditorController` — the single entry point for every user action; validates
  intentions and dispatches commands (never mutates the document directly).
- `EditorStore` — the observable state container (document + ephemeral editor
  state) with fine-grained selector subscriptions.
- The tool state machine (Move, Frame, Rect, Ellipse, Text, Hand).
- The interaction engine (selection, hover, hit-testing, gesture lifecycle).
- Viewport (pan/zoom) and selection models.

## Public API

Re-exported from [`src/index.ts`](./src/index.ts).

## Dependency rules

|               |                                                                               |
| ------------- | ----------------------------------------------------------------------------- |
| May import    | commands, document, geometry, shared                                          |
| Imported by   | ui                                                                            |
| React allowed | ❌ no — the editor must never depend on a UI framework (ARCHITECTURE.md §1.5) |

See [docs/ENGINE_CONTRACT.md §4, §6](../../docs/ENGINE_CONTRACT.md).
