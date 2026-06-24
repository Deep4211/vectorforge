import { describe, expect, it } from 'vitest';
import { Rectangle, Vector2 } from '@vectorforge/geometry';
import { createSequentialIdGenerator } from '@vectorforge/document';
import { EditorController, NO_MODIFIERS, type EngineInput } from '@vectorforge/editor';

function controller() {
  return new EditorController({ idGenerator: createSequentialIdGenerator() });
}

function pointer(wx: number, wy: number, extra: Partial<EngineInput> = {}): EngineInput {
  return {
    world: new Vector2(wx, wy),
    screen: new Vector2(wx, wy),
    button: 'primary',
    modifiers: NO_MODIFIERS,
    pointerType: 'mouse',
    ...extra,
  };
}

describe('tools — draw', () => {
  it('rectangle tool: drag to draw, commit on release, selecting the new node', () => {
    const c = controller();
    c.setTool('rectangle');
    c.handlePointerDown(pointer(10, 10));
    c.handlePointerMove(pointer(40, 30));
    expect(c.state.interaction).toBe('drawing');
    expect(c.state.draft?.rect).toEqual({ x: 10, y: 10, w: 30, h: 20 });
    c.handlePointerUp(pointer(40, 30));

    expect(c.state.interaction).toBe('idle');
    expect(c.state.draft).toBeNull();
    expect(c.scene.size).toBe(1);
    const id = c.state.selection.primaryId!;
    const node = c.scene.getOrThrow(id);
    expect(node.type).toBe('rectangle');
    expect(node.transform.position.equals(new Vector2(10, 10))).toBe(true);
  });

  it('a zero-size draw creates nothing', () => {
    const c = controller();
    c.setTool('frame');
    c.handlePointerDown(pointer(5, 5));
    c.handlePointerUp(pointer(5, 5));
    expect(c.scene.size).toBe(0);
  });
});

describe('tools — move/select', () => {
  it('clicks to select then drags to move (one undoable command)', () => {
    const c = controller();
    const id = c.createShape('rectangle', new Rectangle(0, 0, 20, 20));
    c.setTool('move');
    c.handlePointerDown(pointer(10, 10)); // inside the rect
    expect(c.state.selection.ids).toEqual([id]);
    c.handlePointerMove(pointer(30, 10)); // drag +20 x
    expect(c.state.dragOffset?.equals(new Vector2(20, 0))).toBe(true);
    c.handlePointerUp(pointer(30, 10));
    expect(c.scene.getOrThrow(id).transform.position.equals(new Vector2(20, 0))).toBe(true);
    c.undo();
    expect(c.scene.getOrThrow(id).transform.position.equals(new Vector2(0, 0))).toBe(true);
  });

  it('keeps the document unmutated mid-drag (preview is purely ephemeral)', () => {
    const c = controller();
    const id = c.createShape('rectangle', new Rectangle(0, 0, 20, 20));
    const versionBefore = c.scene.version;
    c.setTool('move');
    c.handlePointerDown(pointer(10, 10));
    c.handlePointerMove(pointer(30, 10));
    // mid-drag: offset reflects the move, but the node and history are untouched.
    expect(c.state.dragOffset?.equals(new Vector2(20, 0))).toBe(true);
    expect(c.scene.getOrThrow(id).transform.position.equals(new Vector2(0, 0))).toBe(true);
    expect(c.scene.version).toBe(versionBefore);
    c.handlePointerUp(pointer(30, 10)); // single commit on release
    expect(c.scene.version).toBeGreaterThan(versionBefore);
  });

  it('a click without a drag selects but commits no move command', () => {
    const c = controller();
    const id = c.createShape('rectangle', new Rectangle(0, 0, 20, 20));
    c.setTool('move');
    c.handlePointerDown(pointer(10, 10));
    c.handlePointerUp(pointer(10, 10)); // zero delta
    expect(c.state.selection.ids).toEqual([id]);
    c.undo(); // undoes the createShape, not a phantom move
    expect(c.scene.has(id)).toBe(false);
    expect(c.undo()).toBe(false); // nothing else on the stack
  });

  it('ignores non-primary pointer buttons (no gesture, no selection change)', () => {
    const c = controller();
    const id = c.createShape('rectangle', new Rectangle(0, 0, 20, 20));
    c.setTool('move');
    c.handlePointerDown(pointer(200, 200, { button: 'secondary' })); // empty space, right-click
    expect(c.state.selection.ids).toEqual([id]); // selection untouched
    expect(c.state.interaction).toBe('idle'); // no marquee started
  });

  it('drags on empty space to marquee-select', () => {
    const c = controller();
    const id = c.createShape('rectangle', new Rectangle(0, 0, 20, 20));
    c.clearSelection();
    c.setTool('move');
    c.handlePointerDown(pointer(100, 100)); // empty
    c.handlePointerMove(pointer(-5, -5)); // marquee covers the rect
    expect(c.state.interaction).toBe('marquee');
    c.handlePointerUp(pointer(-5, -5));
    expect(c.state.selection.ids).toEqual([id]);
  });
});

