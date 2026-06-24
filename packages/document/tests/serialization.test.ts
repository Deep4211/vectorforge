import { describe, expect, it } from 'vitest';
import { Transform, Vector2 } from '@vectorforge/geometry';
import {
  createEllipse,
  createFrame,
  createImage,
  createLine,
  createRectangle,
  createText,
  SceneGraph,
  stableStringify,
} from '@vectorforge/document';

function sample(): SceneGraph {
  const g = SceneGraph.empty();
  g.add(createFrame({ id: 'f', size: { w: 390, h: 844 }, backgroundColor: '#0B0B0F' }));
  g.add(
    createRectangle({
      id: 'r',
      size: { w: 20, h: 10 },
      fill: '#7C5CFF',
      transform: new Transform(new Vector2(10, 20), 30, Vector2.ONE),
    }),
    'f',
  );
  return g;
}

describe('serialization', () => {
  it('round-trips losslessly through serialize/fromJSON', () => {
    const g = sample();
    const json = g.serialize();
    const restored = SceneGraph.fromJSON(json);
    expect(restored.serialize()).toBe(json);
    expect(restored.toJSON()).toEqual(g.toJSON());

    const r = restored.getOrThrow('r');
    expect(r.type).toBe('rectangle');
    if (r.type === 'rectangle') expect(r.fill).toBe('#7C5CFF');
    expect(r.transform.position.equals(new Vector2(10, 20))).toBe(true);
    expect(r.transform.rotation).toBe(30);
    // structure (z-order) preserved
    expect(restored.roots()).toEqual(['f']);
    expect(restored.childrenOf('f')).toEqual(['r']);
  });

  it('is deterministic (same content → identical output; keys sorted)', () => {
    expect(sample().serialize()).toBe(sample().serialize());
    expect(stableStringify({ b: 1, a: 2 })).toBe(JSON.stringify({ a: 2, b: 1 }, null, 2));
  });

  it('is deterministic regardless of construction path', () => {
    const build1 = () => {
      const g = SceneGraph.empty();
      g.add(createFrame({ id: 'f', size: { w: 10, h: 10 } }));
      g.add(createRectangle({ id: 'a', size: { w: 1, h: 1 } }), 'f');
      g.add(createRectangle({ id: 'b', size: { w: 1, h: 1 } }), 'f');
      return g;
    };
    const build2 = () => {
      const g = SceneGraph.empty();
      g.add(createFrame({ id: 'f', size: { w: 10, h: 10 } }));
      g.add(createRectangle({ id: 'b', size: { w: 1, h: 1 } }), 'f');
      g.add(createRectangle({ id: 'a', size: { w: 1, h: 1 } }), 'f');
      g.reorder('a', 0); // reach the same logical state via a different path
      return g;
    };
    expect(build2().serialize()).toBe(build1().serialize());
  });

  it('round-trips every node type losslessly', () => {
    const g = SceneGraph.empty();
    g.add(
      createFrame({
        id: 'f',
        size: { w: 390, h: 844 },
        backgroundColor: '#0B0B0F',
        clipsContent: false,
      }),
    );
    g.add(
      createRectangle({ id: 'r', size: { w: 20, h: 10 }, fill: '#7C5CFF', cornerRadius: 4 }),
      'f',
    );
    g.add(createEllipse({ id: 'e', size: { w: 8, h: 8 }, fill: '#3FCF8E' }), 'f');
    g.add(
      createLine({ id: 'l', a: { x: 0, y: 0 }, b: { x: 5, y: 9 }, stroke: '#FFF', strokeWidth: 2 }),
      'f',
    );
    g.add(
      createText({
        id: 't',
        content: 'Hi',
        fontWeight: 700,
        fontSize: 20,
        textAlign: 'center',
        size: { w: 50, h: 24 },
      }),
      'f',
    );
    g.add(
      createImage({
        id: 'i',
        size: { w: 16, h: 16 },
        assetRef: 'asset-9',
        fit: 'cover',
        altText: 'logo',
      }),
      'f',
    );
    const restored = SceneGraph.fromJSON(g.serialize());
    expect(restored.serialize()).toBe(g.serialize());
    expect(restored.toJSON()).toEqual(g.toJSON());
  });

  it('rejects type-specific corruption on load (DOC-10)', () => {
    const g = SceneGraph.empty();
    g.add(createRectangle({ id: 'r', size: { w: 1, h: 1 } }));
    const doc = JSON.parse(g.serialize()) as { nodes: Array<Record<string, unknown>> };
    const noSize = {
      ...doc,
      nodes: doc.nodes.map((n) => {
        const copy = { ...n };
        delete copy.size;
        return copy;
      }),
    };
    expect(() => SceneGraph.fromJSON(noSize)).toThrow(/size/);
  });

  it('validates on load and rejects malformed documents (DOC-10)', () => {
    const doc = JSON.parse(sample().serialize()) as {
      version: string;
      rootIds: string[];
      nodes: Array<Record<string, unknown>>;
    };
    const withNodes = (map: (n: Record<string, unknown>) => Record<string, unknown>) => ({
      ...doc,
      nodes: doc.nodes.map((n) => (n.id === 'r' ? map(n) : n)),
    });

    expect(() => SceneGraph.fromJSON('{ not json')).toThrow(/Invalid document/);
    expect(() => SceneGraph.fromJSON({ ...doc, version: 1 })).toThrow(/version/);
    expect(() => SceneGraph.fromJSON({ ...doc, rootIds: 'nope' })).toThrow(/rootIds/);
    expect(() => SceneGraph.fromJSON(withNodes((n) => ({ ...n, type: 'blob' })))).toThrow(
      /unknown type/,
    );
    expect(() => SceneGraph.fromJSON(withNodes((n) => ({ ...n, transform: undefined })))).toThrow(
      /transform/,
    );
    expect(() => SceneGraph.fromJSON(withNodes((n) => ({ ...n, name: '' })))).toThrow(/empty name/);
    expect(() => SceneGraph.fromJSON(withNodes((n) => ({ ...n, visibility: 'yes' })))).toThrow(
      /visibility/,
    );
    expect(() => SceneGraph.fromJSON(withNodes((n) => ({ ...n, opacity: 'x' })))).toThrow(
      /opacity/,
    );
    expect(() => SceneGraph.fromJSON(withNodes((n) => ({ ...n, parentId: 7 })))).toThrow(
      /parentId/,
    );
    expect(() => SceneGraph.fromJSON(withNodes((n) => ({ ...n, childIds: 'x' })))).toThrow(
      /childIds/,
    );
  });

  it('rejects structurally broken graphs on load (dangling child reference)', () => {
    const doc = JSON.parse(sample().serialize()) as {
      version: string;
      rootIds: string[];
      nodes: Array<Record<string, unknown>>;
    };
    const broken = {
      ...doc,
      nodes: doc.nodes.map((n) => (n.id === 'f' ? { ...n, childIds: ['ghost'] } : n)),
    };
    expect(() => SceneGraph.fromJSON(broken)).toThrow(/missing child|child/);
  });
});
