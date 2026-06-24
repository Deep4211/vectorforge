import type { NodeId } from '@vectorforge/document';
import { Command, type CommandContext, indexInSiblings, type Op } from './command';

/** Reorder a node among its current siblings (z-order: bring-to-front/back/forward/backward map to this). */
export class ReorderCommand extends Command {
  readonly type = 'reorder';
  private fromIndex: number | null = null;

  constructor(
    private readonly id: NodeId,
    private readonly toIndex: number,
  ) {
    super();
  }

  execute(ctx: CommandContext): void {
    if (this.fromIndex === null) this.fromIndex = indexInSiblings(ctx.scene, this.id);
    ctx.scene.reorder(this.id, this.toIndex);
  }

  undo(ctx: CommandContext): void {
    if (this.fromIndex !== null) ctx.scene.reorder(this.id, this.fromIndex);
  }

  toOp(): Op {
    return { kind: this.type, id: this.id, fromIndex: this.fromIndex, toIndex: this.toIndex };
  }
}

/** Move a node (with its subtree) to a new parent/index. Cycle rejection is enforced by the scene graph. */
export class ReparentCommand extends Command {
  readonly type = 'reparent';
  private from: { parentId: NodeId | null; index: number } | null = null;

  constructor(
    private readonly id: NodeId,
    private readonly toParentId: NodeId | null,
    private readonly toIndex?: number,
  ) {
    super();
  }

  execute(ctx: CommandContext): void {
    if (this.from === null) {
      this.from = {
        parentId: ctx.scene.parentOf(this.id),
        index: indexInSiblings(ctx.scene, this.id),
      };
    }
    ctx.scene.reparent(this.id, this.toParentId, this.toIndex);
  }

  undo(ctx: CommandContext): void {
    if (this.from !== null) ctx.scene.reparent(this.id, this.from.parentId, this.from.index);
  }

  toOp(): Op {
    return {
      kind: this.type,
      id: this.id,
      toParentId: this.toParentId,
      toIndex: this.toIndex ?? null,
    };
  }
}
