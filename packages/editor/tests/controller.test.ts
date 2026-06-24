import { describe, expect, it } from 'vitest';
import { Rectangle, screenToWorld, Vector2 } from '@vectorforge/geometry';
import { createSequentialIdGenerator } from '@vectorforge/document';
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
