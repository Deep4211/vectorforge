# VectorForge — Product Requirements Document

| | |
|---|---|
| **Product** | VectorForge — Browser-based collaborative vector & UI design platform |
| **Document type** | Product Requirements Document (PRD) |
| **Version** | 1.1 |
| **Status** | Draft for engineering & design review |
| **Changes in 1.1** | Concrete performance budgets; formalized document hierarchy + common element schema; `.vf` file format spec; consolidated canvas edge cases; expanded keyboard/modifier system; sharpened accessibility requirements |
| **Owner** | Product Management |
| **Source of truth** | Reverse-engineered from the approved high-fidelity UI design (`DesignOS_dc.html`) |
| **Last updated** | 2026 |

---

## 1. Executive summary

VectorForge is a professional, browser-native vector design platform for designing, prototyping, and handing off digital product interfaces. It combines an infinite zoomable canvas, a layer-based document model, reusable components, real-time multiplayer collaboration, commenting, version history, and developer handoff into a single tool that runs entirely in the browser with no install.

The approved UI design positions VectorForge against Figma and Framer: a dark, dense, keyboard-first workspace built around a center tool cluster, a left layers/assets/pages panel, a center canvas with rulers and minimap, a right multi-state inspector, and a bottom dock for comments, version history, dev handoff, and a render console. The reference document being designed in the mock is a multi-screen mobile finance app, which establishes the target use case: high-fidelity UI/product design at frame/artboard granularity.

This PRD translates the design into a phased, buildable product specification: a focused MVP that establishes the canvas + editing core, then collaboration, components, and handoff layered on in V2/V3, with a future roadmap covering prototyping, plugins, and design systems at scale.

---

## 2. Product vision

> **Make professional interface design a fast, multiplayer, browser-native craft — where a single shared document carries an idea from first rectangle to developer-ready handoff, with zero setup and no lost work.**

Three principles drive every decision:

1. **The browser is the product.** No native app, no install, no platform lock-in. Everything — rendering, editing, multiplayer, export — happens in a modern browser at 60fps.
2. **Speed is a feature.** A keyboard-first workflow (command palette, single-key tools, shortcut-driven everything) lets expert users operate the tool as fast as they can think. Frame paint budget is single-digit milliseconds.
3. **One file, end to end.** Design, review (comments), iterate (version history), and ship (dev handoff + export) live in the same document so context is never lost in a handoff.

VectorForge wins when a product team can open a URL, design a multi-screen flow together in real time, leave review comments, and hand engineers measured, copy-ready CSS — all without leaving the tab.

---

## 3. Target users

### 3.1 Primary persona — Product / UI Designer ("Alex")
- **Role:** Owns screen design for digital products (web/mobile apps).
- **Needs:** Pixel-accurate frames, reusable components with variants and states, fast layout, consistent design tokens, smart alignment.
- **Pain today:** Tool sprawl, slow handoff, components drifting out of sync, files locked to one machine.
- **Success looks like:** Ships a multi-screen flow with a consistent component library and clean specs in hours, not days.

### 3.2 Secondary persona — Design reviewer / PM / Stakeholder ("Mira")
- **Role:** Reviews and approves designs, rarely edits geometry.
- **Needs:** View designs in context, leave threaded comments, resolve threads, compare versions, approve.
- **Pain today:** Review happens in screenshots and chat; feedback loses anchor to the artwork.
- **Success looks like:** Comments anchored to layers, resolved inline, with a visible approval trail.

### 3.3 Secondary persona — Front-end Engineer ("Jordan")
- **Role:** Implements the design in code.
- **Needs:** Exact measurements, computed CSS, exportable assets, token values, distances between elements.
- **Pain today:** Re-measuring by eye, guessing tokens, asset export round-trips.
- **Success looks like:** Selects a layer, reads measurements + copies generated CSS, exports assets at the right scale.

### 3.4 Persona priority for sequencing
MVP must fully serve **Alex (designer)** as a single-player editor. V2 brings in **Mira (reviewer)** via multiplayer + comments. V2/V3 brings in **Jordan (engineer)** via dev handoff + export.

---

## 4. Core problems being solved

| # | Problem | How VectorForge addresses it |
|---|---------|------------------------------|
| P1 | Design tools require installs, sync to one machine, and risk lost work. | 100% browser-based, cloud-persisted, continuous autosave ("All changes saved" state). |
| P2 | Handoff between design and engineering is lossy and manual. | Built-in dev handoff: live measurements + generated CSS + asset export inside the file. |
| P3 | Review feedback is detached from the artwork. | Layer-anchored, threaded comments with resolve state, in the same document. |
| P4 | Components drift; manual reuse causes inconsistency. | First-class components with variants, states, properties, and an Assets library. |
| P5 | Iteration history is invisible; "undo" is the only safety net. | Version history timeline with named checkpoints and one-click restore, plus deep local undo/redo. |
| P6 | Expert users are slowed by mouse-driven menus. | Keyboard-first: single-key tools, command palette (⌘K), comprehensive shortcuts. |
| P7 | Large multi-screen documents become slow and disorienting. | Infinite canvas with rulers, dot grid, zoom 5–400%, minimap navigation, smart alignment guides. |

---

## 5. Success metrics

**North Star:** Weekly active editing documents that reach a "handoff or export" event.

| Category | Metric | Target (12 months post-GA) |
|---|---|---|
| Activation | % of new users who create + edit a frame in first session | ≥ 60% |
| Engagement | Median canvas-active minutes / editing session | ≥ 25 min |
| Collaboration | % of documents with ≥ 2 distinct editors in a week | ≥ 35% |
| Handoff | % of documents reaching export or "copy CSS" | ≥ 40% |
| Performance | p95 frame paint time on reference doc | ≤ 8 ms (≈120fps headroom) |
| Reliability | Autosave success rate | ≥ 99.95% |
| Retention | Week-4 editor retention | ≥ 45% |

---

## 6. Release strategy & scope

VectorForge ships in four tranches. Each feature below is tagged with its release. The guiding rule: **MVP must be a fully usable single-player design editor**; collaboration, components, and handoff are additive layers that do not require re-architecting the core.

| Release | Theme | Outcome |
|---|---|---|
| **MVP / V1** | The editor core | One person can design multi-frame screens with shapes, text, layers, transforms, inspector, undo/redo, autosave, and local file management. |
| **V2** | Multiplayer & components | Real-time co-editing, presence, comments, reusable components with variants/states, assets library. |
| **V3** | Handoff & scale | Dev handoff (measure + CSS + export), version history, pages, design tokens as managed styles, minimap, render console. |
| **Future** | Platform | Prototyping/interactions, plugin API, auto-layout, advanced vector (pen/boolean), branching, enterprise design systems. |

