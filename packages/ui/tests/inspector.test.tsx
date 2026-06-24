import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { Rectangle } from '@vectorforge/editor';
import { Inspector } from '@vectorforge/ui';
import { makeTestEngine, renderWithEngine } from './test-utils';

describe('<Inspector /> — modes', () => {
  it('shows the empty state with no selection', () => {
    renderWithEngine(<Inspector />);
    expect(screen.getByText(/select a layer/i)).toBeInTheDocument();
  });

  it('shows single-node fields and commits an edit through the controller', () => {
    const engine = makeTestEngine();
    const id = engine.controller.createShape('rectangle', new Rectangle(10, 20, 30, 40));
    renderWithEngine(<Inspector />, engine);

    const width = screen.getByLabelText('W') as HTMLInputElement;
    expect(width.value).toBe('30');

    fireEvent.change(width, { target: { value: '120' } });
    fireEvent.blur(width);

    const node = engine.controller.scene.getOrThrow(id) as { size: { w: number; h: number } };
    expect(node.size.w).toBe(120);
  });

  it('edits a frame fill via its backgroundColor field without throwing', () => {
    const engine = makeTestEngine();
    const id = engine.controller.createShape('frame', new Rectangle(0, 0, 100, 80));
    renderWithEngine(<Inspector />, engine);

    const fill = screen.getByLabelText('Fill') as HTMLInputElement;
    expect(() => {
      fireEvent.change(fill, { target: { value: '#123456' } });
      fireEvent.blur(fill);
    }).not.toThrow();

    const node = engine.controller.scene.getOrThrow(id) as { backgroundColor: string };
    expect(node.backgroundColor).toBe('#123456');
  });

  it('shows a multi-selection summary', () => {
    const engine = makeTestEngine();
    const a = engine.controller.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    const b = engine.controller.createShape('rectangle', new Rectangle(20, 0, 10, 10));
    engine.controller.selectMany([a, b]);
    renderWithEngine(<Inspector />, engine);
    expect(screen.getByText(/2 layers selected/i)).toBeInTheDocument();
  });
});
