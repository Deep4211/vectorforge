# @vectorforge/ui

> Layer: **presentation** · Status: **implemented (Sprint 7)** · Dependencies: editor, shared

The React component library for the editor chrome. Together with `apps/web` this
is the **only** place React is allowed (UI-1). Components are thin: they read
store-derived **view models** and dispatch **intentions** — no business logic
(UI-2). It imports only `@vectorforge/editor` + `@vectorforge/shared`; the
renderer is injected at the composition root behind a port (UI-5).

## Pieces

- **Store binding** — `EditorProvider` + `useEngine`/`useController`/`useStore`,
  and `useEditorSelector` (over `useSyncExternalStore`) for fine-grained reads so
  a pan does not re-render the inspector (UI-3). `useDocumentVersion` gates
  scene-derived view models (`controller.outline()` / `controller.inspection()`).
- **`CanvasEngine` port** — the renderer + frame loop, created and injected at
  `apps/web` (UI-5). `CanvasStage` owns the `<canvas>` as an opaque ref and drives
  it imperatively through the port (UI-4); React never paints.
- **Input normalization** — `toEngineInput` / `toKeyInput` convert raw DOM events
  to the engine's framework-agnostic `EngineInput`/`KeyInput` at the boundary.
- **Chrome** — `Toolbar`, `LayersPanel` (accessible `role="tree"`), `Inspector`
  (empty / single / multi modes; edits commit as commands), `ZoomControls`,
  `CommandPalette` (Cmd+K, modal focus trap), and `EditorShell` (layout).

## Accessibility (UI-6)

Toolbar/zoom expose roles + `aria-pressed`/labels; the layer panel is a keyboard
tree; the command palette is a modal dialog with a focus trap and focus
restoration; reduced-motion is honored by the app theme.

## Scope notes

The Assets/Pages panels, context menu, and minimap are not built yet; arrow-key
roving-tabindex tree navigation is a refinement. Playwright E2E + visual diffs
await the browser-matrix harness. The handle/guide overlay rendering rides on the
renderer (the engine paints selection chrome) — the React layer never draws it.

## Testing

```bash
pnpm --filter @vectorforge/ui test
```

Covers the toolbar, inspector modes, layer-tree a11y roles, the command-palette
focus trap, and selector isolation (a pan does not re-render a selection consumer).

## Dependency rules

|               |                             |
| ------------- | --------------------------- |
| May import    | editor, shared              |
| Imported by   | apps/web                    |
| React allowed | ✅ yes (presentation layer) |

See [docs/ENGINE_CONTRACT.md §4 (UI-1..6), §6](../../docs/ENGINE_CONTRACT.md).