### 6.1 Feature-to-release matrix

| Feature area | MVP / V1 | V2 | V3 | Future |
|---|:--:|:--:|:--:|:--:|
| Infinite canvas, pan/zoom, rulers, dot grid | ✅ | | | |
| Tool system (Move, Frame, Rect, Ellipse, Text, Hand) | ✅ | | | |
| Pen / advanced vector | | | | ✅ |
| Layers panel (tree, vis/lock, reorder) | ✅ | | | |
| Selection (click, shift, marquee) | ✅ | | | |
| Transform controls (resize, move, rotate, radius) | ✅ | | | |
| Inspector (position, fill, appearance, text) | ✅ | | | |
| Smart alignment guides | ✅ | | | |
| History (undo/redo) | ✅ | | | |
| File management (create/open/autosave/rename) | ✅ | | | |
| Keyboard shortcuts + command palette | ✅ | | | |
| Design tokens (built-in scale) | ✅ | | | |
| Export (PNG/SVG/PDF) | partial (PNG) | | ✅ | |
| Real-time multiplayer + presence | | ✅ | | |
| Comments (threaded, resolve) | | ✅ | | |
| Components (variants, states, properties) | | ✅ | | |
| Assets library (components/colors/type) | | ✅ | | |
| Align/distribute (multi-select) | | ✅ | | |
| Pages | | ✅ | | |
| Dev handoff (measure, CSS, copy) | | | ✅ | |
| Version history + restore | | | ✅ | |
| Minimap | | | ✅ | |
| Render/diagnostics console | | | ✅ | |
| Managed styles/tokens (shared, editable) | | | ✅ | |
| Device preview frames | | | ✅ | |
| Prototyping / interactions | | | | ✅ |
| Plugin / extension API | | | | ✅ |
| Auto-layout / constraints | | | | ✅ |
| Branching / merge | | | | ✅ |

---

## 7. Feature breakdown (by release)

Each feature lists **User workflow**, **Functional requirements**, **Edge cases**, and **Technical considerations**. Requirement IDs are stable for traceability.

### 7.1 MVP / V1 — The editor core

#### F-1. Infinite canvas & viewport navigation
**User workflow:** The user lands in a dark canvas with horizontal/vertical rulers and a dot grid. They scroll/trackpad to pan, pinch or ⌘+scroll to zoom toward the cursor, press the Hand tool (H) or hold Space/middle-mouse/Alt to drag-pan, and use the zoom pill (bottom-left) or shortcuts to jump to fit/100%/50%/200%.

**Functional requirements:**
- CAN-001: Canvas is an infinite 2D world; content is positioned in world coordinates and projected via a single transform `translate(panX, panY) scale(zoom)`.
- CAN-002: Zoom range is **5%–400%** (0.05–4.0), clamped at both ends.
- CAN-003: ⌘/Ctrl + scroll zooms toward the pointer (cursor-anchored zoom); plain scroll/trackpad pans.
- CAN-004: Zoom pill shows current percentage and exposes: Zoom in (⌘+), Zoom out (⌘−), Zoom to fit (⇧1), 50%, 100% (⇧0), 200%.
- CAN-005: Rulers (top + left, 26px) display world-unit ticks (minor/major) and numeric labels that track pan/zoom; a corner box anchors their origin.
- CAN-006: A dot grid renders behind content, spacing scaled by zoom (min dot spacing 8px), offset to stay aligned to world origin.
- CAN-007: Cursor reflects active tool (default arrow; grab for Hand; crosshair for Comment).
- CAN-008: Keyboard zoom: `+`/`=` zoom in, `-`/`_` zoom out, ⇧1 fit, ⇧0 100%.

**Edge cases:**
- Extreme zoom-out with thousands of nodes must not freeze; cull off-screen nodes.
- Pinch-zoom on trackpads emits `ctrlKey` wheel events on most browsers — must be handled identically to ⌘+scroll.
- Sub-pixel rounding at fractional zoom must not cause ruler-label jitter or grid drift.
- Panning past content has no boundary (infinite); "fit" must still resolve a sensible framing when the document is empty.

**Technical considerations:**
- Single GPU-composited transform layer with `will-change: transform`; avoid per-node layout on pan/zoom.
- Maintain `screen↔world` conversion helpers as the single source of truth (used by selection, marquee, guides, rulers, minimap).
- Consider canvas/WebGL renderer for V3 scale; MVP may use DOM/SVG but must abstract the renderer behind a scene API.

---

#### F-2. Tool system
**User workflow:** A centered tool cluster in the top toolbar presents the active tools. The user clicks a tool or presses its single-key shortcut. The active tool is highlighted (accent fill). Tools determine what a canvas press does (select, draw a frame/shape, place text, pan, or drop a comment).

**Functional requirements (MVP tools):**
- TOOL-001: **Move (V)** — default; selects, moves, and transforms nodes.
- TOOL-002: **Frame (F)** — draws artboard/frame containers.
- TOOL-003: **Rectangle (R)** — draws rectangles.
- TOOL-004: **Ellipse (O)** — draws ellipses.
- TOOL-005: **Text (T)** — places and edits text.
- TOOL-006: **Hand (H)** — pans the canvas (also via Space-hold / middle-mouse / Alt-drag regardless of active tool).
- TOOL-007: Active tool state is global, visually indicated, and reflected in the cursor.
- TOOL-008: Single-key shortcuts switch tools only when focus is not in an input/textarea.
- TOOL-009 (V2): **Comment (C)** tool; **Pen (P)** moves to Future for full vector.

**Edge cases:**
- Pressing a tool shortcut while typing in an inspector field must NOT switch tools (input focus guard).
- Drawing a zero-size shape (click without drag) should create a default-sized node or no-op consistently.
- Tool switch mid-drag must cancel the in-progress operation cleanly.

**Technical considerations:**
- Tools implemented as a state machine: each tool defines `onCanvasDown/Move/Up` handlers; the active tool owns pointer interpretation.
- The Frame tool produces a container that other nodes can belong to (artboard semantics); this affects coordinate origins (see Data model §9).

---

#### F-3. Layers
**User workflow:** The left panel's Layers tab shows a hierarchical tree of the document. The user expands/collapses groups via carets, selects a layer (syncs to canvas + inspector), toggles visibility (eye) and lock, and reorders/regroups via context menu. Frames, groups, text, components, and images each have a distinct icon.

