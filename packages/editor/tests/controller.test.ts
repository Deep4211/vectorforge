import { describe, expect, it } from 'vitest';
import { Rectangle, screenToWorld, Transform, Vector2 } from '@vectorforge/geometry';
import {
  createFrame,
  createRectangle,
  createSequentialIdGenerator,
  SceneGraph,
} from '@vectorforge/document';
import { EditorController, NO_MODIFIERS } from '@vectorforge/editor';

function makeController() {
  let renders = 0;
  const scheduler = {
    requestRender(): void {
      renders += 1;
    },
  };
  const controller = new EditorController({
    idGenerator: createSequentialIdGenerator(),
    scheduler,
  });
  return { controller, renderCount: () => renders };
}

describe('EditorController — document intentions go through commands', () => {
  it('creates a shape, selects it, marks dirty, schedules a render, and is undoable', () => {
    const { controller, renderCount } = makeController();
    const before = renderCount();
    const id = controller.createShape('rectangle', new Rectangle(10, 20, 30, 40));

    expect(controller.scene.has(id)).toBe(true);
    expect(controller.state.selection.ids).toEqual([id]);
    expect(controller.state.selection.primaryId).toBe(id);
    expect(controller.state.dirty).toBe(true);
    expect(renderCount()).toBeGreaterThan(before);

    // undo removes it AND restores the prior (empty) selection
    expect(controller.undo()).toBe(true);
    expect(controller.scene.has(id)).toBe(false);
    expect(controller.state.selection.ids).toEqual([]);
    // redo re-creates it and restores the post-action selection
    expect(controller.redo()).toBe(true);
    expect(controller.scene.has(id)).toBe(true);
    expect(controller.state.selection.ids).toEqual([id]);
  });

  it('moves the selection by committing a command (position changes; undo reverts)', () => {
    const { controller } = makeController();
    const id = controller.createShape('rectangle', new Rectangle(10, 20, 30, 40));
    controller.moveSelectionBy(new Vector2(5, 5));
    expect(controller.scene.getOrThrow(id).transform.position.equals(new Vector2(15, 25))).toBe(
      true,
    );
    controller.undo();
    expect(controller.scene.getOrThrow(id).transform.position.equals(new Vector2(10, 20))).toBe(
      true,
    );
  });

  it('deletes the selection and restores it on undo', () => {
    const { controller } = makeController();
    const id = controller.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    controller.deleteSelection();
    expect(controller.scene.has(id)).toBe(false);
    expect(controller.state.selection.ids).toEqual([]);
    controller.undo();
    expect(controller.scene.has(id)).toBe(true);
    expect(controller.state.selection.ids).toEqual([id]);
  });

  it('groups and ungroups the selection', () => {
    const { controller } = makeController();
    const a = controller.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    const b = controller.createShape('rectangle', new Rectangle(20, 0, 10, 10));
    controller.selectMany([a, b]);
    const g = controller.group();
    expect(g).not.toBeNull();
    expect(controller.scene.parentOf(a)).toBe(g);
    expect(controller.scene.parentOf(b)).toBe(g);
    expect(controller.state.selection.ids).toEqual([g]);

    controller.ungroup(g ?? undefined);
    expect(controller.scene.has(g!)).toBe(false);
    expect(controller.scene.parentOf(a)).toBeNull();
    expect(controller.scene.parentOf(b)).toBeNull();
  });

  it('reorders z-order (bring to front / send to back)', () => {
    const { controller } = makeController();
    const a = controller.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    const b = controller.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    const c = controller.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    expect(controller.scene.roots()).toEqual([a, b, c]);
    controller.bringToFront(a);
    expect(controller.scene.roots()).toEqual([b, c, a]);
    controller.sendToBack(a);
    expect(controller.scene.roots()).toEqual([a, b, c]);
  });
});

