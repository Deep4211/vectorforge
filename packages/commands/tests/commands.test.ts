import { describe, expect, it } from 'vitest';
import { Vector2 } from '@vectorforge/geometry';
import {
  createFrame,
  createGroup,
  createRectangle,
  createText,
  SceneGraph,
} from '@vectorforge/document';
import {
  type CommandContext,
  type ICommand,
  CompositeCommand,
  CreateNodeCommand,
  createGroupCommand,
  DeleteNodeCommand,
  MoveNodeCommand,
  ReorderCommand,
  ReparentCommand,
  ResizeNodeCommand,
  SetPropertyCommand,
  UngroupCommand,
} from '@vectorforge/commands';

const rect = (id: string) => createRectangle({ id, size: { w: 10, h: 10 } });

function setup(): { scene: SceneGraph; ctx: CommandContext } {
  const scene = SceneGraph.empty();
  scene.add(createFrame({ id: 'f', size: { w: 100, h: 100 } }));
  scene.add(rect('r'), 'f');
  return { scene, ctx: { scene } };
}

/** CMD-1: execute mutates; undo restores the exact prior document; redo re-applies. */
function expectInvertible(scene: SceneGraph, ctx: CommandContext, cmd: ICommand): void {
  const before = scene.serialize();
  cmd.execute(ctx);
  const after = scene.serialize();
  expect(after).not.toBe(before);
  cmd.undo(ctx);
  expect(scene.serialize()).toBe(before); // exact inverse
  cmd.redo(ctx);
  expect(scene.serialize()).toBe(after); // redo re-applies
}

describe('command invertibility (CMD-1)', () => {
  it('CreateNodeCommand', () => {
    const { scene, ctx } = setup();
    expectInvertible(scene, ctx, new CreateNodeCommand(rect('n'), 'f'));
  });

  it('DeleteNodeCommand (with subtree)', () => {
    const { scene, ctx } = setup();
    scene.add(rect('r-child'), 'r'); // r now has a subtree
    expectInvertible(scene, ctx, new DeleteNodeCommand('r'));
  });

  it('MoveNodeCommand', () => {
    const { scene, ctx } = setup();
    expectInvertible(scene, ctx, new MoveNodeCommand('r', new Vector2(50, 60)));
  });

  it('ResizeNodeCommand', () => {
    const { scene, ctx } = setup();
    expectInvertible(scene, ctx, new ResizeNodeCommand('r', { w: 40, h: 25 }));
  });

  it('ResizeNodeCommand throws on a node without size', () => {
    const { scene, ctx } = setup();
    scene.add(createGroup({ id: 'g' }), 'f');
    expect(() => new ResizeNodeCommand('g', { w: 1, h: 1 }).execute(ctx)).toThrow(/no size/);
  });

  it('ResizeNodeCommand on auto-sized text (size: null) round-trips', () => {
    const { scene, ctx } = setup();
    scene.add(createText({ id: 't', content: 'Hi' }), 'f'); // size starts null
    expectInvertible(scene, ctx, new ResizeNodeCommand('t', { w: 50, h: 24 }));
  });

  it('SetPropertyCommand', () => {
    const { scene, ctx } = setup();
    expectInvertible(scene, ctx, new SetPropertyCommand('r', 'fill', '#ABCDEF'));
  });

  it('SetPropertyCommand cannot change structural fields (scene guard)', () => {
    const { ctx } = setup();
    expect(() => new SetPropertyCommand('r', 'parentId', 'x').execute(ctx)).toThrow(/structural/);
  });

  it('SetPropertyCommand rejects an unknown property path (no key injection)', () => {
    const { ctx } = setup();
    expect(() => new SetPropertyCommand('r', 'notAProp', 1).execute(ctx)).toThrow(
      /unknown property/,
    );
  });

  it('ReorderCommand', () => {
    const { scene, ctx } = setup();
    scene.add(rect('r2'), 'f'); // f children [r, r2]
    expectInvertible(scene, ctx, new ReorderCommand('r', 1));
  });

  it('ReparentCommand', () => {
    const { scene, ctx } = setup();
    expectInvertible(scene, ctx, new ReparentCommand('r', null)); // r → root
  });

  it('Group (composite) and Ungroup', () => {
    const grouped = setup();
    expectInvertible(
      grouped.scene,
      grouped.ctx,
      createGroupCommand(createGroup({ id: 'g' }), ['r']),
    );

    const ung = SceneGraph.empty();
    ung.add(createFrame({ id: 'f', size: { w: 100, h: 100 } }));
    ung.add(createGroup({ id: 'g' }), 'f');
    ung.add(rect('a'), 'g');
    ung.add(rect('b'), 'g');
    expectInvertible(ung, { scene: ung }, new UngroupCommand('g'));
  });

  it('Group children from different parents restores each to its origin', () => {
    const scene = SceneGraph.empty();
    scene.add(createFrame({ id: 'f1', size: { w: 10, h: 10 } }));
    scene.add(createFrame({ id: 'f2', size: { w: 10, h: 10 } }));
    scene.add(rect('a'), 'f1');
    scene.add(rect('b'), 'f2');
    expectInvertible(scene, { scene }, createGroupCommand(createGroup({ id: 'g' }), ['a', 'b']));
  });
});

describe('toOp lowering (CMD-8)', () => {
  it('produces serializable ops', () => {
    expect(new MoveNodeCommand('r', new Vector2(5, 6)).toOp()).toEqual({
      kind: 'move-node',
      id: 'r',
      to: { x: 5, y: 6 },
    });
    expect(new DeleteNodeCommand('r').toOp()).toEqual({ kind: 'delete-node', id: 'r' });
    expect(new SetPropertyCommand('r', 'fill', '#fff').toOp()).toEqual({
      kind: 'set-property',
      id: 'r',
      path: 'fill',
      to: '#fff',
    });
    const composite = new CompositeCommand([new MoveNodeCommand('r', new Vector2(1, 1))], 'demo');
    const op = composite.toOp();
    expect(op.kind).toBe('composite');
    expect(op.label).toBe('demo');
    expect(Array.isArray(op.ops)).toBe(true);
  });

  it('CreateNode op carries a replayable node snapshot; all command kinds lower', () => {
    const createOp = new CreateNodeCommand(rect('n'), 'f', 0).toOp();
    expect(createOp.kind).toBe('create-node');
    expect((createOp.node as { id: string; type: string }).id).toBe('n');
    expect((createOp.node as { type: string }).type).toBe('rectangle');
    expect(createOp.parentId).toBe('f');

    expect(new ResizeNodeCommand('r', { w: 3, h: 4 }).toOp()).toEqual({
      kind: 'resize-node',
      id: 'r',
      to: { w: 3, h: 4 },
    });
    expect(new ReorderCommand('r', 2).toOp()).toMatchObject({
      kind: 'reorder',
      id: 'r',
      toIndex: 2,
    });
    expect(new ReparentCommand('r', 'f', 1).toOp()).toEqual({
      kind: 'reparent',
      id: 'r',
      toParentId: 'f',
      toIndex: 1,
    });
    expect(new UngroupCommand('g').toOp()).toEqual({ kind: 'ungroup', id: 'g' });
  });
});