**Functional requirements:**
- LAY-001: Tree renders nested nodes with depth-based indentation and expand/collapse carets for nodes with children.
- LAY-002: Each row shows: type icon (frame/group/text/component/image/shape), name, visibility toggle, lock toggle.
- LAY-003: Selecting a row selects the node on canvas and drives the inspector; shift-click extends selection.
- LAY-004: Visibility toggle hides/shows the node on canvas; hidden rows are dimmed.
- LAY-005: Lock toggle prevents selection and editing of the node (and is enforced in canvas selection + marquee).
- LAY-006: Selected rows are highlighted with the accent treatment; frame/container names render with heavier weight.
- LAY-007: Right-click on a row opens the context menu (rename, delete, reorder, group, etc.).
- LAY-008 (V2): Drag-to-reorder and drag-into-group within the tree.

**Edge cases:**
- Hiding a parent must visually hide children but preserve their own toggle state.
- Locking a parent locks descendants for selection; child lock state must be restorable when parent unlocks.
- Deeply nested trees need virtualized rendering to stay responsive.
- Renaming to empty string must be rejected or fall back to default name.

**Technical considerations:**
- Distinguish real container nodes from "virtual groups" used only for tree organization (the design separates `TREE`/`VGROUP` from on-canvas nodes). The layer model must support both an authoritative scene graph and logical groupings.
- Flattening the tree to a render list should be memoized and recomputed only on structural/selection/visibility changes.

---

#### F-4. Selection system
**User workflow:** With Move active, the user clicks a node to select it, shift-clicks to add/remove from selection, or drags on empty canvas to marquee-select everything the rectangle intersects. Clicking a frame's empty background or pressing Escape deselects. The most recently added node is the "primary" selection.

**Functional requirements:**
- SEL-001: Click selects a single node; shift-click toggles a node in/out of the multi-selection.
- SEL-002: Marquee (drag on empty space) selects all selectable nodes whose bounds **intersect** the marquee rectangle.
- SEL-003: Locked nodes are never selectable (click or marquee).
- SEL-004: Clicking a frame/artboard background (not a child) clears selection unless shift is held.
- SEL-005: A "primary" node is tracked (last selected) and drives single-object inspector context and the dimension badge.
- SEL-006: Escape clears the current selection and closes open overlays (palette, menus).
- SEL-007: Selection state is reflected simultaneously in canvas overlays, layer tree highlight, and inspector mode (empty / single / multi).

**Edge cases:**
- Marquee with negative drag direction (drag up-left) must normalize to positive width/height.
- A tiny accidental drag (< ~4px) should be treated as a click, not a marquee.
- Selecting across multiple artboards must work and produce correct multi-bounds for align/distribute.
- Shift-clicking an already-selected node removes it and reassigns primary correctly.

**Technical considerations:**
- Hit-testing uses world coordinates; marquee intersection uses axis-aligned bounding boxes in world space.
- Selection is a set of node IDs plus a `primaryId`; all consumers read from this single structure.

---

#### F-5. Transform controls
**User workflow:** A selected node shows a purple bounding overlay with four corner handles and a dimension badge ("W × H"). The user drags handles to resize, drags the body to move, and edits X/Y/W/H/rotation/corner-radius numerically in the inspector. Multi-selection shows a combined bounding box.

**Functional requirements:**
- TRN-001: Single selection renders four corner resize handles + a dimension label showing rounded width × height.
- TRN-002: Each selected node renders a selection outline overlay; multiple selections render one overlay per node plus a combined primary frame.
- TRN-003: Inspector exposes editable numeric **X, Y, W, H, Rotation (°), Corner radius** for the primary/selected node.
- TRN-004: Corner-handle drag resizes; edge behavior, aspect-lock (e.g., Shift), and from-center (e.g., Alt) are defined interactions.
- TRN-005: Numeric inspector edits commit on Enter/blur and update canvas immediately.
- TRN-006: Rotation is supported as a numeric field in MVP; rotate-by-handle is V2.

**Edge cases:**
- Negative width/height from over-dragging a handle past the opposite edge must flip cleanly.
- Resizing text nodes vs. shapes differ (text may reflow vs. scale) — define per type.
- Rotated nodes: bounding box vs. geometry box must be disambiguated for handles and measurements.
- Corner radius larger than half the shorter side should clamp.
- Sub-pixel values: decide rounding/display precision (design shows integer px).

**Technical considerations:**
- Transforms operate in world space; handle hit areas must scale inversely with zoom so they stay a constant on-screen size.
- Group/component transforms must propagate to children with correct local coordinate math.

---

#### F-6. Smart alignment guides
**User workflow:** When a single non-frame node is selected (or moved), pink/magenta dashed guides appear showing alignment relative to its parent frame, with numeric distance labels (left, right, top offsets to the frame edges/center).

**Functional requirements:**
- GUI-001: For a single non-frame selection, render center crosshair guides spanning the parent artboard.
- GUI-002: Show numeric distance labels: distance to left edge, to right edge, and to top of the containing frame.
- GUI-003 (V2): During drag, snap to and display guides for sibling edges/centers and equal-spacing relationships.

**Edge cases:**
- Node outside its frame bounds must still compute sensible (possibly negative) distances.
- Frames themselves should not show internal guides (only their children do).

**Technical considerations:**
- Distances are computed in the artboard's local coordinate space (world position minus artboard origin).
- Guide rendering is an overlay layer with `pointer-events: none`.

---

#### F-7. History (undo / redo)
**User workflow:** The toolbar shows Undo (⌘Z) and Redo (⌘⇧Z). Every mutation — create, move, resize, edit property, delete, group — is reversible. The user can step backward/forward through their edits.

**Functional requirements:**
- HIS-001: Undo (⌘Z) reverts the last mutation; Redo (⌘⇧Z) reapplies it.
- HIS-002: All document mutations are recorded as discrete, reversible operations.
- HIS-003: Continuous gestures (e.g., a drag-resize) coalesce into a single history entry on commit, not per frame.
- HIS-004: Selection changes may be lightweight/optional in the stack (define policy; typically not undoable, but restored to match the reverted state).
- HIS-005: Redo stack is cleared when a new mutation is made after undoing.

**Edge cases:**
- Undo across structural changes (group/ungroup, delete with children) must restore exact prior tree + selection.
- History during multiplayer (V2): undo must be per-user and not revert collaborators' changes (local-intent undo).
- Very long sessions: cap history depth (e.g., N entries) or compress old entries.

**Technical considerations:**
- Command pattern with invertible operations OR immutable-snapshot diffs; choose one and apply consistently.
- Must integrate with autosave (saved state ≠ history boundary) and, in V2, with CRDT/OT so undo composes with remote ops.

---

#### F-8. File management
**User workflow:** A document has a title shown in the top bar with a dropdown (rename, duplicate, etc.) and a live save-status indicator ("All changes saved", green dot). Work autosaves to the cloud continuously. The user can create, open, rename, and export documents.

