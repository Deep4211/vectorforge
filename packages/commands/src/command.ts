import type { NodeId, SceneGraph } from '@vectorforge/document';

/**
 * Command & history contracts (ARCHITECTURE.md §10; ENGINE_CONTRACT.md §3).
 *
 * Every document mutation is an `ICommand`. This single pathway powers undo/redo
 * (CMD-1), autosave diffs, and — via {@link Op} — the V3 sync layer (CMD-8).
 * Commands are deterministic (CMD-7): they depend only on their captured payload
 * and the injected {@link CommandContext}; they read no wall-clock time or
 * randomness. They capture their inverse ("from") state on first `execute`, so
 * they compose inside a {@link CompositeCommand} and can be built without the
 * caller knowing current scene state.
 *
 * Selection is an editor-layer concern (Sprint 4); commands restore *document*
 * state exactly, and the editor captures/restores selection around them.
 */
export interface CommandContext {
  readonly scene: SceneGraph;
}

/** A serializable lowering of a command — the op the V3 sync layer composes with (CMD-8). */
export interface Op {
  readonly kind: string;
  readonly [key: string]: unknown;
}

export interface ICommand {
  /** Stable discriminant, e.g. `'move-node'`. */
  readonly type: string;
  execute(ctx: CommandContext): void;
  undo(ctx: CommandContext): void;
  redo(ctx: CommandContext): void;
  /**
   * Coalesce a subsequent command into this one (CMD-3), returning the merged
   * command, or `null` if they do not merge. The returned command carries the
   * original "from" and the latest "to", so its `undo` reverts the whole gesture.
   */
  mergeWith(next: ICommand): ICommand | null;
  toOp(): Op;
}

/** Base class: `redo` defaults to `execute`, commands don't merge unless they opt in. */
export abstract class Command implements ICommand {
  abstract readonly type: string;
  abstract execute(ctx: CommandContext): void;
  abstract undo(ctx: CommandContext): void;
  abstract toOp(): Op;

  redo(ctx: CommandContext): void {
    this.execute(ctx);
  }

  mergeWith(_next: ICommand): ICommand | null {
    return null;
  }
}

/** The index of `id` among its current siblings (roots if it has no parent). */
export function indexInSiblings(scene: SceneGraph, id: NodeId): number {
  const parentId = scene.parentOf(id);
  const siblings = parentId === null ? scene.roots() : scene.childrenOf(parentId);
  return siblings.indexOf(id);
}
