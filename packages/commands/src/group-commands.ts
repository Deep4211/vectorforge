import type { NodeId, SceneNode } from '@vectorforge/document';
import { Command, type CommandContext, indexInSiblings, type Op } from './command';
import { CompositeCommand } from './composite';
import { CreateNodeCommand } from './node-commands';
import { ReparentCommand } from './structure-commands';

/**
 * Group existing nodes under a new group node: create the group, then reparent
 * each child into it (preserving order). A {@link CompositeCommand}, so undo
 * reverses atomically — children return to their exact prior parents/indices and
 * the group is removed (CMD-5, CMD-1).
 */
export function createGroupCommand(
  group: SceneNode,
  childIds: readonly NodeId[],
  parentId: NodeId | null = null,
  index?: number,
): CompositeCommand {
  const children = [
    new CreateNodeCommand(group, parentId, index),
    ...childIds.map((childId) => new ReparentCommand(childId, group.id)),
  ];
  return new CompositeCommand(children, 'group');
}

/**
 * Dissolve a group: move its children into the group's parent at the group's
 * slot (preserving order), then remove the group. Undo re-creates the group at
 * its slot and re-parents the children back into it (CMD-1).
 */
export class UngroupCommand extends Command {
  readonly type = 'ungroup';
  private captured: {
    group: SceneNode;
    parentId: NodeId | null;
    index: number;
    childIds: NodeId[];
  } | null = null;

  constructor(private readonly groupId: NodeId) {
    super();
  }

  execute(ctx: CommandContext): void {
    const scene = ctx.scene;
    const group = scene.getOrThrow(this.groupId);
    const parentId = group.parentId;
    const index = indexInSiblings(scene, this.groupId);
    const childIds = [...scene.childrenOf(this.groupId)];
    this.captured = { group, parentId, index, childIds };

    childIds.forEach((childId, i) => scene.reparent(childId, parentId, index + i));
    scene.remove(this.groupId);
  }

  undo(ctx: CommandContext): void {
    if (!this.captured) return;
    const { group, parentId, index, childIds } = this.captured;
    const bareGroup = { ...group, parentId: null, childIds: [] } as SceneNode;
    ctx.scene.add(bareGroup, parentId, index);
    childIds.forEach((childId, i) => ctx.scene.reparent(childId, this.groupId, i));
  }

  toOp(): Op {
    return { kind: this.type, id: this.groupId };
  }
}