**Functional requirements:**
- FILE-001: Documents persist to the cloud; edits autosave continuously with a visible status ("Saving…", "All changes saved", "Offline").
- FILE-002: Title is editable inline via the title dropdown; rename updates everywhere.
- FILE-003: Create new document, open existing, duplicate.
- FILE-004: MVP export: **PNG** of a selected frame (other formats in V3).
- FILE-005: Save status surfaces failures (e.g., network loss) distinctly from success.

**Edge cases:**
- Network drop mid-edit: queue changes locally, show "Offline", flush on reconnect (see NFR offline §11.4).
- Concurrent open of the same doc by the same user in two tabs must not corrupt state.
- Export of a frame with hidden/locked layers must respect visibility.

**Technical considerations:**
- Debounced, diff-based autosave to minimize payload; optimistic local write with server confirmation.
- Document schema versioning + migration path (see §9).
- Export pipeline must rasterize at device-pixel-ratio and selectable scale (1x/2x/3x in V3).

---

#### F-9. Keyboard shortcuts & command palette
**User workflow:** The user presses ⌘K to open a centered command palette, types to filter commands/layers/actions grouped by category (Tools, View, Panels, Edit, File), navigates with ↑↓, runs with ↵, and dismisses with Esc. Single-key shortcuts trigger tools and view actions directly.

**Functional requirements:**
- KEY-001: ⌘K opens/closes the command palette; Esc closes it.
- KEY-002: Palette filters live by query and groups results (Tools / View / Panels / Edit / File); shows an empty state when no match.
- KEY-003: Each command shows its label and shortcut hint; clicking or pressing Enter runs it.
- KEY-004: Global shortcuts (MVP): tools V/F/R/O/T/H; zoom `+`/`-`, ⇧1 fit, ⇧0 100%; undo ⌘Z, redo ⌘⇧Z; Esc deselect/close.
- KEY-005: Edit/arrange shortcuts: Copy ⌘C, Paste ⌘V, Duplicate ⌘D, Delete ⌫, Bring to front `]`, Send to back `[`, Group ⌘G, Frame selection ⌥⌘G.
- KEY-006: Panel/view shortcuts: Toggle left panel ⌥1, Toggle grid ⇧G; Create component ⌥⌘K (V2); Export ⇧⌘E (V3).
- KEY-007: All shortcuts are suppressed when a text input/textarea is focused (except Esc to blur).
- KEY-008: ⌘/Ctrl are treated equivalently (cross-platform).

**Edge cases:**
- Browser-reserved shortcuts (⌘N, ⌘T, ⌘W) cannot be overridden — choose non-conflicting bindings.
- IME composition (CJK input) must not trigger single-key tool switches.
- Palette must trap focus and restore it on close.

**Technical considerations:**
- Central keymap registry mapping keys → commands; the command palette and shortcut handler share the same command definitions.
- Per-OS shortcut display (⌘ on macOS, Ctrl on Windows/Linux) resolved at render time.

---

#### F-10. Design tokens (built-in)
**User workflow:** The user works within a consistent visual system: a fixed type scale, a curated color palette, an 8px spacing grid, and standard radii. Inspector fields and the assets panel surface these tokens.

**Functional requirements:**
- TOK-001: A baseline **type scale** ships: Display (28 / 800), Title (20 / 700), Body (15 / 400), Caption (12 / 500). (V2 surfaces these in the Assets panel; V3 makes them editable managed styles.)
- TOK-002: A baseline **color palette** ships (accent, success, warning, info, danger, neutrals).
- TOK-003: Default **spacing grid** is 8px (shown in page properties).
- TOK-004: Standard corner radii available as defaults.
- TOK-005: Fonts: a UI sans (Onest) and a monospace (JetBrains Mono) for numeric/code contexts.

**Edge cases:**
- Custom values outside the token set must remain allowed (tokens are defaults, not constraints, in MVP).
- Missing/blocked web fonts must fall back gracefully (`system-ui, sans-serif`).

**Technical considerations:**
- Tokens stored as a structured style object on the document; rendering reads from CSS variables/theme.
- Token architecture must allow promotion to **managed, shared styles** in V3 without schema break.

> The concrete token values are specified in **§8 (Design tokens reference)**.

---

### 7.2 V2 — Multiplayer & components

#### F-11. Real-time multiplayer & presence
**User workflow:** Multiple people open the same document and edit simultaneously. Collaborator avatars appear in the top bar; live colored cursors with name labels move on the canvas (e.g., "Jordan"). Changes appear instantly for everyone.

**Functional requirements:**
- MUL-001: Concurrent editing with conflict-free convergence across all clients.
- MUL-002: Presence: avatar stack in the toolbar; live cursors with name + assigned color on canvas.
- MUL-003: Per-user selection awareness (optional: show what others have selected).
- MUL-004: Late joiners receive full current document state.

**Edge cases:**
- Two users editing the same property simultaneously must converge deterministically (last-writer or CRDT merge — define).
- Cursor of a user who navigated to a far canvas region should not clutter the view (cull off-screen cursors).
- Reconnect after disconnect must reconcile queued local ops without duplication.

**Technical considerations:**
- CRDT or OT layer over the document model; the MVP history/op model must be designed to compose with this.
- WebSocket transport with presence channel; cursor updates throttled (e.g., 30–60Hz, interpolated).

---

#### F-12. Comments
**User workflow:** Using the Comment tool (C) the user drops a pin on the canvas/layer and writes a comment. Threads appear in the bottom dock's Comments tab with author avatar, timestamp, and text; teammates reply; threads can be marked **Resolved**. A badge shows the open-comment count.

**Functional requirements:**
- CMT-001: Place a comment anchored to a position/layer; comments persist with the document.
- CMT-002: Comments dock lists threads with author, relative time, body, and resolved state.
- CMT-003: Reply inline; mark resolved/unresolved; @-mention teammates.
- CMT-004: Open-comment count surfaces as a badge on the dock tab.

**Edge cases:**
- Comment anchored to a deleted layer must degrade to a free-floating canvas pin, not vanish.
- Resolved threads remain retrievable (filter), not destroyed.
- Mentions to users without doc access must prompt sharing.

**Technical considerations:**
- Comment anchor = stable node ID + relative offset, so it survives moves; falls back to absolute canvas coordinates.
- Real-time delivery over the same presence/sync channel.

---

#### F-13. Components (variants, states, properties)
**User workflow:** The user selects layers and chooses **Create component** (⌥⌘K). The component appears with a distinct marker. In the inspector, a component instance exposes **Variants** (e.g., Default / Compact), **Properties** (e.g., a Theme select, a Shadow toggle), and **States** (Default / Hover / Active / Disabled). Editing the main component propagates to instances.