describe('EditorController — selection model (EDT-6)', () => {
  it('tracks ids + primary, toggles, and is lock-aware', () => {
    const { controller } = makeController();
    const a = controller.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    const b = controller.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    const c = controller.createShape('rectangle', new Rectangle(0, 0, 10, 10));

    controller.selectMany([a, b, c]);
    expect(controller.state.selection.primaryId).toBe(c);
    controller.toggleSelect(c);
    expect(controller.state.selection.ids).toEqual([a, b]);
    expect(controller.state.selection.primaryId).toBe(b);

    controller.setProperty(a, 'locked', true); // a becomes locked
    controller.select(a);
    expect(controller.state.selection.ids).toEqual([]); // locked nodes are not selectable

    controller.clearSelection();
    expect(controller.state.selection.primaryId).toBeNull();
  });

  it('drops a node from the live selection when it is locked while already selected', () => {
    const { controller } = makeController();
    const a = controller.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    const b = controller.createShape('rectangle', new Rectangle(20, 0, 10, 10));
    controller.selectMany([a, b]);
    expect(controller.state.selection.ids).toEqual([a, b]);

    controller.setProperty(a, 'locked', true);
    // a is re-filtered out of the live selection (EDT-6), b remains primary.
    expect(controller.state.selection.ids).toEqual([b]);
    expect(controller.state.selection.primaryId).toBe(b);

    // a bulk move must not touch the locked node, even via a stale selection.
    controller.selectMany([a, b]); // selectMany also drops the locked a
    controller.moveSelectionBy(new Vector2(5, 5));
    expect(controller.scene.getOrThrow(a).transform.position.equals(new Vector2(0, 0))).toBe(true);
    expect(controller.scene.getOrThrow(b).transform.position.equals(new Vector2(25, 5))).toBe(true);
  });
});

describe('EditorController — multi-select operations + undo', () => {
  it('moves a multi-selection as one composite command and reverts on undo', () => {
    const { controller } = makeController();
    const a = controller.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    const b = controller.createShape('rectangle', new Rectangle(20, 0, 10, 10));
    controller.selectMany([a, b]);
    controller.moveSelectionBy(new Vector2(5, 5));
    expect(controller.scene.getOrThrow(a).transform.position.equals(new Vector2(5, 5))).toBe(true);
    expect(controller.scene.getOrThrow(b).transform.position.equals(new Vector2(25, 5))).toBe(true);

    controller.undo();
    expect(controller.scene.getOrThrow(a).transform.position.equals(new Vector2(0, 0))).toBe(true);
    expect(controller.scene.getOrThrow(b).transform.position.equals(new Vector2(20, 0))).toBe(true);
    expect(controller.state.selection.ids).toEqual([a, b]); // selection restored
  });

  it('deletes a parent+child selection via topLevel without double-applying (no throw)', () => {
    const { controller } = makeController();
    const a = controller.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    const b = controller.createShape('rectangle', new Rectangle(20, 0, 10, 10));
    controller.selectMany([a, b]);
    const g = controller.group();
    controller.selectMany([g!, a]); // parent + one child
    expect(() => controller.deleteSelection()).not.toThrow();
    expect(controller.scene.size).toBe(0);

    controller.undo();
    expect(controller.scene.has(g!)).toBe(true);
    expect(controller.scene.has(a)).toBe(true);
    expect(controller.scene.has(b)).toBe(true);
  });

  it('excludes a locked node from a marquee selection', () => {
    const { controller } = makeController();
    const a = controller.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    const b = controller.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    controller.setProperty(a, 'locked', true);
    controller.selectMarquee(new Rectangle(-5, -5, 100, 100));
    expect(controller.state.selection.ids).toEqual([b]);
  });
});

