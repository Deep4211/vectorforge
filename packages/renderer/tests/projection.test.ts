import { describe, expect, it } from 'vitest';
import { Transform, Vector2, type Viewport } from '@vectorforge/geometry';
import {
  createEllipse,
  createFrame,
  createGroup,
  createImage,
  createLine,
  createRectangle,
  createText,
  SceneGraph,
  withOpacity,
} from '@vectorforge/document';
import { projectScene } from '@vectorforge/renderer';

const VIEW = { width: 200, height: 200 };
const VIEWPORT: Viewport = { panX: 0, panY: 0, zoom: 1 };

function rectAt(id: string, x: number, y: number, w = 20, h = 20) {
  return createRectangle({
    id,
    size: { w, h },
    transform: new Transform(new Vector2(x, y), 0, Vector2.ONE),
    fill: '#7C5CFF',
  });
}

describe('projectScene — display list', () => {
  it('emits items in painter order (back-to-front) and drops groups', () => {
    const g = SceneGraph.empty();
    g.add(createFrame({ id: 'f', size: { w: 100, h: 100 } }));
    g.add(rectAt('a', 0, 0), 'f');
    g.add(rectAt('b', 10, 10), 'f');

    const scene = projectScene(g, VIEWPORT, VIEW);
    expect(scene.items.map((i) => i.id)).toEqual(['f', 'a', 'b']); // flatten order
    expect(scene.items.map((i) => i.kind)).toEqual(['frame', 'rectangle', 'rectangle']);
    expect(scene.totalCount).toBe(3);
  });

  it('excludes a group node but propagates its transform to children (RND-3)', () => {
    const g = SceneGraph.empty();
    g.add(
      createGroup({ id: 'grp', transform: new Transform(new Vector2(100, 0), 0, Vector2.ONE) }),
    );
    g.add(rectAt('child', 0, 0), 'grp');

    const scene = projectScene(g, VIEWPORT, VIEW);
    expect(scene.items.map((i) => i.id)).toEqual(['child']);
    // child world matrix carries the group's +100 x translation.
    expect(scene.items[0]!.worldMatrix.e).toBe(100);
  });

  it('multiplies opacity down the ancestry chain (effective alpha)', () => {
    const g = SceneGraph.empty();
    g.add(createFrame({ id: 'f', size: { w: 100, h: 100 } }));
    g.add(rectAt('a', 0, 0), 'f');
    g.update('f', (n) => withOpacity(n, 0.5));
    g.update('a', (n) => withOpacity(n, 0.5));

    const scene = projectScene(g, VIEWPORT, VIEW);
    const child = scene.items.find((i) => i.id === 'a')!;
    expect(child.opacity).toBeCloseTo(0.25, 9);
  });

  it('multiplies opacity across the FULL ancestor chain, not just the parent', () => {
    const g = SceneGraph.empty();
    g.add(createFrame({ id: 'f', size: { w: 100, h: 100 } }));
    g.add(createGroup({ id: 'grp' }), 'f');
    g.add(rectAt('a', 0, 0), 'grp');
    g.update('f', (n) => withOpacity(n, 0.5));
    g.update('grp', (n) => withOpacity(n, 0.5));
    g.update('a', (n) => withOpacity(n, 0.5));

    const scene = projectScene(g, VIEWPORT, VIEW);
    const child = scene.items.find((i) => i.id === 'a')!;
    expect(child.opacity).toBeCloseTo(0.125, 9); // 0.5³ — fails if only the parent is applied (0.25)
  });

  it('lowers line / image / ellipse fields from the source node', () => {
    const g = SceneGraph.empty();
    g.add(createEllipse({ id: 'e', size: { w: 40, h: 20 }, fill: '#0AF' }));
    g.add(
      createLine({
        id: 'l',
        a: { x: 0, y: 0 },
        b: { x: 30, y: 30 },
        stroke: '#111',
        strokeWidth: 3,
      }),
    );
    g.add(createImage({ id: 'i', size: { w: 50, h: 50 }, assetRef: 'asset://x', fit: 'cover' }));
    const scene = projectScene(g, VIEWPORT, VIEW);

    const e = scene.items.find((i) => i.id === 'e')!;
    expect(e.kind === 'ellipse' && e.fill).toBe('#0AF');
    const l = scene.items.find((i) => i.id === 'l')!;
    if (l.kind !== 'line') throw new Error('expected line');
    expect([l.a, l.b, l.stroke, l.strokeWidth]).toEqual([
      { x: 0, y: 0 },
      { x: 30, y: 30 },
      '#111',
      3,
    ]);
    const img = scene.items.find((i) => i.id === 'i')!;
    if (img.kind !== 'image') throw new Error('expected image');
    expect([img.assetRef, img.fit, img.size]).toEqual(['asset://x', 'cover', { w: 50, h: 50 }]);
  });

  it('skips effectively-invisible nodes entirely', () => {
    const g = SceneGraph.empty();
    g.add(rectAt('a', 0, 0));
    g.add(rectAt('b', 30, 30));
    g.setVisibility('b', false);

    const scene = projectScene(g, VIEWPORT, VIEW);
    expect(scene.items.map((i) => i.id)).toEqual(['a']);
    expect(scene.totalCount).toBe(1); // invisible node is not counted as paintable
  });

  it('culls off-screen nodes but keeps them in the document (RND-6)', () => {
    const g = SceneGraph.empty();
    g.add(rectAt('on', 10, 10));
    g.add(rectAt('off', 5000, 5000));

    const scene = projectScene(g, VIEWPORT, VIEW);
    expect(scene.items.map((i) => i.id)).toEqual(['on']);
    expect(scene.totalCount).toBe(2); // both are paintable; one is merely culled
    expect(g.has('off')).toBe(true); // model untouched
  });

  it('keeps a node visible once the viewport pans to include it', () => {
    const g = SceneGraph.empty();
    g.add(rectAt('off', 5000, 5000));
    const panned: Viewport = { panX: -4900, panY: -4900, zoom: 1 };
    const scene = projectScene(g, panned, VIEW);
    expect(scene.items.map((i) => i.id)).toEqual(['off']);
  });

  it('never culls an unbounded node (auto-sized text has no world AABB)', () => {
    const g = SceneGraph.empty();
    // An ellipse far off-screen IS culled; a sizeless text node cannot be.
    g.add(
      createEllipse({
        id: 'e',
        size: { w: 10, h: 10 },
        transform: new Transform(new Vector2(9000, 9000), 0, Vector2.ONE),
      }),
    );
    g.add(
      createText({
        id: 't',
        content: 'far away',
        transform: new Transform(new Vector2(9000, 9000), 0, Vector2.ONE),
      }),
    );
    const scene = projectScene(g, VIEWPORT, VIEW);
    expect(scene.items.map((i) => i.id)).toEqual(['t']); // ellipse culled; unbounded text kept
  });
});

