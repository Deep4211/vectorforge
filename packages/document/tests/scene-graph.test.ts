import { describe, expect, it } from 'vitest';
import { Transform, Vector2 } from '@vectorforge/geometry';
import {
  createFrame,
  createGroup,
  createRectangle,
  SceneGraph,
  withName,
} from '@vectorforge/document';

const rect = (id: string, w = 10, h = 10) => createRectangle({ id, size: { w, h } });
const frameAt = (id: string, x: number, y: number) =>
  createFrame({
    id,
    size: { w: 100, h: 100 },
    transform: new Transform(new Vector2(x, y), 0, Vector2.ONE),
  });

describe('SceneGraph — structure & queries', () => {
  it('adds nodes as roots and children', () => {
    const g = SceneGraph.empty();
    g.add(createFrame({ id: 'f', size: { w: 10, h: 10 } }));
    g.add(rect('r'), 'f');
    expect(g.size).toBe(2);
    expect(g.roots()).toEqual(['f']);
    expect(g.childrenOf('f')).toEqual(['r']);
    expect(g.parentOf('r')).toBe('f');
    expect(g.has('r')).toBe(true);
    expect(() => g.getOrThrow('nope')).toThrow(/not found/);
  });

  it('rejects duplicate ids and non-childless adds', () => {
    const g = SceneGraph.empty();
    g.add(rect('r'));
    expect(() => g.add(rect('r'))).toThrow(/already exists/);
  });

  it('bumps version and invalidates the world-matrix cache on mutation', () => {
    const g = SceneGraph.empty();
    g.add(frameAt('f', 100, 50));
    g.add(rect('r'), 'f');
    const v0 = g.version;
    expect(g.worldMatrix('r').transformPoint({ x: 0, y: 0 }).equals(new Vector2(100, 50))).toBe(
      true,
    );
    g.update('f', (n) => withName(n, 'renamed')); // unrelated change still bumps version
    expect(g.version).toBeGreaterThan(v0);
    // move the frame; cached world matrix must reflect the new position
    g.update('f', (n) => ({
      ...n,
      transform: new Transform(new Vector2(200, 50), 0, Vector2.ONE),
    }));
    expect(g.worldMatrix('r').transformPoint({ x: 0, y: 0 }).equals(new Vector2(200, 50))).toBe(
      true,
    );
  });
});

describe('SceneGraph — z-order', () => {
  it('reorders siblings and supports front/back/forward/backward', () => {
    const g = SceneGraph.empty();
    for (const id of ['a', 'b', 'c']) g.add(rect(id));
    expect(g.roots()).toEqual(['a', 'b', 'c']);
    g.bringToFront('a');
    expect(g.roots()).toEqual(['b', 'c', 'a']);
    g.sendToBack('a');
    expect(g.roots()).toEqual(['a', 'b', 'c']);
    g.bringForward('a');
    expect(g.roots()).toEqual(['b', 'a', 'c']);
    g.sendBackward('a');
    expect(g.roots()).toEqual(['a', 'b', 'c']);
    g.reorder('a', 2);
    expect(g.roots()).toEqual(['b', 'c', 'a']);
  });
});

describe('SceneGraph — traversal', () => {
  it('flattens in render order and reverses for hit order', () => {
    const g = SceneGraph.empty();
    g.add(createFrame({ id: 'f', size: { w: 10, h: 10 } }));
    g.add(rect('r1'), 'f');
    g.add(rect('r2'), 'f');
    expect(g.flatten()).toEqual(['f', 'r1', 'r2']);
    expect(g.hitOrder()).toEqual(['r2', 'r1', 'f']);
    expect(g.descendants('f')).toEqual(['r1', 'r2']);
    expect(g.ancestors('r1')).toEqual(['f']);
  });

  it('projects a render tree (outline mirrors it for now)', () => {
    const g = SceneGraph.empty();
    g.add(createFrame({ id: 'f', size: { w: 10, h: 10 } }));
    g.add(rect('r'), 'f');
    const tree = g.renderTree();
    expect(tree).toEqual([
      { id: 'f', type: 'frame', children: [{ id: 'r', type: 'rectangle', children: [] }] },
    ]);
    expect(g.outlineTree()).toEqual(tree);
  });
});