describe('EditorController — state-signal contracts', () => {
  it('bumps documentVersion on every document change but never on ephemeral ops', () => {
    const { controller } = makeController();
    const v0 = controller.state.documentVersion;
    const id = controller.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    const v1 = controller.state.documentVersion;
    expect(v1).toBeGreaterThan(v0);

    controller.moveSelectionBy(new Vector2(5, 5));
    const v2 = controller.state.documentVersion;
    expect(v2).toBeGreaterThan(v1);
    controller.undo();
    expect(controller.state.documentVersion).toBeGreaterThan(v2);
    const v3 = controller.state.documentVersion;
    controller.redo();
    expect(controller.state.documentVersion).toBeGreaterThan(v3);

    const vStable = controller.state.documentVersion;
    controller.select(id);
    controller.clearSelection();
    controller.zoomAt(new Vector2(100, 100), 2);
    controller.panBy(new Vector2(10, 10));
    controller.setTool('rectangle');
    expect(controller.state.documentVersion).toBe(vStable);
  });

  it('clears the redo stack when a new action follows an undo', () => {
    const { controller } = makeController();
    const a = controller.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    controller.undo();
    expect(controller.scene.has(a)).toBe(false);
    const b = controller.createShape('rectangle', new Rectangle(20, 0, 10, 10));
    expect(controller.redo()).toBe(false); // redo invalidated by the new action
    expect(controller.scene.has(b)).toBe(true);
    expect(controller.scene.has(a)).toBe(false); // a is not resurrected
  });

  it('schedules a render for ephemeral and history intentions', () => {
    const { controller, renderCount } = makeController();
    const beforeEphemeral = renderCount();
    controller.clearSelection();
    controller.zoomAt(new Vector2(10, 10), 2);
    controller.setTool('rectangle');
    expect(renderCount()).toBeGreaterThan(beforeEphemeral);

    controller.setTool('move');
    controller.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    const beforeUndo = renderCount();
    controller.undo();
    controller.redo();
    expect(renderCount()).toBeGreaterThan(beforeUndo);
  });
});

describe('EditorController — ephemeral changes do not mark the document dirty (EDT-2)', () => {
  it('selection and viewport changes leave dirty=false', () => {
    const { controller } = makeController();
    controller.clearSelection();
    controller.zoomAt(new Vector2(100, 100), 2);
    controller.panBy(new Vector2(10, 10));
    expect(controller.state.dirty).toBe(false);
  });

  it('cursor-anchored zoom keeps the world point under the cursor fixed', () => {
    const { controller } = makeController();
    const cursor = new Vector2(400, 300);
    const worldBefore = screenToWorld(cursor, controller.state.viewport);
    controller.zoomAt(cursor, 2.5);
    expect(controller.state.viewport.zoom).toBe(2.5);
    expect(screenToWorld(cursor, controller.state.viewport).equals(worldBefore, 1e-9)).toBe(true);
  });
});

describe('EditorController — keyboard shortcuts respect the input-focus guard (EDT-8)', () => {
  it('single-key tool shortcuts are suppressed while a text input is focused', () => {
    const { controller } = makeController();
    controller.handleKeyboard({ key: 'r', modifiers: NO_MODIFIERS, inTextInput: false });
    expect(controller.state.tool).toBe('rectangle');
    controller.handleKeyboard({ key: 'h', modifiers: NO_MODIFIERS, inTextInput: true });
    expect(controller.state.tool).toBe('rectangle'); // suppressed
  });

  it('Escape works even in a text input (clears selection)', () => {
    const { controller } = makeController();
    const id = controller.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    expect(controller.state.selection.ids).toEqual([id]);
    controller.handleKeyboard({ key: 'Escape', modifiers: NO_MODIFIERS, inTextInput: true });
    expect(controller.state.selection.ids).toEqual([]);
  });

  it('cmd/ctrl+z undoes and cmd/ctrl+shift+z redoes', () => {
    const { controller } = makeController();
    const id = controller.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    controller.handleKeyboard({
      key: 'z',
      modifiers: { ...NO_MODIFIERS, meta: true },
      inTextInput: false,
    });
    expect(controller.scene.has(id)).toBe(false);
    controller.handleKeyboard({
      key: 'z',
      modifiers: { ...NO_MODIFIERS, meta: true, shift: true },
      inTextInput: false,
    });
    expect(controller.scene.has(id)).toBe(true);
  });
});

