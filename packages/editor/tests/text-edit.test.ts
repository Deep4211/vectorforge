import { describe, expect, it } from 'vitest';
import { Rectangle, Vector2 } from '@vectorforge/geometry';
import { createSequentialIdGenerator } from '@vectorforge/document';
import { EditorController, NO_MODIFIERS, type EngineInput } from '@vectorforge/editor';

function controller() {
  return new EditorController({ idGenerator: createSequentialIdGenerator() });
}

function pointer(wx: number, wy: number): EngineInput {
  return {
    world: new Vector2(wx, wy),
    screen: new Vector2(wx, wy),
    button: 'primary',
    modifiers: NO_MODIFIERS,
    pointerType: 'mouse',
  };
}

describe('EditorController — inline text editing', () => {
  it('begins editing a text node and exposes a target view model', () => {
    const c = controller();
    const id = c.createText(new Vector2(10, 20));
    expect(c.beginTextEdit(id)).toBe(true);
    expect(c.state.editingTextId).toBe(id);
    const target = c.textEditTarget()!;
    expect(target.id).toBe(id);
    expect([target.worldX, target.worldY]).toEqual([10, 20]);
    expect(target.fontFamily).toBe('Onest');
  });

  it('commits typed content as one history entry and leaves edit mode', () => {
    const c = controller();
    const id = c.createText(new Vector2(0, 0));
    c.beginTextEdit(id);
    c.commitTextContent(id, 'Hello world');
    expect(c.state.editingTextId).toBeNull();
    expect((c.scene.getOrThrow(id) as { content: string }).content).toBe('Hello world');
    c.undo();
    expect((c.scene.getOrThrow(id) as { content: string }).content).toBe('');
  });

  it('removes a text node committed empty (no litter from a click-but-don’t-type)', () => {
    const c = controller();
    const id = c.createText(new Vector2(0, 0));
    c.beginTextEdit(id);
    c.commitTextContent(id, '   ');
    expect(c.scene.has(id)).toBe(false);
    expect(c.state.editingTextId).toBeNull();
  });

  it('refuses to edit a non-text node', () => {
    const c = controller();
    const r = c.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    expect(c.beginTextEdit(r)).toBe(false);
    expect(c.state.editingTextId).toBeNull();
  });

  it('the text tool creates a hit-testable, immediately-editable node', () => {
    const c = controller();
    c.setTool('text');
    c.handlePointerDown(pointer(40, 50));
    const id = c.state.selection.primaryId!;
    expect(c.state.editingTextId).toBe(id); // editing started on create
    expect(c.scene.getOrThrow(id).type).toBe('text');
    // It has a box, so it is selectable by a later click (hit-testable).
    expect(c.hitTest({ x: 45, y: 55 })).toBe(id);
  });

  it('double-clicking a text node enters edit mode', () => {
    const c = controller();
    c.createText(new Vector2(0, 0), 'Hi');
    const id = c.state.selection.primaryId!;
    c.endTextEdit(); // the create began editing; reset for the double-click path
    c.handleDoubleClick(pointer(20, 12)); // inside the 160×24 box
    expect(c.state.editingTextId).toBe(id);
  });
});
