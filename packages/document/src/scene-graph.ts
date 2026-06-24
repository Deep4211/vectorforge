import { BoundingBox, type Matrix3 } from '@vectorforge/geometry';
import type { NodeId, SceneNode, SerializedDocument, TreeNode } from './types';
import { SCHEMA_VERSION } from './types';
import { withLocked, withVisibility } from './nodes';
import {
  deserializeNode,
  parseDocument,
  serializeDocument,
  stableStringify,
} from './serialization';

/** A removed subtree, captured so it can be restored at its original slot (enables undo). */
export interface RemovedSubtree {
  readonly nodes: readonly SceneNode[];
  readonly parentId: NodeId | null;
  readonly index: number;
}

function clampIndex(index: number | undefined, length: number): number {
  if (index === undefined || index > length) return length;
  return index < 0 ? 0 : index;
}

function insertAt<T>(arr: readonly T[], index: number, value: T): T[] {
  const copy = [...arr];
  copy.splice(index, 0, value);
  return copy;
}

function sameOrder(a: readonly NodeId[], b: readonly NodeId[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function localBounds(node: SceneNode): BoundingBox | null {
  switch (node.type) {
    case 'frame':
    case 'rectangle':
    case 'ellipse':
    case 'image':
      return BoundingBox.fromRect({ x: 0, y: 0, w: node.size.w, h: node.size.h });
    case 'text':
      return node.size
        ? BoundingBox.fromRect({ x: 0, y: 0, w: node.size.w, h: node.size.h })
        : null;
    case 'line':
      return BoundingBox.fromPoints([node.a, node.b]);
    case 'group':
      return null;
  }
}

/**
 * The authoritative, **mutable** scene graph — an id-indexed `Map` of immutable
 * node values plus ordered root ids (ARCHITECTURE.md §5.7). Mutations replace
 * node values (never edit them) and bump {@link version}; they are the
 * primitives the Sprint 3 command layer wraps (DOC-2 — only commands mutate the
 * document at the application layer).
 */
export class SceneGraph {
  private readonly nodes: Map<NodeId, SceneNode>;
  private rootIds: NodeId[];
  private _version = 0;
  private worldCache = new Map<NodeId, Matrix3>();

  private constructor(nodes: Map<NodeId, SceneNode>, rootIds: NodeId[]) {
    this.nodes = nodes;
    this.rootIds = rootIds;
  }

  static empty(): SceneGraph {
    return new SceneGraph(new Map(), []);
  }

  /** Build from a flat node list; root order follows first appearance. Validates integrity. */
  static fromNodes(nodes: readonly SceneNode[]): SceneGraph {
    const rootIds = nodes.filter((n) => n.parentId === null).map((n) => n.id);
    return SceneGraph.build(nodes, rootIds);
  }

  private static build(nodes: readonly SceneNode[], rootIds: readonly NodeId[]): SceneGraph {
    const map = new Map<NodeId, SceneNode>();
    for (const node of nodes) {
      if (map.has(node.id)) throw new Error(`Invalid document: duplicate node id "${node.id}"`);
      map.set(node.id, node);
    }
    validateIntegrity(map, rootIds);
    return new SceneGraph(map, [...rootIds]);
  }

  // ---- version / touch ---------------------------------------------------

  get version(): number {
    return this._version;
  }

  get size(): number {
    return this.nodes.size;
  }

  private touch(): void {
    this._version += 1;
    this.worldCache.clear();
  }

  // ---- queries -----------------------------------------------------------

  has(id: NodeId): boolean {
    return this.nodes.has(id);
  }

  get(id: NodeId): SceneNode | undefined {
    return this.nodes.get(id);
  }

  getOrThrow(id: NodeId): SceneNode {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Node not found: "${id}"`);
    return node;
  }

  roots(): readonly NodeId[] {
    return [...this.rootIds];
  }

  childrenOf(id: NodeId): readonly NodeId[] {
    return [...this.getOrThrow(id).childIds];
  }

  parentOf(id: NodeId): NodeId | null {
    return this.getOrThrow(id).parentId;
  }

  /** Siblings ordering this node belongs to: its parent's `childIds`, or the roots. */
  private siblingsOf(id: NodeId): readonly NodeId[] {
    const parentId = this.getOrThrow(id).parentId;
    return parentId === null ? this.rootIds : this.getOrThrow(parentId).childIds;
  }

  // ---- effective lock / visibility (own flag + ancestors) ----------------

  isEffectivelyVisible(id: NodeId): boolean {
    for (let cur: SceneNode | undefined = this.getOrThrow(id); cur; cur = this.parentNode(cur)) {
      if (!cur.visibility) return false;
    }
    return true;
  }

  isEffectivelyLocked(id: NodeId): boolean {
    for (let cur: SceneNode | undefined = this.getOrThrow(id); cur; cur = this.parentNode(cur)) {
      if (cur.locked) return true;
    }
    return false;
  }

  private parentNode(node: SceneNode): SceneNode | undefined {
    return node.parentId === null ? undefined : this.nodes.get(node.parentId);
  }

  // ---- traversal ---------------------------------------------------------

  /** Pre-order ids (render order: back-to-front). */
  flatten(): NodeId[] {
    const out: NodeId[] = [];
    const visit = (id: NodeId): void => {
      out.push(id);
      for (const child of this.getOrThrow(id).childIds) visit(child);
    };
    for (const root of this.rootIds) visit(root);
    return out;
  }

  /** Hit-test order: front-to-back (reverse of {@link flatten}). */
  hitOrder(): NodeId[] {
    return this.flatten().reverse();
  }

  descendants(id: NodeId): NodeId[] {
    const out: NodeId[] = [];
    const visit = (current: NodeId): void => {
      for (const child of this.getOrThrow(current).childIds) {
        out.push(child);
        visit(child);
      }
    };
    visit(id);
    return out;
  }

  ancestors(id: NodeId): NodeId[] {
    const out: NodeId[] = [];
    let parentId = this.getOrThrow(id).parentId;
    while (parentId !== null) {
      out.push(parentId);
      parentId = this.getOrThrow(parentId).parentId;
    }
    return out;
  }

  /** The authoritative tree the renderer walks (back-to-front), as a forest of roots. */
  renderTree(): readonly TreeNode[] {
    const build = (id: NodeId): TreeNode => {
      const node = this.getOrThrow(id);
      return { id, type: node.type, children: node.childIds.map(build) };
    };
    return this.rootIds.map(build);
  }

  /**
   * The layer-panel projection. Today it mirrors {@link renderTree}; the virtual-group
   * overlay (logical groups that organize the outline without being transform parents,
   * ARCHITECTURE.md §5.4) lands with the layer panel in Sprint 7.
   */
  outlineTree(): readonly TreeNode[] {
    return this.renderTree();
  }

  // ---- world transform (cached, invalidated on every mutation) -----------

  worldMatrix(id: NodeId): Matrix3 {
    const cached = this.worldCache.get(id);
    if (cached) return cached;
    const node = this.getOrThrow(id);
    const local = node.transform.toMatrix();
    const world = node.parentId === null ? local : this.worldMatrix(node.parentId).multiply(local);
    this.worldCache.set(id, world);
    return world;
  }

  /** World-space axis-aligned bounds. Groups union their children; null when empty. */
  worldBounds(id: NodeId): BoundingBox | null {
    const node = this.getOrThrow(id);
    const local = localBounds(node);
    if (local) {
      const m = this.worldMatrix(id);
      return BoundingBox.fromPoints(local.corners().map((corner) => m.transformPoint(corner)));
    }
    const boxes: BoundingBox[] = [];
    for (const childId of node.childIds) {
      const box = this.worldBounds(childId);
      if (box) boxes.push(box);
    }
    return boxes.length > 0 ? BoundingBox.fromBoxes(boxes) : null;
  }

  // ---- mutations ---------------------------------------------------------

  /** Add a fresh, childless node under `parentId` (or as a root) at `index`. */
  add(node: SceneNode, parentId: NodeId | null = null, index?: number): void {
    if (this.nodes.has(node.id)) throw new Error(`Cannot add: id "${node.id}" already exists`);
    if (node.childIds.length > 0)
      throw new Error('add expects a childless node; use insertSubtree to restore a subtree');
    const linked: SceneNode = { ...node, parentId, childIds: [] };
    this.nodes.set(linked.id, linked);
    this.linkChild(parentId, linked.id, index);
    this.touch();
  }

  /** Replace a node's props via `updater`. Structural links (id/type/parent/children) must be unchanged. */
  update(id: NodeId, updater: (node: SceneNode) => SceneNode): void {
    const current = this.getOrThrow(id);
    // Snapshot the structural links BEFORE calling the updater, so the guard
    // also catches an updater that mutates childIds in place (not just one that
    // returns a node with different links).
    const prevParentId = current.parentId;
    const prevChildIds = [...current.childIds];
    const next = updater(current);
    if (next.id !== current.id) throw new Error('update must not change a node id');
    if (next.type !== current.type) throw new Error('update must not change a node type');
    if (next.parentId !== prevParentId || !sameOrder(next.childIds, prevChildIds)) {
      throw new Error('update must not change structural links; use reparent/reorder');
    }
    this.nodes.set(id, next);
    this.touch();
  }

  setVisibility(id: NodeId, visibility: boolean): void {
    this.nodes.set(id, withVisibility(this.getOrThrow(id), visibility));
    this.touch();
  }

  setLocked(id: NodeId, locked: boolean): void {
    this.nodes.set(id, withLocked(this.getOrThrow(id), locked));
    this.touch();
  }

  /** Remove a node and its whole subtree; returns a capture for restoration (undo). */
  remove(id: NodeId): RemovedSubtree {
    const node = this.getOrThrow(id);
    const siblings = this.siblingsOf(id);
    const index = siblings.indexOf(id);
    const subtreeIds = [id, ...this.descendants(id)];
    const captured = subtreeIds.map((nid) => this.getOrThrow(nid));
    for (const nid of subtreeIds) this.nodes.delete(nid);
    this.unlinkChild(node.parentId, id);
    this.touch();
    return { nodes: captured, parentId: node.parentId, index };
  }

  /** Restore a previously removed subtree at its original parent and index. */
  insertSubtree(removed: RemovedSubtree): void {
    for (const node of removed.nodes) {
      if (this.nodes.has(node.id))
        throw new Error(`Cannot restore: id "${node.id}" already exists`);
    }
    for (const node of removed.nodes) this.nodes.set(node.id, node);
    const rootNode = removed.nodes[0];
    if (!rootNode) throw new Error('Cannot restore an empty subtree');
    this.linkChild(removed.parentId, rootNode.id, removed.index);
    this.touch();
  }

  /** Move a node (with its subtree) under a new parent. Rejects cycles (DOC-6). */
  reparent(id: NodeId, newParentId: NodeId | null, index?: number): void {
    const node = this.getOrThrow(id);
    if (newParentId !== null) {
      this.getOrThrow(newParentId);
      if (newParentId === id || this.descendants(id).includes(newParentId)) {
        throw new Error(
          `Reparent would create a cycle: "${id}" cannot become a child of its own descendant`,
        );
      }
    }
    this.unlinkChild(node.parentId, id);
    this.nodes.set(id, { ...node, parentId: newParentId });
    this.linkChild(newParentId, id, index);
    this.touch();
  }

  /** Move a node to a new position among its current siblings. */
  reorder(id: NodeId, index: number): void {
    const node = this.getOrThrow(id);
    const without = this.siblingsOf(id).filter((sid) => sid !== id);
    const next = insertAt(without, clampIndex(index, without.length), id);
    this.setSiblings(node.parentId, next);
    this.touch();
  }

  bringToFront(id: NodeId): void {
    this.reorder(id, this.siblingsOf(id).length - 1);
  }

  sendToBack(id: NodeId): void {
    this.reorder(id, 0);
  }

  bringForward(id: NodeId): void {
    this.reorder(id, this.siblingsOf(id).indexOf(id) + 1);
  }

  sendBackward(id: NodeId): void {
    this.reorder(id, this.siblingsOf(id).indexOf(id) - 1);
  }

  // ---- link maintenance (the only place parent/child arrays change) ------

  private linkChild(parentId: NodeId | null, childId: NodeId, index?: number): void {
    if (parentId === null) {
      this.rootIds = insertAt(this.rootIds, clampIndex(index, this.rootIds.length), childId);
      return;
    }
    const parent = this.getOrThrow(parentId);
    this.nodes.set(parentId, {
      ...parent,
      childIds: insertAt(parent.childIds, clampIndex(index, parent.childIds.length), childId),
    });
  }

  private unlinkChild(parentId: NodeId | null, childId: NodeId): void {
    if (parentId === null) {
      this.rootIds = this.rootIds.filter((id) => id !== childId);
      return;
    }
    const parent = this.getOrThrow(parentId);
    this.nodes.set(parentId, {
      ...parent,
      childIds: parent.childIds.filter((id) => id !== childId),
    });
  }

  private setSiblings(parentId: NodeId | null, childIds: NodeId[]): void {
    if (parentId === null) {
      this.rootIds = childIds;
      return;
    }
    this.nodes.set(parentId, { ...this.getOrThrow(parentId), childIds });
  }

  // ---- serialization -----------------------------------------------------

  toJSON(): SerializedDocument {
    return serializeDocument(this.nodes.values(), this.rootIds, SCHEMA_VERSION);
  }

  /** Deterministic JSON string (sorted keys) — diff-friendly and round-trip stable (DOC-9). */
  serialize(): string {
    return stableStringify(this.toJSON());
  }

  static fromJSON(input: string | unknown): SceneGraph {
    const doc = parseDocument(input);
    const nodes = doc.nodes.map(deserializeNode);
    return SceneGraph.build(nodes, doc.rootIds);
  }
}

// ---------------------------------------------------------------------------

function validateIntegrity(map: ReadonlyMap<NodeId, SceneNode>, rootIds: readonly NodeId[]): void {
  const fail = (m: string): never => {
    throw new Error(`Invalid document: ${m}`);
  };

  // Roots must be exactly the parent-less nodes, present and unique.
  const rootSet = new Set(rootIds);
  if (rootSet.size !== rootIds.length) fail('duplicate root id');
  for (const id of rootIds) {
    const node = map.get(id);
    if (!node) fail(`root "${id}" does not exist`);
    else if (node.parentId !== null) fail(`root "${id}" has a parentId`);
  }
  for (const node of map.values()) {
    if (node.parentId === null && !rootSet.has(node.id))
      fail(`node "${node.id}" is parent-less but not a root`);
  }

  // Parent/child links must be consistent and acyclic.
  for (const node of map.values()) {
    if (node.parentId !== null && !map.has(node.parentId)) {
      fail(`node "${node.id}" references missing parent "${node.parentId}"`);
    }
    if (new Set(node.childIds).size !== node.childIds.length)
      fail(`node "${node.id}" has duplicate children`);
    for (const childId of node.childIds) {
      const child = map.get(childId);
      if (!child) fail(`node "${node.id}" references missing child "${childId}"`);
      else if (child.parentId !== node.id) fail(`child "${childId}" disagrees about its parent`);
    }
  }

  // Every node must be reachable from a root exactly once (no cycles, no orphans).
  let reached = 0;
  const seen = new Set<NodeId>();
  const visit = (id: NodeId): void => {
    if (seen.has(id)) fail(`cycle or shared child detected at "${id}"`);
    seen.add(id);
    reached += 1;
    for (const childId of map.get(id)!.childIds) visit(childId);
  };
  for (const id of rootIds) visit(id);
  if (reached !== map.size) fail('graph contains unreachable nodes (orphans or cycles)');
}
