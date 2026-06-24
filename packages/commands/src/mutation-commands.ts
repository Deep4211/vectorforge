import type { Vector2 } from '@vectorforge/geometry';
import { withTransform, type NodeId, type SceneNode, type Size } from '@vectorforge/document';
import { Command, type CommandContext, type ICommand, type Op } from './command';

/** Move a node by setting its transform position. Consecutive moves of the same node coalesce (CMD-3). */
export class MoveNodeCommand extends Command {
  readonly type = 'move-node';
  private from: Vector2 | null;

  constructor(
    readonly id: NodeId,
    private readonly to: Vector2,
    from: Vector2 | null = null,
  ) {
    super();
    this.from = from;
  }

  execute(ctx: CommandContext): void {
    const node = ctx.scene.getOrThrow(this.id);
    if (this.from === null) this.from = node.transform.position;
    ctx.scene.update(this.id, (n) => withTransform(n, n.transform.withPosition(this.to)));
  }

  undo(ctx: CommandContext): void {
    const from = this.from;
    if (from === null) return;
    ctx.scene.update(this.id, (n) => withTransform(n, n.transform.withPosition(from)));
  }

  override mergeWith(next: ICommand): ICommand | null {
    if (next instanceof MoveNodeCommand && next.id === this.id) {
      return new MoveNodeCommand(this.id, next.to, this.from);
    }
    return null;
  }

  toOp(): Op {
    return { kind: this.type, id: this.id, to: { x: this.to.x, y: this.to.y } };
  }
}

/** Rotate a node by setting its transform rotation (degrees). Consecutive rotations coalesce (CMD-3). */
export class RotateNodeCommand extends Command {
  readonly type = 'rotate-node';
  private from: number | null;

  constructor(
    readonly id: NodeId,
    private readonly to: number,
    from: number | null = null,
  ) {
    super();
    this.from = from;
  }

  execute(ctx: CommandContext): void {
    const node = ctx.scene.getOrThrow(this.id);
    if (this.from === null) this.from = node.transform.rotation;
    ctx.scene.update(this.id, (n) => withTransform(n, n.transform.withRotation(this.to)));
  }

  undo(ctx: CommandContext): void {
    const from = this.from;
    if (from === null) return;
    ctx.scene.update(this.id, (n) => withTransform(n, n.transform.withRotation(from)));
  }

  override mergeWith(next: ICommand): ICommand | null {
    if (next instanceof RotateNodeCommand && next.id === this.id) {
      return new RotateNodeCommand(this.id, next.to, this.from);
    }
    return null;
  }

  toOp(): Op {
    return { kind: this.type, id: this.id, to: this.to };
  }
}

/**
 * Resize a node's `size`. Works for frame/rectangle/ellipse/image and for text
 * (including auto-sized text, whose `size` is `null` until first resized).
 * Throws for nodes with no `size` field (group/line). Consecutive resizes of the
 * same node coalesce (CMD-3). Size objects are copied in/out so no reference leaks.
 */
export class ResizeNodeCommand extends Command {
  readonly type = 'resize-node';
  private readonly to: Size;
  private captured: boolean;
  private fromSize: Size | null;

  constructor(
    readonly id: NodeId,
    to: Size,
    from?: { readonly value: Size | null },
  ) {
    super();
    this.to = { w: to.w, h: to.h };
    this.captured = from !== undefined;
    this.fromSize = from ? from.value : null;
  }

  execute(ctx: CommandContext): void {
    const node = ctx.scene.getOrThrow(this.id);
    if (!('size' in node)) throw new Error(`Cannot resize node "${this.id}": it has no size`);
    if (!this.captured) {
      const current = (node as { size: Size | null }).size;
      this.fromSize = current ? { w: current.w, h: current.h } : null;
      this.captured = true;
    }
    ctx.scene.update(this.id, (n) => ({ ...n, size: { w: this.to.w, h: this.to.h } }) as SceneNode);
  }

  undo(ctx: CommandContext): void {
    if (!this.captured) return;
    const from = this.fromSize;
    ctx.scene.update(
      this.id,
      (n) => ({ ...n, size: from ? { w: from.w, h: from.h } : null }) as SceneNode,
    );
  }

  override mergeWith(next: ICommand): ICommand | null {
    if (next instanceof ResizeNodeCommand && next.id === this.id) {
      return new ResizeNodeCommand(this.id, next.to, { value: this.fromSize });
    }
    return null;
  }

  toOp(): Op {
    return { kind: this.type, id: this.id, to: { w: this.to.w, h: this.to.h } };
  }
}

/**
 * Set a single existing non-structural property (fill, opacity, cornerRadius,
 * text props, …). Coalesces consecutive sets of the same node+path (CMD-3).
 *
 * The property must already exist on the node — this command mutates values, it
 * never introduces new keys (which would deviate from CMD-1 exact restoration
 * and could persist garbage). Structural paths (id/type/parentId/childIds) are
 * additionally rejected by the scene's `update` guard.
 */
export class SetPropertyCommand extends Command {
  readonly type = 'set-property';
  private captured = false;
  private fromValue: unknown;

  constructor(
    readonly id: NodeId,
    readonly path: string,
    private readonly to: unknown,
    from?: { readonly value: unknown },
  ) {
    super();
    if (from) {
      this.captured = true;
      this.fromValue = from.value;
    }
  }

  execute(ctx: CommandContext): void {
    const node = ctx.scene.getOrThrow(this.id);
    if (!(this.path in (node as object))) {
      throw new Error(`Cannot set unknown property "${this.path}" on node "${this.id}"`);
    }
    if (!this.captured) {
      this.fromValue = (node as unknown as Record<string, unknown>)[this.path];
      this.captured = true;
    }
    ctx.scene.update(this.id, (n) => ({ ...n, [this.path]: this.to }) as SceneNode);
  }

  undo(ctx: CommandContext): void {
    if (!this.captured) return;
    const value = this.fromValue;
    ctx.scene.update(this.id, (n) => ({ ...n, [this.path]: value }) as SceneNode);
  }

  override mergeWith(next: ICommand): ICommand | null {
    if (next instanceof SetPropertyCommand && next.id === this.id && next.path === this.path) {
      return new SetPropertyCommand(this.id, this.path, next.to, { value: this.fromValue });
    }
    return null;
  }

  toOp(): Op {
    return { kind: this.type, id: this.id, path: this.path, to: this.to };
  }
}
