import { describe, expect, it } from 'vitest';
import { Rectangle } from '@vectorforge/geometry';
import { createSequentialIdGenerator } from '@vectorforge/document';
import { EditorController } from '@vectorforge/editor';

function controller() {
  return new EditorController({ idGenerator: createSequentialIdGenerator() });
}

describe('EditorController.outline — layer view model', () => {
  it('projects the scene into a nested tree (front-to-back) with names and flags', () => {
    const c = controller();
    const a = c.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    const b = c.createShape('ellipse', new Rectangle(0, 0, 10, 10));
    c.selectMany([a, b]);
    const g = c.group();

    const outline = c.outline();
    expect(outline.map((i) => i.id)).toEqual([g]);
    expect(outline[0]!.type).toBe('group');
    expect(outline[0]!.children.map((i) => i.id)).toEqual([a, b]);
    expect(outline[0]!.children.map((i) => i.type)).toEqual(['rectangle', 'ellipse']);
    expect(outline[0]!.children[0]!.visible).toBe(true);
  });
});

describe('EditorController.inspection — inspector view model', () => {
  it('is empty with no selection', () => {
    expect(controller().inspection()).toEqual({ mode: 'empty' });
  });

  it('describes a single selected node', () => {
    const c = controller();
    const id = c.createShape('rectangle', new Rectangle(10, 20, 30, 40));
    const model = c.inspection();
    expect(model.mode).toBe('single');
    if (model.mode !== 'single') throw new Error('expected single');
    expect([model.x, model.y, model.width, model.height]).toEqual([10, 20, 30, 40]);
    expect(model.id).toBe(id);
    expect(model.type).toBe('rectangle');
    expect(model.opacity).toBe(1);
  });

  it('reports a multi-selection count', () => {
    const c = controller();
    const a = c.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    const b = c.createShape('rectangle', new Rectangle(20, 0, 10, 10));
    c.selectMany([a, b]);
    const model = c.inspection();
    expect(model.mode).toBe('multi');
    if (model.mode !== 'multi') throw new Error('expected multi');
    expect(model.count).toBe(2);
    expect(model.ids).toEqual([a, b]);
  });
});
