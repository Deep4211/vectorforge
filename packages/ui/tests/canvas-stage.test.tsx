import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { CanvasStage } from '@vectorforge/ui';
import { makeTestEngine, renderWithEngine } from './test-utils';

describe('<CanvasStage /> — input forwarding', () => {
  it('forwards normalized pointer input into the active tool gesture', () => {
    const engine = makeTestEngine();
    engine.controller.setTool('rectangle');
    renderWithEngine(<CanvasStage />, engine);

    const canvas = screen.getByLabelText('Design canvas');
    fireEvent.pointerDown(canvas, {
      clientX: 10,
      clientY: 10,
      button: 0,
      pointerType: 'mouse',
      pointerId: 1,
    });
    fireEvent.pointerMove(canvas, {
      clientX: 40,
      clientY: 30,
      button: 0,
      pointerType: 'mouse',
      pointerId: 1,
    });
    fireEvent.pointerUp(canvas, {
      clientX: 40,
      clientY: 30,
      button: 0,
      pointerType: 'mouse',
      pointerId: 1,
    });

    // A 30×20 rectangle was drawn (identity viewport ⇒ world == client coords).
    expect(engine.controller.scene.size).toBe(1);
  });

  it('routes pointercancel to the controller without committing', () => {
    const engine = makeTestEngine();
    engine.controller.setTool('rectangle');
    renderWithEngine(<CanvasStage />, engine);
    const canvas = screen.getByLabelText('Design canvas');
    fireEvent.pointerDown(canvas, {
      clientX: 10,
      clientY: 10,
      button: 0,
      pointerType: 'mouse',
      pointerId: 1,
    });
    fireEvent.pointerMove(canvas, {
      clientX: 40,
      clientY: 30,
      button: 0,
      pointerType: 'mouse',
      pointerId: 1,
    });
    fireEvent.pointerCancel(canvas, { pointerId: 1 });
    fireEvent.pointerUp(canvas, {
      clientX: 40,
      clientY: 30,
      button: 0,
      pointerType: 'mouse',
      pointerId: 1,
    });
    expect(engine.controller.scene.size).toBe(0); // gesture aborted
    expect(engine.controller.state.interaction).toBe('idle');
  });
});
