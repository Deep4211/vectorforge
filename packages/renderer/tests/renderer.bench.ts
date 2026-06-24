import { bench, describe } from 'vitest';
import { Transform, Vector2, type Viewport } from '@vectorforge/geometry';
import { createRectangle, SceneGraph } from '@vectorforge/document';
import { projectScene } from '@vectorforge/renderer';

/** A 10k-node document laid out on a 100×100 grid (PRD §11.1 scale target). */
function bigScene(count: number): SceneGraph {
  const g = SceneGraph.empty();
  const side = Math.ceil(Math.sqrt(count));
  for (let i = 0; i < count; i += 1) {
    const x = (i % side) * 60;
    const y = Math.floor(i / side) * 60;
    g.add(
      createRectangle({
        id: `n${i}`,
        size: { w: 40, h: 40 },
        transform: new Transform(new Vector2(x, y), 0, Vector2.ONE),
        fill: '#7C5CFF',
      }),
    );
  }
  return g;
}

const scene = bigScene(10_000);
const view = { width: 1280, height: 800 };
const topLeft: Viewport = { panX: 0, panY: 0, zoom: 1 };

describe('projectScene @ 10k nodes', () => {
  bench('cull to a ~50-node viewport', () => {
    projectScene(scene, topLeft, view);
  });

  bench('project the whole document (zoomed far out)', () => {
    projectScene(scene, { panX: 0, panY: 0, zoom: 0.05 }, view);
  });
});
