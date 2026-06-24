/**
 * `@vectorforge/commands` — public API entry.
 *
 * The command & history system (ARCHITECTURE.md §10; ENGINE_CONTRACT.md §3).
 * Every document mutation is a reversible `ICommand` applied to a `SceneGraph`
 * via a `CommandContext`; the `HistoryManager` provides undo/redo. Depends only
 * on document, geometry, and shared — no editor/renderer/React.
 *
 * Import only through this entry (ENGINE_CONTRACT.md §6 DEP-5).
 */

export { type ICommand, type CommandContext, type Op, Command, indexInSiblings } from './command';
export { CompositeCommand } from './composite';
export { HistoryManager, type HistoryOptions } from './history';
export { CreateNodeCommand, DeleteNodeCommand } from './node-commands';
export {
  MoveNodeCommand,
  ResizeNodeCommand,
  RotateNodeCommand,
  SetPropertyCommand,
} from './mutation-commands';
export { ReorderCommand, ReparentCommand } from './structure-commands';
export { createGroupCommand, UngroupCommand } from './group-commands';

/** Package identity (stable across the project; consumed by the app shell). */
export const PACKAGE_ID = '@vectorforge/commands' as const;

/** Architectural layer (see docs/ENGINE_CONTRACT.md §6). */
export const LAYER = 'domain' as const;