describe('projectScene — cull boundary & margin (RND-6)', () => {
  it('keeps a node that straddles the viewport edge (intersect, not contain)', () => {
    const g = SceneGraph.empty();
    g.add(rectAt('edge', 190, 10, 20, 20)); // bounds [190,210]×[10,30] — crosses x=200
    const scene = projectScene(g, VIEWPORT, VIEW, { cullMargin: 0 });
    expect(scene.items.map((i) => i.id)).toEqual(['edge']);
  });

  it('keeps a just-off-screen node that falls inside the cull margin band', () => {
    const g = SceneGraph.empty();
    g.add(rectAt('band', 210, 10, 20, 20)); // outside [0,200] but inside default [-64,264]
    const withMargin = projectScene(g, VIEWPORT, VIEW); // default margin 64
    expect(withMargin.items.map((i) => i.id)).toEqual(['band']);

    const noMargin = projectScene(g, VIEWPORT, VIEW, { cullMargin: 0 });
    expect(noMargin.items.map((i) => i.id)).toEqual([]); // now culled
    expect(noMargin.totalCount).toBe(1); // still counted as paintable (RND-6)
  });
});

describe('projectScene — read-only over the document (RND-1)', () => {
  it('does not mutate the scene (version + node values unchanged)', () => {
    const g = SceneGraph.empty();
    g.add(createFrame({ id: 'f', size: { w: 100, h: 100 } }));
    g.add(rectAt('a', 10, 10), 'f');
    const versionBefore = g.version;
    const snapshotBefore = JSON.stringify(g.getOrThrow('a'));

    projectScene(g, VIEWPORT, VIEW);

    expect(g.version).toBe(versionBefore);
    expect(JSON.stringify(g.getOrThrow('a'))).toBe(snapshotBefore);
  });
});