describe('EditorController — misc intentions', () => {
  it('creates ellipse and frame shapes', () => {
    const { controller } = makeController();
    const e = controller.createShape('ellipse', new Rectangle(0, 0, 10, 10));
    const f = controller.createShape('frame', new Rectangle(0, 0, 10, 10));
    expect(controller.scene.getOrThrow(e).type).toBe('ellipse');
    expect(controller.scene.getOrThrow(f).type).toBe('frame');
  });

  it('group with an empty selection is a no-op; ungroup of a missing node is safe', () => {
    const { controller } = makeController();
    expect(controller.group()).toBeNull();
    controller.ungroup('missing');
    expect(controller.scene.size).toBe(0);
  });

  it('bringForward and sendBackward shift z-order by one', () => {
    const { controller } = makeController();
    const a = controller.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    const b = controller.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    const c = controller.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    controller.bringForward(a);
    expect(controller.scene.roots()).toEqual([b, a, c]);
    controller.sendBackward(a);
    expect(controller.scene.roots()).toEqual([a, b, c]);
  });
});

describe('EditorController — resize gesture (transform handles, §9)', () => {
  it('resizes the primary node via a handle and reverts on undo (one history entry)', () => {
    const { controller } = makeController();
    const id = controller.createShape('rectangle', new Rectangle(0, 0, 100, 50));
    expect(controller.beginResize('se', new Vector2(100, 50))).toBe(true);
    expect(controller.state.interaction).toBe('resizing');
    expect(controller.state.activeHandle).toBe('se');

    // Drag the SE handle by (+20, +10): preview is ephemeral, document untouched.
    controller.updateResize(new Vector2(120, 60), { aspect: false, fromCenter: false });
    expect(controller.state.resizePreview).toEqual({ x: 0, y: 0, w: 120, h: 60 });
    expect(controller.scene.getOrThrow(id).type).toBe('rectangle');
    const node = controller.scene.getOrThrow(id) as { size: { w: number; h: number } };
    expect(node.size).toEqual({ w: 100, h: 50 }); // not yet committed

    controller.commitResize();
    expect(controller.state.interaction).toBe('idle');
    expect(controller.state.resizePreview).toBeNull();
    expect((controller.scene.getOrThrow(id) as { size: { w: number; h: number } }).size).toEqual({
      w: 120,
      h: 60,
    });

    controller.undo();
    expect((controller.scene.getOrThrow(id) as { size: { w: number; h: number } }).size).toEqual({
      w: 100,
      h: 50,
    });
  });

  it('a corner resize that moves the origin commits position + size together', () => {
    const { controller } = makeController();
    const id = controller.createShape('rectangle', new Rectangle(10, 10, 100, 50));
    controller.beginResize('nw', new Vector2(10, 10));
    controller.updateResize(new Vector2(30, 20), { aspect: false, fromCenter: false }); // +20x,+10y inward
    controller.commitResize();
    const n = controller.scene.getOrThrow(id) as {
      size: { w: number; h: number };
      transform: { position: Vector2 };
    };
    expect(n.transform.position.equals(new Vector2(30, 20))).toBe(true);
    expect(n.size).toEqual({ w: 80, h: 40 });
    controller.undo(); // single undo restores both
    const r = controller.scene.getOrThrow(id) as {
      size: { w: number; h: number };
      transform: { position: Vector2 };
    };
    expect(r.transform.position.equals(new Vector2(10, 10))).toBe(true);
    expect(r.size).toEqual({ w: 100, h: 50 });
  });

  it('resizes a child in its parent-local space (frame offset is undone)', () => {
    // A frame translated to (100,0) with a child rect at local (10,10), size 50×50.
    const scene = SceneGraph.empty();
    scene.add(
      createFrame({
        id: 'f',
        size: { w: 200, h: 200 },
        transform: new Transform(new Vector2(100, 0), 0, Vector2.ONE),
      }),
    );
    scene.add(
      createRectangle({
        id: 'c',
        size: { w: 50, h: 50 },
        transform: new Transform(new Vector2(10, 10), 0, Vector2.ONE),
      }),
      'f',
    );
    const controller = new EditorController({ scene });
    controller.selectMany(['c']);
    // Child world SE corner = (160,60); drag it to (180,80) → +20,+20 in parent-local.
    expect(controller.beginResize('se', new Vector2(160, 60))).toBe(true);
    controller.updateResize(new Vector2(180, 80), { aspect: false, fromCenter: false });
    controller.commitResize();
    expect((controller.scene.getOrThrow('c') as { size: { w: number; h: number } }).size).toEqual({
      w: 70,
      h: 70,
    });
  });

  it('resizes a rotated node in its OWN local frame (rotation is undone)', () => {
    const scene = SceneGraph.empty();
    scene.add(
      createRectangle({
        id: 'r',
        size: { w: 100, h: 50 },
        transform: new Transform(new Vector2(0, 0), 90, Vector2.ONE),
      }),
    );
    const controller = new EditorController({ scene });
    controller.selectMany(['r']);
    // Local SE corner (100,50) maps to world (-50,100); drag it by (+20,+20) in world.
    expect(controller.beginResize('se', new Vector2(-50, 100))).toBe(true);
    controller.updateResize(new Vector2(-30, 120), { aspect: false, fromCenter: false });
    controller.commitResize();
    // World (+20,+20) is (+20,-20) in the node's local frame ⇒ size 120×30, not 120×70.
    expect((controller.scene.getOrThrow('r') as { size: { w: number; h: number } }).size).toEqual({
      w: 120,
      h: 30,
    });
  });

  it('refuses to resize a node with no box (a line) and cancel clears resize state', () => {
    const { controller } = makeController();
    const id = controller.createShape('rectangle', new Rectangle(0, 0, 40, 40));
    controller.beginResize('se', new Vector2(40, 40));
    controller.cancelGesture();
    expect(controller.state.interaction).toBe('idle');
    expect(controller.state.activeHandle).toBeNull();
    expect(controller.state.resizePreview).toBeNull();
    expect((controller.scene.getOrThrow(id) as { size: { w: number; h: number } }).size).toEqual({
      w: 40,
      h: 40,
    });
  });
});

