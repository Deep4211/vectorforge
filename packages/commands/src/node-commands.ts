import {
  serializeNode,
  type NodeId,
  type RemovedSubtree,
  type SceneNode,
} from '@vectorforge/document';
import { Command, type CommandContext, type Op } from './command';

/** Add a fresh (childless) node under a parent (or as a root) at an index. */
export class CreateNodeCommand extends Command {
  readonly type = 'create-node';

  constructor(
    private readonly node: SceneNode,
    private readonly parentId: NodeId | null = null,
    private readonly index?: number,
  ) {
    super();
  }

  execute(ctx: CommandContext): void {
    ctx.scene.add(this.node, this.parentId, this.index);
  }

  undo(ctx: CommandContext): void {
    ctx.scene.remove(this.node.id);
  }

  toOp(): Op {
    // Include the full node snapshot so a remote/replay consumer can reconstruct it (CMD-8).
    return {
      kind: this.type,
      node: serializeNode(this.node),
      parentId: this.parentId,
      index: this.index ?? null,
    };
  }
}

/** Remove a node and its whole subtree; restores it exactly on undo (CMD-1). */
export class DeleteNodeCommand extends Command {
  readonly type = 'delete-node';
  private removed: RemovedSubtree | null = null;

  constructor(private readonly id: NodeId) {
    super();
  }

  execute(ctx: CommandContext): void {
    this.removed = ctx.scene.remove(this.id);
  }

  // redo re-captures: the subtree was re-inserted with the same structure on undo.
  override redo(ctx: CommandContext): void {
    this.removed = ctx.scene.remove(this.id);
  }

  undo(ctx: CommandContext): void {
    if (this.removed) ctx.scene.insertSubtree(this.removed);
  }

  toOp(): Op {
    return { kind: this.type, id: this.id };
  }
}
