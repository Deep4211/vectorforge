# VectorForge UI — Design Spec

> Source of truth: the approved high-fidelity mock **`DesignOS.dc.html`** (a
> self-contained prototype). This file distills it into the concrete tokens,
> layout, and component inventory the `@vectorforge/ui` chrome is built against.
> Where the mock hand-draws the finance artboards in HTML/SVG, our app renders
> document content through the Canvas2D engine instead (gradients/shadows on the
> canvas await the renderer features deferred in Sprint 5).

## Type

- **UI:** `Onest` (400–800). **Numeric / mono / code:** `JetBrains Mono` (400–600).
- Base size 13px, letter-spacing −0.01em, antialiased.

## Color tokens

| Token       | Hex                                                            | Use                          |
| ----------- | -------------------------------------------------------------- | ---------------------------- |
| canvas      | `#0B0B0E`                                                      | viewport background          |
| panel       | `#121217`                                                      | toolbar / side panels / dock |
| surface     | `#1A1A22`                                                      | inputs, chips, buttons       |
| surface-2   | `#16161D` / `#16161F`                                          | cards, palette               |
| border      | `#232330` / `#26262F`                                          | panel + control borders      |
| border-soft | `#1F1F29`                                                      | inner dividers               |
| ink         | `#ECECF1` / `#F2F2F6`                                          | primary text                 |
| muted       | `#9A9AA6` / `#A6A6B2` / `#C8C8D2`                              | secondary text/icons         |
| faint       | `#5C5C6A` / `#6E6E7C`                                          | labels, hints                |
| brand       | `#7C5CFF` → `#8B6BFF` → `#6B45E8` → `#5B3CE0`                  | accent + gradients           |
| positive    | `#3FCF8E` · warn `#F5A623` · info `#5B9BFF` · danger `#FF6B6B` | status                       |
| guide       | `#FF4D8D`                                                      | smart-alignment guides       |

## Layout (top → bottom)

1. **Top toolbar — 48px**, bg `#121217`, border-bottom `#232330`:
   - Left (300px): gradient logo mark, doc title + caret, green dot + save status.
   - Center: tool cluster pill (`#1A1A22`, border `#26262F`, radius 11) — Move/Frame/Rectangle/Ellipse/Text/Hand (mock also has Pen/Comment; not engine tools yet). Active = brand fill.
   - Right (300px): undo/redo pill, device button, overlapping collaborator avatars, **Share** (gradient), export, settings.
2. **Middle — flex row:**
   - **Left panel — 264px** (collapsible to 48px): tabs Layers / Assets / Pages. Layer rows: 28px, caret (expand), type glyph, name, lock + visibility on hover, indent 15px/level, selected = `rgba(124,92,255,.16)`.
   - **Canvas** (flex): 26px corner box + top ruler + left ruler (JetBrains Mono tick labels), dot-grid viewport, world transform `translate(pan)·scale(zoom)`. Overlays: selection box (`#7C5CFF`), corner handles + `W × H` badge, magenta dashed guides + measurements, marquee. Zoom pill bottom-left (with menu), minimap bottom-right (150×104).
   - **Right inspector — 280px** (collapsible): states **empty / single / multi**. Single sections: Position (X/Y), Size (W/H), Rotation/Radius, Typography (text), Fill (swatch + value + opacity + swatches), Appearance (opacity slider + border), Effects.
3. **Bottom dock — 34px tab bar + 228px panel** (collapsible): Comments / History / Dev / Console.

## Overlays / interactions

- Smart guides: single non-frame selection → magenta dashed lines + gap labels to the parent frame.
- Selection: purple 1.5px outline per node; primary shows 4 corner handles + `W × H` badge.
- Marquee: `rgba(124,92,255,.12)` fill, `#7C5CFF` border.
- Cmd/Ctrl+K command palette (grouped Tools/View/Panels/Edit/File). Right-click context menu.

## Mapping to our architecture

- Chrome = `@vectorforge/ui` React, bound via selectors + view models (UI-2/3).
- Canvas + overlays = engine-owned; overlays drawn as a screen-space React layer from
  `controller.selectionBounds()` / `guides()` / ephemeral draft, projected with `worldToScreen`.
- Renderer paints the document; the sample doc approximates the finance screens.