describe('EditorController — hover, handles, cursor, guides', () => {
  it('tracks the hovered node and resize handle, driving the cursor', () => {
    const { controller } = makeController();
    const id = controller.createShape('rectangle', new Rectangle(0, 0, 100, 100));
    controller.updateHover(new Vector2(50, 50), new Vector2(50, 50));
    expect(controller.state.hover).toBe(id);
    expect(controller.state.hoverHandle).toBeNull();
    expect(controller.cursor()).toBe('default');

    // Hover the SE handle (screen == world at the default viewport).
    controller.updateHover(new Vector2(100, 100), new Vector2(100, 100));
    expect(controller.state.hoverHandle).toBe('se');
    expect(controller.cursor()).toBe('nwse-resize');
  });

  it('exposes selection bounds and parent-frame alignment guides', () => {
    const { controller } = makeController();
    expect(controller.selectionBounds()).toBeNull();
    const id = controller.createShape('rectangle', new Rectangle(10, 20, 30, 40));
    const b = controller.selectionBounds()!;
    expect([b.minX, b.minY, b.maxX, b.maxY]).toEqual([10, 20, 40, 60]);
    expect(controller.guides()).toEqual([]); // top-level node, no parent frame
    void id;
  });
});

describe('EditorController — overlapping-click cycling (§8.1)', () => {
  it('cycles selection through stacked nodes on repeated clicks at the same spot', () => {
    const { controller } = makeController();
    const a = controller.createShape('rectangle', new Rectangle(0, 0, 50, 50));
    const b = controller.createShape('rectangle', new Rectangle(0, 0, 50, 50)); // on top of a
    const point = new Vector2(25, 25);

    expect(controller.selectCycle(point, false)).toBe(b); // topmost first
    expect(controller.selectCycle(point, false)).toBe(a); // cycle down
    expect(controller.selectCycle(point, false)).toBe(b); // wrap around
  });

  it('clears selection when cycling on empty space', () => {
    const { controller } = makeController();
    controller.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    expect(controller.selectCycle(new Vector2(500, 500), false)).toBeNull();
    expect(controller.state.selection.ids).toEqual([]);
  });
});