describe('SceneGraph — reparent & cycles', () => {
  it('reparents a node (with its subtree) and to the root', () => {
    const g = SceneGraph.empty();
    g.add(createFrame({ id: 'f1', size: { w: 10, h: 10 } }));
    g.add(createFrame({ id: 'f2', size: { w: 10, h: 10 } }));
    g.add(rect('r'), 'f1');
    g.reparent('r', 'f2');
    expect(g.childrenOf('f1')).toEqual([]);
    expect(g.childrenOf('f2')).toEqual(['r']);
    expect(g.parentOf('r')).toBe('f2');
    g.reparent('r', null); // to root
    expect(g.parentOf('r')).toBeNull();
    expect(g.roots()).toContain('r');
  });

  it('rejects a reparent that would create a cycle (DOC-6)', () => {
    const g = SceneGraph.empty();
    g.add(createGroup({ id: 'outer' }));
    g.add(createGroup({ id: 'inner' }), 'outer');
    expect(() => g.reparent('outer', 'inner')).toThrow(/cycle/);
    expect(() => g.reparent('outer', 'outer')).toThrow(/cycle/);
  });
});

describe('SceneGraph — remove & restore (undo support)', () => {
  it('removes a subtree and restores it at the same slot with z-order intact', () => {
    const g = SceneGraph.empty();
    for (const id of ['a', 'b', 'c']) g.add(createFrame({ id, size: { w: 10, h: 10 } }));
    g.add(rect('b-child'), 'b');
    const removed = g.remove('b');
    expect(removed.parentId).toBeNull();
    expect(removed.index).toBe(1);
    expect(removed.nodes.map((n) => n.id)).toEqual(['b', 'b-child']); // root + descendants
    expect(g.roots()).toEqual(['a', 'c']);
    expect(g.has('b-child')).toBe(false);
    g.insertSubtree(removed);
    expect(g.roots()).toEqual(['a', 'b', 'c']); // restored at original index
    expect(g.childrenOf('b')).toEqual(['b-child']);
  });
});

describe('SceneGraph — effective lock & visibility cascade', () => {
  it('hides/locks descendants without overwriting their own flags (restorable)', () => {
    const g = SceneGraph.empty();
    g.add(createFrame({ id: 'f', size: { w: 10, h: 10 } }));
    g.add(rect('r'), 'f');
    g.setVisibility('f', false);
    expect(g.isEffectivelyVisible('r')).toBe(false);
    expect(g.get('r')?.visibility).toBe(true); // own flag preserved
    g.setVisibility('f', true);
    expect(g.isEffectivelyVisible('r')).toBe(true); // restored

    g.setLocked('f', true);
    expect(g.isEffectivelyLocked('r')).toBe(true);
    expect(g.get('r')?.locked).toBe(false);
    g.setLocked('f', false);
    expect(g.isEffectivelyLocked('r')).toBe(false);
  });
});

describe('SceneGraph — world transform & bounds', () => {
  it('composes ancestor transforms and computes world AABBs', () => {
    const g = SceneGraph.empty();
    g.add(frameAt('f', 100, 50));
    g.add(
      createRectangle({
        id: 'r',
        size: { w: 20, h: 10 },
        transform: new Transform(new Vector2(10, 10), 0, Vector2.ONE),
      }),
      'f',
    );
    // world origin of r = frame(100,50) + local(10,10)
    expect(g.worldMatrix('r').transformPoint({ x: 0, y: 0 }).equals(new Vector2(110, 60))).toBe(
      true,
    );
    expect(g.worldBounds('r')?.equals({ minX: 110, minY: 60, maxX: 130, maxY: 70 })).toBe(true);
    // group/frame bounds: the frame has its own size box
    expect(g.worldBounds('f')?.equals({ minX: 100, minY: 50, maxX: 200, maxY: 150 })).toBe(true);
  });
});

describe('SceneGraph — update guard', () => {
  it('rejects structural changes through update()', () => {
    const g = SceneGraph.empty();
    g.add(rect('r'));
    expect(() => g.update('r', (n) => ({ ...n, id: 'x' }))).toThrow(/id/);
    expect(() => g.update('r', (n) => ({ ...n, parentId: 'y' }))).toThrow(/structural/);
  });
});

describe('SceneGraph — edges', () => {
  it('insertSubtree rejects ids that already exist and empty subtrees', () => {
    const g = SceneGraph.empty();
    g.add(rect('r'));
    const removed = g.remove('r');
    g.insertSubtree(removed);
    expect(() => g.insertSubtree(removed)).toThrow(/already exists/);
    expect(() => g.insertSubtree({ nodes: [], parentId: null, index: 0 })).toThrow(/empty subtree/);
  });

  it('world bounds are null for an empty group and a box once it has children', () => {
    const g = SceneGraph.empty();
    g.add(createGroup({ id: 'grp' }));
    expect(g.worldBounds('grp')).toBeNull();
    g.add(rect('r'), 'grp');
    expect(g.worldBounds('grp')).not.toBeNull();
  });
});