**Functional requirements:**
- CMP-001: Create a component from a single layer or a multi-selection.
- CMP-002: Component instances render a dedicated inspector section: Variant switcher, named Properties (toggle/select types), and interaction States.
- CMP-003: Editing the main/source component propagates to all instances; instance-level overrides are preserved where defined.
- CMP-004: Components are reusable across frames and pages and surface in the Assets library.

**Edge cases:**
- Detaching an instance must produce an independent copy without breaking the source.
- Conflicting overrides vs. source updates need a defined precedence (override wins for overridden props).
- Circular component nesting must be prevented.

**Technical considerations:**
- Component = definition (variant/state/property schema + layer tree) + instances (reference + overrides).
- Property model is typed (boolean toggle, enum select, text, instance-swap in Future).

---

#### F-14. Assets library
**User workflow:** The left panel's Assets tab provides a searchable library: a **Components** grid (Button, Card, Avatar, Input…), a **Colors** swatch set, and a **Typography** scale list. The user drags an asset onto the canvas or clicks to apply.

**Functional requirements:**
- AST-001: Search box filters all asset categories.
- AST-002: Components grid shows draggable component thumbnails with names.
- AST-003: Colors section shows the document/team palette swatches; clicking applies to selection.
- AST-004: Typography section lists named text styles with their spec (size/weight).

**Edge cases:**
- Empty library state and "no search results" state must be handled.
- Dragging an asset to an invalid drop target (ruler, panel) must no-op.

**Technical considerations:**
- Asset library is backed by the same token/component models; it is a presentation of those, not a separate store.

---

#### F-15. Multi-select align & distribute, Pages
**User workflow (align):** With 2+ layers selected, the inspector shows a multi-select panel: "N layers selected", alignment buttons (left/center/right/top/middle/bottom), Distribute H / Distribute V, and a Create component action.

**User workflow (pages):** The left panel's Pages tab lists pages (e.g., Home Flow, Onboarding, Components) with object counts; the user adds, renames (context menu), and switches pages.

**Functional requirements:**
- ALN-001: Six alignment operations relative to the selection bounds (or container).
- ALN-002: Distribute horizontally/vertically equalizes spacing among 3+ nodes.
- ALN-003: Create component available directly from multi-select.
- PAG-001: Pages list with per-page object counts; add page; rename/delete via context menu; switching loads that page's canvas.

**Edge cases:**
- Distribute requires ≥3 nodes; with 2, fall back to align or disable.
- Aligning a single node is a no-op (panel only appears for multi).
- Deleting the last page must be prevented or auto-create a blank page.

**Technical considerations:**
- Pages partition the scene graph; only the active page renders. Cross-page component references must resolve.

---

### 7.3 V3 — Handoff & scale

#### F-16. Developer handoff
**User workflow:** The engineer opens the bottom dock's **Dev** tab. With a layer selected they see **Measurements** (X, Y, W, H, Radius) and a generated **CSS** block for that layer with a **Copy** button. (Spacing/redline measurements between elements follow.)

**Functional requirements:**
- DEV-001: Dev tab shows the selected node's measurements (X/Y/W/H/Radius) in px.
- DEV-002: Generates copy-ready CSS for the node (dimensions, radius, background incl. gradients, box-shadow from effects).
- DEV-003: One-click copy of the generated CSS.
- DEV-004: Inspect mode shows distances between elements on hover (redlines).

**Edge cases:**
- Gradients, multiple fills, and effects must serialize to valid CSS; unsupported features should be annotated, not silently dropped.
- Rotated/transformed nodes need correct `transform` output.
- Units: px in MVP of handoff; rem/token output is a Future option.

**Technical considerations:**
- CSS generation derives from the same node model used by the renderer to guarantee fidelity.
- Class names auto-derived from sanitized layer names (kebab-case).

---

#### F-17. Version history & restore
**User workflow:** The bottom dock's **History** tab shows a vertical timeline of named versions (e.g., "Current draft", "Refined balance card", "Initial home screen") with author and time; the current version is badged. The user clicks **Restore** on any prior version.

**Functional requirements:**
- VER-001: Timeline of versions with title, author, relative/absolute time, and a "Current" marker.
- VER-002: Automatic checkpointing plus user-named versions.
- VER-003: One-click **Restore** of a prior version (creates a new version rather than destroying history).
- VER-004: View-only preview of a version before restoring (Future: diff view).

**Edge cases:**
- Restoring mid-multiplayer must notify collaborators and resolve to a single converged state.
- Very large histories require pagination/compaction.

**Technical considerations:**
- Version snapshots are immutable; restore = new commit referencing prior snapshot.
- Distinct from undo/redo (which is fine-grained and session-local).

---

#### F-18. Minimap, export expansion, render console, device preview
**User workflow:** A **minimap** (bottom-right) shows the whole document with a viewport rectangle the user can use to orient/jump. **Export** expands to PNG/SVG/PDF at 1x/2x/3x. A **Console** tab streams diagnostics (sync status, render timings/fps, warnings such as missing alt text, autosave confirmations). A **device preview** control cycles frame presets (iPhone 15 / Pixel 8 / Desktop).

**Functional requirements:**
- MAP-001: Minimap renders document bounds + a live viewport indicator reflecting pan/zoom.
- MAP-002 (Future-leaning): clicking/dragging the minimap recenters the viewport.
- EXP-001: Export selected frame(s) to PNG, SVG, and PDF at 1x/2x/3x.
- CON-001: Console streams timestamped, leveled logs (info/render/warn) including render time per frame and autosave events.
- DEV-005: Device preview cycles preset device frames affecting the preview/inspect context.

**Edge cases:**
- Minimap must remain cheap to render (downscaled snapshot, not full re-render).
- SVG export must inline fonts or convert text to outlines per user choice.
- Console must cap log retention to avoid unbounded memory.

**Technical considerations:**
- Minimap viewport math reuses the world-bounds + screen-size + zoom calculation already needed for navigation.
- Render console is a developer/diagnostics surface; gate behind a setting for non-technical users.

---

### 7.4 Future roadmap

