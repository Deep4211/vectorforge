import { Command, type CommandContext, type ICommand, type Op } from './command';

/**
 * Groups child commands into one atomic, reversible unit (CMD-5). `execute`/`redo`
 * run children in order; `undo` runs them in reverse. Used for group/ungroup,
 * multi-delete, align, etc. Composites never merge.
 */
export class CompositeCommand extends Command {
  readonly type = 'composite';

  constructor(
    private readonly children: readonly ICommand[],
    readonly label: string = 'composite',
  ) {
    super();
  }

  execute(ctx: CommandContext): void {
    for (const child of this.children) child.execute(ctx);
  }

  override redo(ctx: CommandContext): void {
    for (const child of this.children) child.redo(ctx);
  }

  undo(ctx: CommandContext): void {
    for (let i = this.children.length - 1; i >= 0; i -= 1) {
      this.children[i]!.undo(ctx);
    }
  }

  toOp(): Op {
    return { kind: this.type, label: this.label, ops: this.children.map((c) => c.toOp()) };
  }
}
