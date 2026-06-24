import type { CommandContext, ICommand } from './command';

export interface HistoryOptions {
  /** Max undo entries kept; oldest are dropped beyond this (CMD-6). Default 200. */
  readonly limit?: number;
}

/**
 * Undo/redo stacks over a {@link CommandContext} (ARCHITECTURE.md §10).
 * Executing a new command clears the redo stack (CMD-4). Optional gesture
 * coalescing merges a command into the previous one (CMD-3). History depth is
 * bounded (CMD-6).
 */
export class HistoryManager {
  private undoStack: ICommand[] = [];
  private redoStack: ICommand[] = [];
  private readonly limit: number;

  constructor(
    private readonly ctx: CommandContext,
    options: HistoryOptions = {},
  ) {
    this.limit = options.limit ?? 200;
  }

  /**
   * Execute and record a command. With `coalesce: true`, if the previous entry
   * accepts a merge (same gesture), the two collapse into one history entry
   * instead of pushing a new one.
   */
  execute(command: ICommand, options: { coalesce?: boolean } = {}): void {
    command.execute(this.ctx);
    this.redoStack = [];

    const top = this.undoStack[this.undoStack.length - 1];
    if (options.coalesce && top) {
      const merged = top.mergeWith(command);
      if (merged) {
        this.undoStack[this.undoStack.length - 1] = merged;
        return;
      }
    }

    this.undoStack.push(command);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
  }

  undo(): boolean {
    const command = this.undoStack.pop();
    if (!command) return false;
    command.undo(this.ctx);
    this.redoStack.push(command);
    return true;
  }

  redo(): boolean {
    const command = this.redoStack.pop();
    if (!command) return false;
    command.redo(this.ctx);
    this.undoStack.push(command);
    return true;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  get undoDepth(): number {
    return this.undoStack.length;
  }

  get redoDepth(): number {
    return this.redoStack.length;
  }
}
