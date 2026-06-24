import { Transform, Vector2 } from '@vectorforge/geometry';
import {
  createEllipse,
  createFrame,
  createRectangle,
  createSequentialIdGenerator,
  createText,
  SceneGraph,
} from '@vectorforge/document';

/**
 * A small starter document so the canvas shows something on first load. Pure
 * composition-root data — the editor/renderer never depend on it.
 */
export function buildSampleDocument(): SceneGraph {
  const scene = SceneGraph.empty();
  const ids = createSequentialIdGenerator();

  const frame = createFrame({
    id: ids.next(),
    name: 'Frame 1',
    size: { w: 480, h: 320 },
    transform: new Transform(new Vector2(80, 80), 0, Vector2.ONE),
    backgroundColor: '#16161D',
  });
  scene.add(frame);

  scene.add(
    createRectangle({
      id: ids.next(),
      name: 'Card',
      size: { w: 200, h: 120 },
      transform: new Transform(new Vector2(40, 40), 0, Vector2.ONE),
      fill: '#7C5CFF',
      cornerRadius: 12,
    }),
    frame.id,
  );

  scene.add(
    createEllipse({
      id: ids.next(),
      name: 'Dot',
      size: { w: 64, h: 64 },
      transform: new Transform(new Vector2(320, 60), 0, Vector2.ONE),
      fill: '#3FCF8E',
    }),
    frame.id,
  );

  scene.add(
    createText({
      id: ids.next(),
      name: 'Title',
      content: 'VectorForge',
      transform: new Transform(new Vector2(40, 200), 0, Vector2.ONE),
      fill: '#ECECF1',
      fontSize: 28,
      fontWeight: 700,
    }),
    frame.id,
  );

  return scene;
}
