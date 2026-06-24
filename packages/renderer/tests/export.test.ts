import { describe, expect, it } from 'vitest';
import { Transform, Vector2, type Viewport } from '@vectorforge/geometry';
import { createEllipse, createRectangle, createText, SceneGraph } from '@vectorforge/document';
import { documentBounds, projectScene, sceneToSvg } from '@vectorforge/renderer';

const VIEW = { width: 1000, height: 1000 };
const VIEWPORT: Viewport = { panX: 0, panY: 0, zoom: 1 };

function project(g: SceneGraph) {
  return projectScene(g, VIEWPORT, VIEW, { cullMargin: 10000 });
}

describe('documentBounds', () => {
  it('encloses every paintable item', () => {
    const g = SceneGraph.empty();
    g.add(createRectangle({ id: 'r', size: { w: 40, h: 40 } }));
    g.add(
      createEllipse({
        id: 'e',
        size: { w: 20, h: 20 },
        transform: new Transform(new Vector2(100, 60), 0, Vector2.ONE),
      }),
    );
    const bounds = documentBounds(project(g))!;
    expect([bounds.minX, bounds.minY, bounds.maxX, bounds.maxY]).toEqual([0, 0, 120, 80]);
  });

  it('is null for an empty scene', () => {
    expect(documentBounds(project(SceneGraph.empty()))).toBeNull();
  });
});

describe('sceneToSvg', () => {
  it('emits a framed SVG with one element per paintable node', () => {
    const g = SceneGraph.empty();
    g.add(createRectangle({ id: 'r', size: { w: 40, h: 30 }, fill: '#7C5CFF' }));
    const svg = sceneToSvg(project(g));
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox="0 0 40 30"');
    expect(svg).toContain('<rect');
    expect(svg).toContain('fill="#7C5CFF"');
    expect(svg).toContain('width="40"');
  });

  it('escapes text content (no XSS / no broken XML)', () => {
    const g = SceneGraph.empty();
    g.add(createText({ id: 't', content: '<b> & "x"', size: { w: 100, h: 24 } }));
    const svg = sceneToSvg(project(g));
    expect(svg).toContain('&lt;b&gt; &amp; &quot;x&quot;');
    expect(svg).not.toContain('<b>');
  });

  it('paints a background rect when requested, else stays transparent', () => {
    const g = SceneGraph.empty();
    g.add(createRectangle({ id: 'r', size: { w: 10, h: 10 } }));
    expect(sceneToSvg(project(g), { background: '#0B0B0E' })).toContain('fill="#0B0B0E"');
    expect(sceneToSvg(project(g)).match(/<rect/g)?.length).toBe(1); // only the node, no bg
  });

  it('carries effective opacity onto the element', () => {
    const g = SceneGraph.empty();
    g.add(createRectangle({ id: 'r', size: { w: 10, h: 10 } }));
    g.update('r', (n) => ({ ...n, opacity: 0.5 }));
    expect(sceneToSvg(project(g))).toContain('opacity="0.5"');
  });
});