describe('tools — hand pan', () => {
  it('pans the viewport in screen space', () => {
    const c = controller();
    c.setTool('hand');
    c.handlePointerDown(pointer(0, 0, { screen: new Vector2(0, 0) }));
    c.handlePointerMove(pointer(0, 0, { screen: new Vector2(50, 20) }));
    expect(c.state.viewport.panX).toBe(50);
    expect(c.state.viewport.panY).toBe(20);
  });
});

describe('tools — switching cancels an in-progress gesture (EDT-7)', () => {
  it('abandons a half-drawn shape and resets ephemeral state', () => {
    const c = controller();
    c.setTool('rectangle');
    c.handlePointerDown(pointer(10, 10));
    c.handlePointerMove(pointer(40, 40));
    expect(c.state.interaction).toBe('drawing');
    c.setTool('move'); // switch mid-gesture
    expect(c.state.tool).toBe('move');
    expect(c.state.interaction).toBe('idle');
    expect(c.state.draft).toBeNull();
    expect(c.scene.size).toBe(0); // nothing committed
  });
});

describe('tools — text', () => {
  it('places a text node at the click point', () => {
    const c = controller();
    c.setTool('text');
    c.handlePointerDown(pointer(50, 60));
    const id = c.state.selection.primaryId!;
    const node = c.scene.getOrThrow(id);
    expect(node.type).toBe('text');
    expect(node.transform.position.equals(new Vector2(50, 60))).toBe(true);
  });
});

describe('tools — drag threshold (click vs drag, SEL edge)', () => {
  it('a sub-threshold press is a click: selects but commits no move', () => {
    const c = controller();
    const id = c.createShape('rectangle', new Rectangle(0, 0, 40, 40));
    const v0 = c.scene.version;
    c.setTool('move');
    c.handlePointerDown(pointer(10, 10));
    c.handlePointerMove(pointer(12, 11)); // ~2px — below the 4px threshold
    c.handlePointerUp(pointer(12, 11));
    expect(c.state.selection.ids).toEqual([id]);
    expect(c.scene.version).toBe(v0); // no move command committed
    expect(c.scene.getOrThrow(id).transform.position.equals(new Vector2(0, 0))).toBe(true);
  });

  it('a sub-threshold press on empty space clears but starts no marquee', () => {
    const c = controller();
    const id = c.createShape('rectangle', new Rectangle(0, 0, 40, 40));
    c.setTool('move');
    c.handlePointerDown(pointer(200, 200)); // empty → clears on down
    c.handlePointerUp(pointer(201, 201)); // ~1.4px
    expect(c.state.selection.ids).toEqual([]);
    void id;
  });
});

describe('tools — resize via a transform handle', () => {
  it('drags the SE handle to resize the selected node on release', () => {
    const c = controller();
    const id = c.createShape('rectangle', new Rectangle(0, 0, 100, 50));
    c.setTool('move');
    c.handlePointerDown(pointer(100, 50)); // SE corner handle (screen == world)
    expect(c.state.interaction).toBe('resizing');
    c.handlePointerMove(pointer(120, 60));
    c.handlePointerUp(pointer(120, 60));
    expect((c.scene.getOrThrow(id) as { size: { w: number; h: number } }).size).toEqual({
      w: 120,
      h: 60,
    });
  });
});

describe('tools — axis-locked move (Shift)', () => {
  it('locks a move drag to the dominant axis', () => {
    const c = controller();
    const id = c.createShape('rectangle', new Rectangle(0, 0, 100, 50));
    c.setTool('move');
    c.handlePointerDown(pointer(50, 25)); // interior, away from handles
    const shift = { modifiers: { ...NO_MODIFIERS, shift: true } };
    c.handlePointerMove(pointer(90, 30, shift)); // Δ(40,5) → x dominant
    c.handlePointerUp(pointer(90, 30, shift));
    expect(c.scene.getOrThrow(id).transform.position.equals(new Vector2(40, 0))).toBe(true);
  });

  it('resizes from center via a handle when Alt is held', () => {
    const c = controller();
    const id = c.createShape('rectangle', new Rectangle(0, 0, 100, 50));
    c.setTool('move');
    c.handlePointerDown(pointer(100, 50)); // SE handle
    const alt = { modifiers: { ...NO_MODIFIERS, alt: true } };
    c.handlePointerMove(pointer(120, 60, alt));
    c.handlePointerUp(pointer(120, 60, alt));
    const n = c.scene.getOrThrow(id) as {
      size: { w: number; h: number };
      transform: { position: Vector2 };
    };
    expect(n.size).toEqual({ w: 140, h: 70 }); // grows symmetrically (2× the delta)
    expect(n.transform.position.equals(new Vector2(-20, -10))).toBe(true);
  });
});