describe('SceneGraph — world bounds (rotated)', () => {
  it('returns the world AABB of a rotated rectangle', () => {
    const g = SceneGraph.empty();
    // 20×10 rect rotated 90° about its local origin → x ∈ [-10,0], y ∈ [0,20]
    g.add(
      createRectangle({
        id: 'r',
        size: { w: 20, h: 10 },
        transform: new Transform(Vector2.ZERO, 90, Vector2.ONE),
      }),
    );
    expect(g.worldBounds('r')?.equals({ minX: -10, minY: 0, maxX: 0, maxY: 20 }, 1e-6)).toBe(true);
  });
});

describe('SceneGraph — index handling', () => {
  it('clamps reorder index to the sibling range', () => {
    const g = SceneGraph.empty();
    for (const id of ['a', 'b', 'c']) g.add(rect(id));
    g.reorder('a', 99); // over-length → end
    expect(g.roots()).toEqual(['b', 'c', 'a']);
    g.reorder('a', -5); // negative → start
    expect(g.roots()).toEqual(['a', 'b', 'c']);
  });

  it('reparents at an explicit index', () => {
    const g = SceneGraph.empty();
    g.add(createFrame({ id: 'f', size: { w: 10, h: 10 } }));
    g.add(rect('x'), 'f');
    g.add(rect('y'), 'f');
    g.add(rect('z'));
    g.reparent('z', 'f', 1); // insert between x and y
    expect(g.childrenOf('f')).toEqual(['x', 'z', 'y']);
  });

  it('insertSubtree clamps a now-out-of-range original index', () => {
    const g = SceneGraph.empty();
    for (const id of ['a', 'b', 'c', 'd']) g.add(rect(id));
    const removed = g.remove('d'); // captured index 3
    g.remove('a');
    g.remove('b'); // roots now ['c']; index 3 no longer valid
    g.insertSubtree(removed); // clamps to end
    expect(g.roots()).toEqual(['c', 'd']);
  });
});

describe('SceneGraph — multi-level cascade', () => {
  it('cascades effective visibility/lock across grandparent → parent → child', () => {
    const g = SceneGraph.empty();
    g.add(createFrame({ id: 'gp', size: { w: 10, h: 10 } }));
    g.add(createGroup({ id: 'p' }), 'gp');
    g.add(rect('c'), 'p');
    g.setVisibility('gp', false);
    expect(g.isEffectivelyVisible('c')).toBe(false);
    expect(g.get('c')?.visibility).toBe(true); // own flag preserved two levels down
    g.setVisibility('gp', true);
    expect(g.isEffectivelyVisible('c')).toBe(true);
    g.setLocked('gp', true);
    expect(g.isEffectivelyLocked('c')).toBe(true);
  });
});

describe('SceneGraph — integrity validation', () => {
  const broken = (id: string, patch: Record<string, unknown>) => ({
    ...createRectangle({ id, size: { w: 1, h: 1 } }),
    ...patch,
  });

  it('rejects malformed flat node lists', () => {
    const a = createRectangle({ id: 'a', size: { w: 1, h: 1 } });
    expect(() => SceneGraph.fromNodes([a, broken('o', { parentId: 'ghost' })])).toThrow(
      /Invalid document/,
    );
    expect(() => SceneGraph.fromNodes([a, a])).toThrow(/duplicate node id/);
  });

  it('rejects duplicate childIds, parent/child disagreement, and cycles', () => {
    // duplicate children
    expect(() =>
      SceneGraph.fromNodes([broken('p', { childIds: ['c', 'c'] }), broken('c', { parentId: 'p' })]),
    ).toThrow(/duplicate children/);
    // child disagrees about its parent (claims to be a root)
    expect(() =>
      SceneGraph.fromNodes([broken('p', { childIds: ['x'] }), broken('x', { parentId: null })]),
    ).toThrow(/disagrees|child/);
    // 2-cycle: neither node is reachable from a root
    expect(() =>
      SceneGraph.fromNodes([
        broken('a', { parentId: 'b', childIds: ['b'] }),
        broken('b', { parentId: 'a', childIds: ['a'] }),
      ]),
    ).toThrow(/Invalid document/);
  });
});
