import { describe, expect, it } from 'vitest';
import { BoundingBox, Matrix3 } from '@vectorforge/geometry';
import { CanvasRenderer, type RenderItem, type RenderScene } from '@vectorforge/renderer';
import { RecordingCanvas, RecordingContext } from './recording-context';

function rectItem(overrides: Partial<RenderItem> = {}): RenderItem {
  return {
    id: 'r',
    kind: 'rectangle',
    size: { w: 20, h: 10 },
    fill: '#7C5CFF',
    cornerRadius: 0,
    worldMatrix: Matrix3.translation(10, 20),
    opacity: 1,
    worldBounds: null,
    ...overrides,
  } as RenderItem;
}

function sceneOf(...items: RenderItem[]): RenderScene {
  return { items, totalCount: items.length };
}

function setup(dpr = 1, showGrid = false) {
  const canvas = new RecordingCanvas();
  const renderer = new CanvasRenderer({ showGrid });
  renderer.attach(canvas);
  renderer.resize(200, 100, dpr);
  return { canvas, ctx: canvas.context, renderer };
}

describe('CanvasRenderer — attach & sizing (RND-8)', () => {
  it('throws when no 2D context is available', () => {
    const broken = { width: 0, height: 0, getContext: () => null };
    expect(() => new CanvasRenderer().attach(broken)).toThrow(/2D context/);
  });

  it('sizes the backing store to css × devicePixelRatio', () => {
    const { canvas } = setup(2);
    expect(canvas.width).toBe(400);
    expect(canvas.height).toBe(200);
  });
});

