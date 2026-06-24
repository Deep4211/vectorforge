import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { useController, useGlobalKeyboard } from '@vectorforge/ui';
import { makeTestEngine, renderWithEngine } from './test-utils';

function KeyboardHarness() {
  const controller = useController();
  useGlobalKeyboard(controller);
  return <input aria-label="field" />;
}

describe('useGlobalKeyboard', () => {
  it('forwards window shortcuts to the controller', () => {
    const engine = makeTestEngine();
    renderWithEngine(<KeyboardHarness />, engine);
    fireEvent.keyDown(window, { key: 'r' });
    expect(engine.controller.state.tool).toBe('rectangle');
  });

  it('suppresses single-key shortcuts while a text input is focused (EDT-8)', () => {
    const engine = makeTestEngine();
    renderWithEngine(<KeyboardHarness />, engine);
    screen.getByLabelText('field').focus();
    fireEvent.keyDown(window, { key: 'o' });
    expect(engine.controller.state.tool).toBe('move'); // suppressed, stays default
  });
});
