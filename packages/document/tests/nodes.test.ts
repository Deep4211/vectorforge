import { describe, expect, it } from 'vitest';
import { Transform, Vector2 } from '@vectorforge/geometry';
import {
  createEllipse,
  createFrame,
  createGroup,
  createImage,
  createLine,
  createRectangle,
  createText,
  withLocked,
  withMetadata,
  withName,
  withOpacity,
  withTransform,
  withVisibility,
} from '@vectorforge/document';

describe('node factories', () => {
  it('apply common defaults', () => {
    const r = createRectangle({ id: 'r1', size: { w: 10, h: 20 } });
    expect(r.type).toBe('rectangle');
    expect(r.name).toBe('Rectangle');
    expect(r.transform.equals(Transform.IDENTITY)).toBe(true);
    expect(r.visibility).toBe(true);
    expect(r.locked).toBe(false);
    expect(r.opacity).toBe(1);
    expect(r.metadata).toEqual({});
    expect(r.parentId).toBeNull();
    expect(r.childIds).toEqual([]);
  });

  it('trim names and fall back to the default when empty (DOC-8)', () => {
    expect(createGroup({ id: 'g', name: '  Hero  ' }).name).toBe('Hero');
    expect(createGroup({ id: 'g', name: '   ' }).name).toBe('Group');
  });

  it('clamp opacity to [0,1] and corner radius to half the shorter side (DOC-11)', () => {
    expect(createRectangle({ id: 'r', size: { w: 10, h: 10 }, opacity: 2 }).opacity).toBe(1);
    expect(createRectangle({ id: 'r', size: { w: 10, h: 10 }, opacity: -1 }).opacity).toBe(0);
    expect(
      createRectangle({ id: 'r', size: { w: 100, h: 40 }, cornerRadius: 80 }).cornerRadius,
    ).toBe(20);
  });

  it('build each node type with type-specific fields', () => {
    expect(createFrame({ id: 'f', size: { w: 390, h: 844 } }).clipsContent).toBe(true);
    expect(createEllipse({ id: 'e', size: { w: 10, h: 10 }, fill: '#FFF' }).fill).toBe('#FFF');
    const line = createLine({ id: 'l', a: { x: 0, y: 0 }, b: { x: 5, y: 5 } });
    expect(line.b).toEqual({ x: 5, y: 5 });
    expect(createText({ id: 't', content: 'Hi' }).content).toBe('Hi');
    expect(createText({ id: 't', content: 'Hi' }).size).toBeNull();
    expect(createImage({ id: 'i', size: { w: 1, h: 1 }, assetRef: 'asset-1' }).fit).toBe('fill');
  });
});

describe('immutable update helpers', () => {
  it('return new nodes without mutating the input and preserve the concrete type', () => {
    const r = createRectangle({ id: 'r', size: { w: 10, h: 10 }, fill: '#123' });
    const moved = withTransform(r, new Transform(new Vector2(5, 5), 0, Vector2.ONE));
    expect(moved).not.toBe(r);
    expect(r.transform.equals(Transform.IDENTITY)).toBe(true); // original unchanged
    expect(moved.transform.position.equals(new Vector2(5, 5))).toBe(true);
    expect(moved.fill).toBe('#123'); // type-specific field preserved
    expect(moved.type).toBe('rectangle');
  });

  it('withName ignores empty/whitespace and trims otherwise', () => {
    const r = createRectangle({ id: 'r', size: { w: 10, h: 10 } });
    expect(withName(r, '   ')).toBe(r); // unchanged
    expect(withName(r, '  Card ').name).toBe('Card');
  });

  it('toggle visibility/locked and clamp opacity', () => {
    const r = createRectangle({ id: 'r', size: { w: 10, h: 10 } });
    expect(withVisibility(r, false).visibility).toBe(false);
    expect(withLocked(r, true).locked).toBe(true);
    expect(withOpacity(r, 5).opacity).toBe(1);
    expect(withMetadata(r, { altText: 'a card' }).metadata).toEqual({ altText: 'a card' });
    expect(r.metadata).toEqual({}); // original unchanged
  });
});