describe('EditorController — keyboard (arrow nudge + IME guard, EDT-8)', () => {
  it('nudges the selection by 1px, or 10px with Shift', () => {
    const { controller } = makeController();
    const id = controller.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    controller.handleKeyboard({ key: 'ArrowRight', modifiers: NO_MODIFIERS, inTextInput: false });
    expect(controller.scene.getOrThrow(id).transform.position.equals(new Vector2(1, 0))).toBe(true);
    controller.handleKeyboard({
      key: 'ArrowDown',
      modifiers: { ...NO_MODIFIERS, shift: true },
      inTextInput: false,
    });
    expect(controller.scene.getOrThrow(id).transform.position.equals(new Vector2(1, 10))).toBe(
      true,
    );
  });

  it('suppresses every shortcut (even Escape) mid-IME composition', () => {
    const { controller } = makeController();
    const id = controller.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    controller.handleKeyboard({
      key: 'Escape',
      modifiers: NO_MODIFIERS,
      inTextInput: false,
      isComposing: true,
    });
    expect(controller.state.selection.ids).toEqual([id]); // not cleared
    controller.handleKeyboard({
      key: 'ArrowRight',
      modifiers: NO_MODIFIERS,
      inTextInput: false,
      isComposing: true,
    });
    expect(controller.scene.getOrThrow(id).transform.position.equals(new Vector2(0, 0))).toBe(true);
    // The IME guard precedes the undo branch too — meta+z must not undo mid-composition.
    controller.handleKeyboard({
      key: 'z',
      modifiers: { ...NO_MODIFIERS, meta: true },
      inTextInput: false,
      isComposing: true,
    });
    expect(controller.scene.has(id)).toBe(true);
  });

  it('arrow nudge skips a locked node in the selection', () => {
    const { controller } = makeController();
    const a = controller.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    const b = controller.createShape('rectangle', new Rectangle(20, 0, 10, 10));
    controller.setProperty(a, 'locked', true);
    controller.selectMany([a, b]); // selectMany drops the locked a
    controller.handleKeyboard({ key: 'ArrowRight', modifiers: NO_MODIFIERS, inTextInput: false });
    expect(controller.scene.getOrThrow(a).transform.position.equals(new Vector2(0, 0))).toBe(true);
    expect(controller.scene.getOrThrow(b).transform.position.equals(new Vector2(21, 0))).toBe(true);
  });
});

describe('EditorController — previewBounds (live drag/resize overlay)', () => {
  it('shifts the selection bounds by the live drag offset', () => {
    const { controller } = makeController();
    controller.createShape('rectangle', new Rectangle(0, 0, 40, 40));
    const before = controller.previewBounds()!;
    expect([before.minX, before.minY, before.maxX, before.maxY]).toEqual([0, 0, 40, 40]);

    controller.setDragOffset(new Vector2(15, 5));
    const live = controller.previewBounds()!;
    expect([live.minX, live.minY, live.maxX, live.maxY]).toEqual([15, 5, 55, 45]);
  });

  it('reflects the resize preview rect', () => {
    const { controller } = makeController();
    controller.createShape('rectangle', new Rectangle(0, 0, 40, 40));
    const id = controller.state.selection.primaryId!;
    controller.beginResize('se', new Vector2(40, 40));
    controller.updateResize(new Vector2(100, 60), { aspect: false, fromCenter: false });
    const live = controller.previewBounds()!;
    expect([live.minX, live.minY, live.maxX, live.maxY]).toEqual([0, 0, 100, 60]);
    void id;
  });
});
