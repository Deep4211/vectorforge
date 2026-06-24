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
