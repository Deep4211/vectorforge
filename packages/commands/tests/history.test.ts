import { describe, expect, it } from 'vitest';
import { Vector2 } from '@vectorforge/geometry';
import { createFrame, createRectangle, SceneGraph } from '@vectorforge/document';
import { HistoryManager, MoveNodeCommand, SetPropertyCommand } from '@vectorforge/commands';

function setup(): { scene: SceneGraph; history: HistoryManager } {
  const scene = SceneGraph.empty();
  scene.add(createFrame({ id: 'f', size: { w: 100, h: 100 } }));
  scene.add(createRectangle({ id: 'r', size: { w: 10, h: 10 } }), 'f');
  return { scene, history: new HistoryManager({ scene }) };
}

describe('HistoryManager', () => {
  it('undoes and redoes a sequence back to the exact states', () => {
    const { scene, history } = setup();
    const initial = scene.serialize();
    history.execute(new MoveNodeCommand('r', new Vector2(20, 20)));
    history.execute(new SetPropertyCommand('r', 'fill', '#FF0000'));
    const final = scene.serialize();

    expect(history.undo()).toBe(true);
    expect(history.undo()).toBe(true);
    expect(scene.serialize()).toBe(initial); // fully undone
    expect(history.undo()).toBe(false); // empty

    expect(history.redo()).toBe(true);
    expect(history.redo()).toBe(true);
    expect(scene.serialize()).toBe(final); // fully redone

    expect(history.canUndo()).toBe(true);
    history.clear();
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
  });

  it('clears the redo stack when a new command is executed (CMD-4)', () => {
    const { history } = setup();
    history.execute(new MoveNodeCommand('r', new Vector2(5, 5)));
    history.undo();
    expect(history.canRedo()).toBe(true);
    history.execute(new MoveNodeCommand('r', new Vector2(9, 9)));
    expect(history.canRedo()).toBe(false);
    expect(history.redoDepth).toBe(0);
  });

  it('coalesces a gesture into a single history entry (CMD-3)', () => {
    const { scene, history } = setup();
    const initial = scene.serialize();
    history.execute(new MoveNodeCommand('r', new Vector2(10, 0)));
    history.execute(new MoveNodeCommand('r', new Vector2(20, 0)), { coalesce: true });
    history.execute(new MoveNodeCommand('r', new Vector2(30, 0)), { coalesce: true });
    expect(history.undoDepth).toBe(1); // one entry for the whole drag
    // scene reflects the latest position after the coalesced gesture
    expect(scene.getOrThrow('r').transform.position.equals(new Vector2(30, 0))).toBe(true);
    expect(history.undo()).toBe(true);
    expect(scene.serialize()).toBe(initial); // undo reverts the entire gesture
    expect(history.redo()).toBe(true); // redo re-applies the whole gesture
    expect(scene.getOrThrow('r').transform.position.equals(new Vector2(30, 0))).toBe(true);
  });

  it('does not coalesce different nodes/paths', () => {
    const { history } = setup();
    history.execute(new MoveNodeCommand('r', new Vector2(1, 0)));
    history.execute(new SetPropertyCommand('r', 'fill', '#000'), { coalesce: true });
    expect(history.undoDepth).toBe(2);
  });

  it('bounds history depth, dropping the oldest entries (CMD-6)', () => {
    const scene = SceneGraph.empty();
    scene.add(createRectangle({ id: 'r', size: { w: 10, h: 10 } }));
    const history = new HistoryManager({ scene }, { limit: 2 });
    history.execute(new MoveNodeCommand('r', new Vector2(1, 1)));
    history.execute(new MoveNodeCommand('r', new Vector2(2, 2)));
    history.execute(new MoveNodeCommand('r', new Vector2(3, 3)));
    expect(history.undoDepth).toBe(2); // oldest dropped
    expect(scene.getOrThrow('r').transform.position.equals(new Vector2(3, 3))).toBe(true);
    expect(history.undo()).toBe(true);
    expect(history.undo()).toBe(true);
    expect(history.canUndo()).toBe(false); // the dropped entry can no longer be undone
    expect(scene.getOrThrow('r').transform.position.equals(new Vector2(1, 1))).toBe(true);
  });

  it('is deterministic: identical command sequences yield identical documents (CMD-7)', () => {
    const run = () => {
      const scene = SceneGraph.empty();
      scene.add(createRectangle({ id: 'r', size: { w: 10, h: 10 } }));
      const history = new HistoryManager({ scene });
      history.execute(new MoveNodeCommand('r', new Vector2(7, 8)));
      history.execute(new SetPropertyCommand('r', 'fill', '#123456'));
      return scene.serialize();
    };
    expect(run()).toBe(run());
  });
});
