# @vectorforge/ui

> Layer: **presentation** · Implementation: **Sprint 7**

The React component library for the editor chrome. Together with `apps/web` this
is the **only** place React is allowed (ARCHITECTURE.md §1.5). Components are
thin: they read from the `EditorStore` and dispatch **intentions** — they hold
no business logic.

## Responsibilities

- Chrome components: top toolbar, left panel (Layers/Assets/Pages), right
  inspector, bottom dock (Comments/History/Dev/Console), command palette,
  context menu, zoom pill, minimap.
- React bindings to the editor store (`useEditorSelector` via
  `useSyncExternalStore`).
- Styling via Tailwind CSS (the design tokens live in the document model, not here).

## Public API

Re-exported from [`src/index.ts`](./src/index.ts).

## Dependency rules

|               |                             |
| ------------- | --------------------------- |
| May import    | editor, shared              |
| Imported by   | apps/web                    |
| React allowed | ✅ yes (presentation layer) |

> Business logic must never live in a React component — it belongs in
> `@vectorforge/editor` and `@vectorforge/commands`.

See [docs/ENGINE_CONTRACT.md §5, §6](../../docs/ENGINE_CONTRACT.md).