- **Prototyping & interactions:** link frames, define triggers/transitions, preview/play flows, share interactive prototypes.
- **Advanced vector editing:** full **Pen tool**, bezier editing, boolean operations, vector networks, masks.
- **Auto-layout & constraints:** responsive stacks, resizing constraints, content-driven layout.
- **Plugin / extension API:** third-party plugins, a sandboxed plugin runtime, a marketplace.
- **Branching & merge:** Git-like branches for large team workflows, review/merge of design changes.
- **Enterprise design systems:** org-wide shared libraries, governance, token pipelines (Style Dictionary export), analytics on component usage.
- **AI assist:** generate variants, auto-name layers, suggest token compliance, comment summarization (the design's "missing alt description" warning hints at automated linting).

---

## 8. Detailed subsystem requirements

This section consolidates cross-cutting subsystem specs (some restate feature requirements with implementation depth). Each is a system other features depend on.

### 8.1 Canvas system
- World/screen coordinate model with a single authoritative transform; all subsystems convert through shared helpers.
- Layers of the canvas, back-to-front: dot grid → artwork (world) → smart guides → selection overlays → marquee → live collaborator cursors → on-canvas chrome (rulers/minimap/zoom pill are screen-fixed, not world).
- Zoom 5–400%, cursor-anchored; pan via trackpad, Hand tool, Space-hold, middle-mouse, Alt-drag.
- Rulers with dynamic tick density and labels; dot grid spacing scales with zoom (min 8px).
- Off-screen culling and virtualization required before V3 scale targets.

**Canvas edge cases (must be explicitly handled):**
- **Selecting overlapping objects:** clicking a stack selects the topmost (highest z-index) hit; repeated click / Alt-click cycles to the object beneath; marquee selects all intersecting regardless of stacking.
- **Objects outside the viewport:** off-screen nodes remain part of the document and selection set (e.g., via layer tree or Select All); culling affects rendering only, never logical state; "Zoom to fit / selection" must reframe to bring them on-screen.
- **Extremely large (or tiny) zoom values:** zoom is hard-clamped to 5%–400%; transform math must avoid precision loss / overflow at the extremes; rulers, grid, and handles must not jitter or disappear at boundary zoom.
- **Undo after deleting a group:** undo restores the group node, its full child subtree, prior z-order, and the prior selection as a single reversible operation (not child-by-child).
- **Loading a corrupted or unknown-version file:** validate against the schema on open; on failure, fail safe (open read-only / recovery view, never silently overwrite), surface a clear error, and attempt last-known-good autosave/version recovery (see §9.2).
- **Invalid transformations:** reject or clamp NaN/Infinity, zero/negative scale (flip instead of collapse), rotation normalized to 0–360°, and corner radius clamped to ≤ half the shorter side; numeric inspector entries are validated before commit.

### 8.2 Tool system
- Tool state machine; one active tool; tools own pointer interpretation and produce history-tracked mutations.
- Tool set evolves by release (MVP: Move/Frame/Rect/Ellipse/Text/Hand; V2: Comment; Future: Pen + vector).
- Tools obey the input-focus guard (no tool switching while typing).

### 8.3 Layers
- Authoritative scene graph + logical groupings (virtual groups) for the tree.
- Row capabilities: select, expand/collapse, visibility, lock, rename, reorder, group/ungroup, context actions.
- Virtualized rendering; memoized flatten; selection/visibility/lock state shared with canvas and inspector.

### 8.4 Inspector panel
- Three top-level modes driven by selection: **Empty** (page properties: background color, grid), **Single**, **Multi** (count + align/distribute + create component).
- Single-object sections, conditional by node type:
  - **Position/Transform** (always): X, Y, W, H, Rotation, Corner radius.
  - **Typography** (text): font family, weight, size, line-height, letter-spacing, text alignment.
  - **Component** (component instance): Variant switcher, typed Properties (toggle/select), interaction States.
  - **Fill**: swatch + value (hex/gradient) + opacity, quick-swatch palette.
  - **Appearance**: opacity slider (0–100%), border.
  - **Effects**: list of effects (e.g., drop shadow) with editable values and per-effect visibility.
- Header shows node name + a type badge; numeric fields use the monospace font and commit on Enter/blur.

### 8.5 Selection system
- Set of selected IDs + `primaryId`; click/shift-click/marquee; intersection-based marquee; lock-aware; frame-background click clears; Escape clears.
- Drives canvas overlays, tree highlight, and inspector mode simultaneously.

### 8.6 Transform controls
- Corner handles (constant on-screen size, inverse-scaled to zoom) + dimension badge.
- Numeric editing in inspector kept in sync with handle drags.
- World-space math with correct propagation through groups/components; aspect-lock (Shift) and from-center (Alt) modifiers.

### 8.7 History system
- Invertible operation log (command pattern) or snapshot diffs; gesture coalescing; redo cleared on new edit; depth cap.
- Must compose with multiplayer sync in V2 (per-user, local-intent undo).

### 8.8 File management
- Cloud persistence, diff-based debounced autosave, visible save status (Saving / Saved / Offline), document schema versioning + migrations, optimistic local writes.
- Create/open/duplicate/rename; export (PNG MVP → PNG/SVG/PDF @1–3x in V3).

### 8.9 Keyboard shortcuts
- Central keymap registry shared by the command palette and global handler; per-OS display; input-focus and IME guards; cannot override browser-reserved combos.
- Canonical shortcut table:

| Action | Shortcut | Release |
|---|---|---|
| Command palette | ⌘K / Ctrl-K | MVP |
| Move / Frame / Rectangle / Ellipse / Text / Hand | V / F / R / O / T / H | MVP |
| Pan canvas (temporary) | Space-hold (+ drag) | MVP |
| Comment tool | C | V2 |
| Zoom in / out | + / − | MVP |
| Zoom to fit | ⇧1 | MVP |
| Zoom to 100% | ⇧0 | MVP |
| Undo / Redo | ⌘Z / ⌘⇧Z | MVP |
| Copy / Paste / Duplicate / Delete | ⌘C / ⌘V / ⌘D / ⌫ | MVP |
| Bring to front / Send to back | ] / [ | MVP |
| Group / Frame selection | ⌘G / ⌥⌘G | V2 |
| Toggle left panel | ⌥1 | MVP |
| Toggle grid | ⇧G | MVP |
| Create component | ⌥⌘K | V2 |
| Export frame | ⇧⌘E | V3 |
| Nudge / precise move (1px; ×10 with Shift) | Arrow keys | MVP |
| Deselect / close overlays | Esc | MVP |

**Core editing shortcuts (MVP, explicit):** `V` Selection (Move) tool · `R` Rectangle · `T` Text · `Space` Pan · `⌘/Ctrl+Z` Undo · `⌘/Ctrl+Shift+Z` Redo · `⌘/Ctrl+D` Duplicate · `Delete`/`⌫` Remove object · `Arrow keys` precise movement.

**Modifier behaviors (held during an interaction):**
- **Shift** — constrains transformations: aspect-ratio lock while resizing, axis-lock (horizontal/vertical) while moving, 15° angle snapping while rotating, and ×10 step for arrow-key nudging.
- **Alt / Option** — duplicate-while-dragging (drag a copy, leaving the original in place); also resize/scale from center.
- **Space** — temporary Pan: hold to pan with any tool active, release to return to the prior tool.
- Modifier behaviors are consistent across canvas, transform handles, and the layer tree, and are suppressed while a text input is focused.

### 8.10 Design tokens reference
**Color**
| Role | Value |
|---|---|
| App background | `#0B0B0E` |
| Panel / surface | `#121217` |
| Elevated surface | `#16161D` / `#1A1A22` |
| Border (subtle / default) | `#1F1F29` / `#26262F` / `#232330` |
| Accent (primary) | `#7C5CFF` / `#8B6BFF` |
| Accent gradient | `#8B6BFF → #6B45E8 → #5B3CE0` |
| Success | `#3FCF8E` |
| Warning | `#F5A623` |
| Info | `#5B9BFF` |
| Danger | `#FF5E7E` / `#FF6B6B` |
| Text (primary→muted) | `#ECECF1` / `#C8C8D2` / `#9A9AA6` / `#6E6E7C` / `#5C5C6A` |

**Typography**
| Style | Size / Weight |
|---|---|
| Display | 28 / 800 |
| Title | 20 / 700 |
| Body | 15 / 400 |
| Caption | 12 / 500 |
| UI font | Onest (`system-ui` fallback) |
| Mono font | JetBrains Mono (numeric, code, specs) |

**Spacing & radius**
- Base spacing grid: **8px**.
- Radii in use: small controls 7–9px, cards/components 14–22px (radius is per-node editable).

> Token architecture must support promotion to **managed, shareable styles** (V3) without breaking the document schema.

### 8.11 Components
- Definition (variant/state/property schema + layer tree) and instances (reference + typed overrides).
- Property types: boolean toggle, enum select (MVP of components), with text and instance-swap as Future.
- Variants and interaction states (Default/Hover/Active/Disabled) are first-class.
- Surfaced in the Assets library; creatable from single or multi selection; detach to plain layers supported.

---

## 9. Data model (architecture appendix)

The UI implies a concrete document model that engineering should formalize.

### 9.1 Document hierarchy
The document is a strict containment tree. Each level contains the level below it:

```
Document
 └── Pages
      └── Frames
           └── Groups
                └── Layers
                     ├── Shapes
                     ├── Text
                     └── Images
```

- **Document** — the top-level file; owns pages, shared styles/tokens, component definitions, comments, versions, collaborators.
- **Page** — a self-contained canvas/scene; one active page renders at a time.
- **Frame** — an artboard/container with its own coordinate origin (e.g., a 390×844 device frame).
- **Group** — a logical/transform container that moves and transforms its children together.
- **Layer** — an addressable element; the leaf-bearing level whose concrete leaves are **Shapes** (rect, ellipse, future vector/path), **Text**, and **Images**.

> Engineering note: VectorForge distinguishes the *authoritative containment/scene graph* above from *virtual groups* used purely to organize the layer tree. Both must be representable; the renderer walks the scene graph, the layer panel renders the (possibly virtual-grouped) tree.

### 9.2 Common element schema
Every element at every level (Page → Frame → Group → Layer → Shape/Text/Image) shares a common base, extended by type-specific fields:

| Field | Type | Notes |
|---|---|---|
| `id` | string (stable, unique) | Survives moves/renames; referenced by comments, components, selection, history. |
| `name` | string | Human-readable; defaults per type; cannot be empty. |
| `position` | `{ x, y }` | Coordinates in the element's parent space (local). Resolves to world via parent origins. |
| `rotation` | number (degrees) | Normalized 0–360°. |
| `scale` | `{ x, y }` | Non-zero; negative flips the element rather than collapsing it. |
| `visibility` | boolean | Hidden elements are not rendered but remain in the tree and selectable via the layer panel. |
| `locking` | boolean | Locked elements are non-selectable and non-editable on canvas; lock cascades to descendants. |
| `zIndex` | number | Stacking order within the parent; drives overlapping-selection hit order and "bring to front / send to back". |
| `metadata` | object (free-form) | Extensible bag for app/plugin data (alt text, export settings, links, annotations) — namespaced to avoid collisions. |

**Type-specific extensions** layer on top of the base, for example: Shapes add `fill, stroke, cornerRadius, effects[]`; Text adds `content, font, weight, size, lineHeight, letterSpacing, align, fill`; Images add `src/assetRef, fit, altText`; Frames add `origin, clipsContent, backgroundColor`; Component instances add `componentRef, variant, state, propertyOverrides`.

- **Coordinate model:** children store **local** coordinates; world position resolves through parent origins. Inspector displays local coordinates; canvas overlays use world.
- **Schema versioning:** every document carries a schema version; migrations run on open (see §9.3).

### 9.3 File format (`.vf`)
> *A design tool lives and dies by its document model.* The on-disk/exported representation is a first-class spec.

**Format requirements (V1):**
- **JSON-based** — the V1 file format is JSON; the canonical extension is **`.vf`**.
- **Human-readable** — pretty-printable, diff-friendly, stable key ordering, no binary blobs inline (large assets referenced or base64-isolated).
- **Versioned schema** — every file declares its schema `version`; the loader validates against it.
- **Export / import** — a document can be fully serialized to `.vf` and re-imported without loss (round-trip fidelity).
- **Future migration** — a migration pipeline upgrades older `version` files to the current schema on open; unknown future versions fail safe (read-only) rather than corrupting data.

**Minimal V1 example:**
```json
{
  "version": "1.0",
  "pages": [
    {
      "id": "page-1",
      "layers": []
    }
  ]
}
```

**Expanded shape (illustrative, showing the common base):**
```json
{
  "version": "1.0",
  "document": { "id": "doc-1", "title": "Finance App — Mobile" },
  "pages": [
    {
      "id": "page-1",
      "name": "Home Flow",
      "frames": [
        {
          "id": "frame-home",
          "name": "Home",
          "position": { "x": 0, "y": 0 },
          "rotation": 0,
          "scale": { "x": 1, "y": 1 },
          "visibility": true,
          "locking": false,
          "zIndex": 0,
          "metadata": {},
          "size": { "w": 390, "h": 844 },
          "layers": []
        }
      ]
    }
  ],
  "styles": {},
  "components": [],
  "comments": [],
  "versions": []
}
```

**Edge cases & technical considerations for the format:**
- **Corrupted / invalid file:** schema validation on load; on failure, open recovery/read-only mode, surface a clear error, and offer last-known-good (autosave/version) recovery — never silently overwrite.
- **Unknown / newer `version`:** refuse to write back; open read-only and prompt to update the app.
- **Migration ordering:** migrations are sequential and idempotent (1.0→1.1→1.2…); each is independently testable with fixture files.
- **Large documents:** assets stored by reference (asset store / CDN) with the `.vf` holding IDs; keep the JSON within practical parse limits.
- **Determinism:** serialization is deterministic (sorted keys) so files diff cleanly in version control and multiplayer snapshots.

---

## 10. Information architecture & layout (from the approved design)

- **Top toolbar (48px):** logo • document title + dropdown + save-status indicator • centered tool cluster • undo/redo • device preview • collaborator avatars • Share • Export • Settings.
- **Left panel (264px, collapsible to 48px):** tabs Layers / Assets / Pages.
- **Canvas (fluid):** rulers + corner + dot grid + world (artboards) + overlays (guides, selection, marquee, cursors) + zoom pill (bottom-left) + minimap (bottom-right).
- **Right inspector (280px, collapsible to 48px):** mode-driven property panels.
- **Bottom dock (collapsible, ~228px):** tabs Comments / History / Dev / Console.
- **Overlays:** right-click context menu; ⌘K command palette.

Panels are independently collapsible to maximize canvas space; collapsed panels show a thin rail with an expand affordance.

---

## 11. Non-functional requirements

### 11.1 Performance targets

**Canvas rendering**
- Maintain **60 FPS** during all interactions (pan, zoom, drag, resize), with headroom toward 120 FPS on capable displays.
- Support **10,000+ objects per document** with smooth interaction (via viewport culling + layer-tree virtualization).
- **Initial document load < 2 seconds** (time-to-interactive) for a typical document on broadband; render artwork progressively.
- p95 frame paint ≤ 8 ms on the reference document (multi-frame mobile app).

**Interactions**
- Object **selection response < 16 ms** (input-to-highlight).
- **Transform operations < 16 ms** per frame (move/resize/rotate feedback stays within one frame budget).
- **Undo / Redo operations < 50 ms** to apply and repaint.

**Memory**
- Avoid unnecessary object allocations on the hot path (no per-frame allocation during pan/zoom/drag; reuse buffers and geometry).
- Implement **viewport culling** for large documents (render only on-screen / near-screen nodes; off-screen nodes stay in the model but skip paint).
- Bounded caches for minimap snapshot, console logs, and history depth; autosave uses diff payloads and never blocks the main thread.

### 11.2 Accessibility
- **Target:** WCAG 2.2 AA for all chrome (panels, dialogs, menus, palette).
- **Full keyboard navigation** — every UI control (toolbar, layer tree, inspector fields, command palette, menus, dialogs) is reachable and operable by keyboard alone; logical tab order; visible focus states; focus trapping in modals with restore on close; palette navigates with ↑↓ / ↵ / Esc.
- **Screen reader support for UI controls** — correct roles, names, and state for the layer tree (tree/treeitem, expanded/selected), toolbar buttons (labels match tooltips/shortcuts), inspector inputs (labels + current value), toggles, and tabs; live-region announcements for state changes (selection, save status).
- **High contrast mode readiness** — UI remains legible and operable in OS/browser high-contrast and forced-colors modes; do not rely on color alone (lock/visibility convey state via icon + dimming); meet AA contrast for text and interactive states in the dark theme.
- **Scalable interface text** — UI text honors browser/OS text-zoom and `rem`-based sizing without clipping or overlap; layout reflows gracefully up to 200% text scale.
- **Design-content accessibility:** surface authoring-time checks (the console's "missing alt description" warning) so designers can flag accessibility issues in their artwork; allow alt text on image/visual nodes (stored in element `metadata`).
- Respect `prefers-reduced-motion` (the design uses pop/fade/blink/marching-ants animations — gate them).

### 11.3 Scalability
- **Document scale:** thousands of nodes, multiple pages, large component libraries.
- **Collaboration scale:** support realistic concurrent editor counts per document (target ≥ 10 simultaneous editors with smooth presence) and many viewers.
- **System scale:** stateless rendering clients; horizontally scalable sync/presence service; storage that supports per-document snapshots + version history.
- Asset/export workloads offloaded so they don't degrade editing performance.

### 11.4 Offline support
- **Resilient autosave:** detect connectivity loss, switch save status to **Offline**, queue mutations locally, and flush on reconnect with conflict reconciliation.
- **Editing continuity:** the user can keep editing while offline; the document remains interactive against the locally cached state.
- **Reconnect:** local op queue merges into the synced document (V2 CRDT/OT); no duplicated or lost ops.
- **Asset availability:** recently loaded fonts/assets cached; graceful font fallback when offline.
- **PWA consideration (Future):** installable, service-worker-cached shell for faster cold starts and basic offline open of recent documents.

### 11.5 Browser compatibility
- **Supported:** latest 2 major versions of Chrome, Edge, Firefox, and Safari on desktop (macOS, Windows, Linux).
- **Rendering:** modern CSS (flexbox/grid, CSS variables, `backdrop-filter`), GPU compositing; provide acceptable fallback where `backdrop-filter` is unsupported.
- **Input:** mouse, trackpad (incl. pinch-zoom via `ctrlKey` wheel), and keyboard fully supported; touch/tablet is a Future target (view/comment first).
- **Cross-platform shortcuts:** ⌘ (macOS) and Ctrl (Windows/Linux) treated equivalently and displayed per OS.
- **Graceful degradation:** unsupported/old browsers get a clear "use a supported browser" message rather than a broken canvas.

---

## 12. Risks, assumptions & open questions

**Risks**
- DOM/SVG rendering may not hit V3 performance targets at 10k+ nodes → abstract the renderer now so a canvas/WebGL backend can replace it without rewriting features.
- Multiplayer convergence + per-user undo is hard → choose CRDT/OT early and design the MVP op model to compose with it.
- Browser-reserved shortcuts limit the keymap → finalize bindings against real browser constraints.

**Assumptions**
- Primary input is desktop mouse/trackpad + keyboard; touch is later.
- Documents are cloud-first; there is no required local-file format in MVP (export covers portability).

**Open questions**
1. Renderer choice for MVP: DOM/SVG (faster to build) vs. canvas/WebGL (better ceiling)?
2. Conflict-resolution strategy: CRDT vs. OT, and the exact per-user undo semantics under concurrency.
3. Text behavior on resize: reflow vs. scale, per node, and auto-width vs. fixed.
4. Export fidelity contract: which effects/gradients are guaranteed in SVG/PDF vs. annotated as approximations.
5. Token governance: when do built-in tokens become editable managed styles, and who can edit them (roles/permissions)?
6. Permissions/roles model (owner/editor/viewer/commenter) — implied by Share + comments but not yet specified.

---

*End of PRD v1.0. This document is derived from the approved VectorForge UI design and is intended as the basis for engineering scoping, design-system formalization, and milestone planning.*
