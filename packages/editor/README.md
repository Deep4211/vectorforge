# @vectorforge/editor

> Layer: **application** · Status: **implemented (Sprint 4)** · Dependencies: commands, document, geometry, shared

The editor core — the framework-independent heart of VectorForge (ARCHITECTURE.md
§4; ENGINE_CONTRACT.md §4). It turns user **intentions** into **commands** against
the document and projects state back for the UI to render. It runs headless: **no
React, no DOM** (EDT-1).

## Pieces

- **`EditorStore`** — the observable state container. Holds the ephemeral editor
  state (tool, viewport, selection, hover, interaction, draft) and a reference to
  the document `SceneGraph`. Synchronous reads (`getState`/`getScene`) for the hot
  path; fine-grained `subscribe(selector, cb)` so a pan doesn't wake a selection
  subscriber (EDT-5). A single `set` write path (EDT-3).
- **`EditorController`** — the use-case entry point. Builds commands and runs them
  through a `HistoryManager`; **never mutates the document directly** (EDT-4). Owns
  selection (EDT-6) and restores it across undo/redo. Implements `ToolHost`.
- **Tool state machine** — `move` / `frame` / `rectangle` / `ellipse` / `text` /
  `hand`, driven by framework-agnostic `EngineInput`. Switching tools cancels any
  in-progress gesture (EDT-7).
- **Hit-testing** — `hitTest` (front-to-back, lock/visibility-aware) and
  `marqueeHits` over world-space bounds.

## What you can drive (headless)

```ts
import { EditorController } from '@vectorforge/editor';
import { Rectangle, Vector2 } from '@vectorforge/geometry';

const editor = new EditorController({ scheduler: { requestRender() {} } });

const id = editor.createShape('rectangle', new Rectangle(10, 20, 200, 120)); // selected
editor.moveSelectionBy(new Vector2(40, 0));
editor.setProperty(id, 'fill', '#7C5CFF');
editor.group();
editor.undo(); // reverts the document AND restores the prior selection
editor.zoomAt(new Vector2(400, 300), 2); // cursor-anchored

// or via tools + synthetic input (the UI feeds real pointer/keyboard later):
editor.setTool('rectangle');
editor.handlePointerDown({
  world: new Vector2(0, 0),
  screen: new Vector2(0, 0),
  button: 'primary',
  modifiers: { shift: false, alt: false, meta: false, ctrl: false },
  pointerType: 'mouse',
});
```

Intentions: `createShape`/`createText`, `moveSelectionBy`, `setProperty`,
`deleteSelection`, `group`/`ungroup`, `bringToFront`/`sendToBack`/`bringForward`/
`sendBackward`, `undo`/`redo`. Selection (ephemeral): `select`/`toggleSelect`/
`selectMany`/`selectMarquee`/`clearSelection`. Viewport: `setViewport`/`panBy`/
`zoomAt`. Input: `handlePointerDown/Move/Up`, `handleKeyboard`, `setTool`.

## Boundaries

Document mutations go **only** through commands (EDT-2/DOC-2). Ephemeral changes
(selection, viewport, tool, hover) never mark the document dirty. Keyboard
shortcuts are suppressed while a text input is focused, except Escape (EDT-8).

## Scope notes

Hit-testing uses world-space AABBs (exact for unrotated nodes); the spatial index
and precise narrow phase arrive in Sprint 6. Live drag is previewed via an
ephemeral `dragOffset` and committed as one command on release (Sprint 6 adds
snapping/handles). There is still no rendering — pixels arrive in Sprint 5.

## Testing

```bash
pnpm --filter @vectorforge/editor test
```

Covers store subscriptions, hit-test, intention→command→scene + render scheduling,
selection model + lock-awareness, selection-restoring undo/redo, tool gesture
lifecycle + switch-cancel, viewport anchor, and the keyboard focus guard. ~96%
line coverage.

## Dependency rules

|               |                                                                               |
| ------------- | ----------------------------------------------------------------------------- |
| May import    | commands, document, geometry, shared                                          |
| Imported by   | ui                                                                            |
| React allowed | ❌ no — the editor must never depend on a UI framework (ARCHITECTURE.md §1.5) |

See [docs/ENGINE_CONTRACT.md §4, §6](../../docs/ENGINE_CONTRACT.md).