describe('tools — gesture cancellation (EDT-7, §8.3)', () => {
  it('Escape mid-gesture resets the tool; a later move does not resurrect the marquee', () => {
    const c = controller();
    c.createShape('rectangle', new Rectangle(0, 0, 40, 40));
    c.setTool('move');
    c.handlePointerDown(pointer(200, 200)); // empty → marquee
    c.handlePointerMove(pointer(260, 260)); // past threshold
    expect(c.state.interaction).toBe('marquee');
    c.handleKeyboard({ key: 'Escape', modifiers: NO_MODIFIERS, inTextInput: false });
    expect(c.state.interaction).toBe('idle');
    c.handlePointerMove(pointer(280, 280)); // pointer still physically down
    expect(c.state.interaction).toBe('idle'); // not resurrected
    expect(c.state.draft).toBeNull();
  });

  it('handlePointerCancel aborts a drag cleanly — no commit, no stuck state', () => {
    const c = controller();
    const id = c.createShape('rectangle', new Rectangle(0, 0, 40, 40));
    const v0 = c.scene.version;
    c.setTool('move');
    c.handlePointerDown(pointer(20, 20));
    c.handlePointerMove(pointer(60, 20)); // past threshold
    expect(c.state.interaction).toBe('dragging');
    c.handlePointerCancel();
    expect(c.state.interaction).toBe('idle');
    expect(c.state.dragOffset).toBeNull();
    c.handlePointerUp(pointer(60, 20)); // nothing to commit
    expect(c.scene.version).toBe(v0);
    expect(c.scene.getOrThrow(id).transform.position.equals(new Vector2(0, 0))).toBe(true);
  });
});

describe('tools — select / cycle / drag on overlapping stacks (§8.1)', () => {
  function stacked() {
    const c = controller();
    const a = c.createShape('rectangle', new Rectangle(0, 0, 50, 50));
    const b = c.createShape('rectangle', new Rectangle(0, 0, 50, 50)); // on top of a
    c.setTool('move');
    return { c, a, b };
  }
  const click = (c: ReturnType<typeof controller>, x: number, y: number) => {
    c.handlePointerDown(pointer(x, y));
    c.handlePointerUp(pointer(x, y));
  };

  it('grabbing the already-selected top node drags it (does not cycle away)', () => {
    const { c, a, b } = stacked();
    click(c, 25, 25);
    expect(c.state.selection.primaryId).toBe(b); // topmost
    c.handlePointerDown(pointer(25, 25)); // press b again to drag
    c.handlePointerMove(pointer(60, 25));
    c.handlePointerUp(pointer(60, 25));
    expect(c.state.selection.primaryId).toBe(b); // still b
    expect(c.scene.getOrThrow(b).transform.position.equals(new Vector2(35, 0))).toBe(true);
    expect(c.scene.getOrThrow(a).transform.position.equals(new Vector2(0, 0))).toBe(true);
  });

  it('repeated deliberate clicks cycle through the stack', () => {
    const { c, a, b } = stacked();
    click(c, 25, 25);
    expect(c.state.selection.primaryId).toBe(b);
    click(c, 25, 25);
    expect(c.state.selection.primaryId).toBe(a);
    click(c, 25, 25);
    expect(c.state.selection.primaryId).toBe(b); // wrap
  });

  it('re-clicking a just-moved stacked node keeps it (cycle memory cleared by the move)', () => {
    const { c, b } = stacked();
    click(c, 25, 25); // select b, set cycle memory [b,a]/b
    c.handlePointerDown(pointer(25, 25)); // drag b a little (still covers 25,25)
    c.handlePointerMove(pointer(30, 25));
    c.handlePointerUp(pointer(30, 25));
    expect(c.state.selection.primaryId).toBe(b);
    click(c, 25, 25); // re-click: memory cleared by the move ⇒ topmost b, not a
    expect(c.state.selection.primaryId).toBe(b);
  });
});
