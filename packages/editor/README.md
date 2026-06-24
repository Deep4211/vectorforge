# @vectorforge/editor

> Layer: **application** · Status: **implemented (Sprints 4 + 6)** · Dependencies: commands, document, geometry, shared

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
- **Hit-testing** (§8.4) — two-phase, front-to-back: a broad-phase world-AABB
  prune then a precise **narrow phase** in each node's local space (rounded-rect,
  ellipse, rotated geometry, line stroke-proximity). `hitTest` (topmost),
  `hitTestAll` (z-ordered, for overlap cycling), and `marqueeHits`.
- **Transform handles** (§9) — `selectionWorldBounds` + eight screen-space
  handles (`handleScreenPoints` / `hitTestHandle`) and the pure `resizeRect` math
  (aspect-lock, resize-from-center). A resize commits one move+resize history entry.
- **Interaction** — overlapping-click cycling, a drag threshold (sub-4px = click),
  Shift axis-lock on move, hover + `resolveCursor`, arrow-key nudge (×10 with
  Shift), an IME guard, and V1 **alignment guides** (`alignmentGuides`: gaps +
  center to the parent frame).

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
`sendBackward`, `undo`/`redo`. Resize: `beginResize`/`updateResize`/`commitResize`.
Selection (ephemeral): `select`/`toggleSelect`/`selectMany`/`selectCycle`/
`selectMarquee`/`clearSelection`. Query/overlay: `selectionBounds`/`hitTestHandle`/
`guides`/`updateHover`/`cursor`. Viewport: `setViewport`/`panBy`/`zoomAt`. Input:
`handlePointerDown/Move/Up`, `handleKeyboard` (shortcuts + arrow-nudge), `setTool`.

## Boundaries

Document mutations go **only** through commands (EDT-2/DOC-2). Ephemeral changes
(selection, viewport, tool, hover) never mark the document dirty. Keyboard
shortcuts are suppressed while a text input is focused, except Escape (EDT-8).

## Scope notes

Interaction is **headless** here: raw Pointer-Event → `EngineInput` normalization
(`handlePointerDown/Move/Up/Cancel` consume already-normalized input), the command
palette, and the visual overlay (handles/guides/marquee rendering) land in
Sprint 7 (UI). Hit-testing is a linear front-to-back scan; the spatial
acceleration index is Sprint 9 (performance). Resize runs in the node's **own
local frame**, so rotated/scaled nodes resize correctly; the handle _overlay_,
however, is drawn on the selection's world AABB, so for a rotated node the handle
markers sit on the bounding box rather than the rotated edge — refined alongside
the V2 rotation handle. Alt-duplicate-on-drag is V2; resize tracks the **primary**
node of a multi-selection. Live drag/resize preview is ephemeral (`dragOffset` /
`resizePreview`) and committed as one command on release.

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
