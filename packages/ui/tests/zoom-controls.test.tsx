import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { ZoomControls } from '@vectorforge/ui';
import { makeTestEngine, renderWithEngine } from './test-utils';

describe('<ZoomControls />', () => {
  it('shows the current zoom and resets to 100%', () => {
    const engine = makeTestEngine();
    engine.controller.setViewport({ panX: 50, panY: 0, zoom: 2 });
    renderWithEngine(<ZoomControls />, engine);
    expect(screen.getByText('200%')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /reset zoom/i }));
    expect(engine.controller.state.viewport).toEqual({ panX: 0, panY: 0, zoom: 1 });
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('zooms in about the canvas center', () => {
    const engine = makeTestEngine(); // viewSize 800×600
    renderWithEngine(<ZoomControls />, engine);
    fireEvent.click(screen.getByRole('button', { name: /zoom in/i }));
    expect(engine.controller.state.viewport.zoom).toBeCloseTo(1.2, 5);
  });
});