describe('CanvasRenderer — renderFrame', () => {
  it('clears the whole backing store on a full repaint', () => {
    const { ctx, renderer } = setup(2);
    renderer.renderFrame(sceneOf(), { kind: 'full' });
    const clear = ctx.opsOf('clearRect')[0]!;
    expect(clear.args).toEqual([0, 0, 400, 200]); // device pixels
  });

  it('applies a single view transform (scale·dpr) composed with each world matrix (RND-3/8)', () => {
    const { ctx, renderer } = setup(2);
    renderer.renderFrame(sceneOf(rectItem()), { kind: 'full' });
    // setTransform[0] is the identity used for clearing; [1] is the item transform.
    const itemTransform = ctx.opsOf('setTransform')[1]!;
    expect(itemTransform.args).toEqual([2, 0, 0, 2, 20, 40]); // dpr=2, world (10,20) → device (20,40)
  });

  it('sets effective opacity as globalAlpha for the item', () => {
    const { ctx, renderer } = setup(1);
    renderer.renderFrame(sceneOf(rectItem({ opacity: 0.5 })), { kind: 'full' });
    const fill = ctx.opsOf('fillRect').at(-1)!;
    expect(fill.args[5]).toBe(0.5); // globalAlpha recorded with the fill
  });

  it('clips to the dirty box on a partial repaint (§7.3)', () => {
    const { ctx, renderer } = setup(1);
    const box = new BoundingBox(10, 10, 30, 30);
    renderer.renderFrame(sceneOf(rectItem()), { kind: 'rect', box });
    expect(ctx.opsOf('clearRect')[0]!.args).toEqual([10, 10, 20, 20]);
    expect(ctx.opsOf('clip')).toHaveLength(1);
  });

  it('maps the dirty box to device pixels under dpr (RND-8 + §7.3)', () => {
    const { ctx, renderer } = setup(2); // dpr=2, identity viewport
    renderer.renderFrame(sceneOf(), { kind: 'rect', box: new BoundingBox(10, 10, 30, 30) });
    // corners (10,10)/(30,30) × dpr 2 → device AABB (20,20)..(60,60).
    expect(ctx.opsOf('clearRect')[0]!.args).toEqual([20, 20, 40, 40]);
    expect(ctx.opsOf('rect')[0]!.args).toEqual([20, 20, 40, 40]);
  });

  it('maps the dirty box through pan and zoom', () => {
    const canvas = new RecordingCanvas();
    const renderer = new CanvasRenderer({ showGrid: false });
    renderer.attach(canvas);
    renderer.resize(200, 100, 1);
    renderer.setViewport({ panX: 100, panY: 50, zoom: 2 });
    renderer.renderFrame(sceneOf(), { kind: 'rect', box: new BoundingBox(10, 10, 30, 30) });
    // world (10,10) → screen (10*2+100, 10*2+50) = (120,70); (30,30) → (160,110).
    expect(canvas.context.opsOf('clearRect')[0]!.args).toEqual([120, 70, 40, 40]);
  });

  it('clears the updated backing store after a second resize (RND-8)', () => {
    const canvas = new RecordingCanvas();
    const renderer = new CanvasRenderer({ showGrid: false });
    renderer.attach(canvas);
    renderer.resize(200, 100, 2); // 400×200
    renderer.resize(300, 200, 1.5); // 450×300
    expect([canvas.width, canvas.height]).toEqual([450, 300]);
    renderer.renderFrame(sceneOf(), { kind: 'full' });
    expect(canvas.context.opsOf('clearRect')[0]!.args).toEqual([0, 0, 450, 300]);
  });

  it('does not clip frame content in V1 (clipsContent is carried but deferred)', () => {
    const { ctx, renderer } = setup(1); // showGrid false
    const frame: RenderItem = {
      id: 'f',
      kind: 'frame',
      size: { w: 100, h: 80 },
      backgroundColor: '#fff',
      clipsContent: true,
      worldMatrix: Matrix3.IDENTITY,
      opacity: 1,
      worldBounds: null,
    };
    renderer.renderFrame(sceneOf(frame), { kind: 'full' });
    expect(ctx.opsOf('clip')).toHaveLength(0); // no clip on a full repaint, even with clipsContent
  });

  it('is deterministic: identical scene + viewport ⇒ identical call sequence (RND-9)', () => {
    const make = () => {
      const { ctx, renderer } = setup(2, true);
      renderer.renderFrame(
        sceneOf(rectItem(), rectItem({ id: 'r2', worldMatrix: Matrix3.translation(5, 5) })),
        {
          kind: 'full',
        },
      );
      return ctx.calls;
    };
    expect(JSON.stringify(make())).toEqual(JSON.stringify(make()));
  });

  it('draws the dot-grid only when enabled', () => {
    const withGrid = setup(1, true);
    withGrid.renderer.renderFrame(sceneOf(), { kind: 'full' });
    const withoutGrid = setup(1, false);
    withoutGrid.renderer.renderFrame(sceneOf(), { kind: 'full' });
    expect(withGrid.ctx.opsOf('fillRect').length).toBeGreaterThan(0);
    expect(withoutGrid.ctx.opsOf('fillRect').length).toBe(0);
  });

  it('reports its backend capabilities and no-ops after dispose', () => {
    const { ctx, renderer } = setup(1);
    expect(renderer.capabilities().backend).toBe('canvas-2d');
    renderer.dispose();
    const before = ctx.calls.length;
    expect(() => renderer.renderFrame(sceneOf(rectItem()), { kind: 'full' })).not.toThrow();
    expect(ctx.calls.length).toBe(before); // nothing drawn after dispose
  });
});

describe('CanvasRenderer — setViewport', () => {
  it('pans the composed item transform', () => {
    const canvas = new RecordingCanvas();
    const renderer = new CanvasRenderer({ showGrid: false });
    renderer.attach(canvas);
    renderer.resize(200, 100, 1);
    renderer.setViewport({ panX: 100, panY: 50, zoom: 1 });
    renderer.renderFrame(sceneOf(rectItem()), { kind: 'full' });
    const itemTransform = canvas.context.opsOf('setTransform')[1]!;
    expect(itemTransform.args).toEqual([1, 0, 0, 1, 110, 70]); // pan(100,50) + world(10,20)
  });
});

// Keep a direct RecordingContext reference exercised for clarity in failures.
describe('RecordingContext helper', () => {
  it('captures op sequences', () => {
    const ctx = new RecordingContext();
    ctx.save();
    ctx.restore();
    expect(ctx.sequence()).toEqual(['save', 'restore']);
  });
});
