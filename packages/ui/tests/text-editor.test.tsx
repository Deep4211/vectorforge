import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { Vector2 } from '@vectorforge/editor';
import { TextEditorOverlay } from '@vectorforge/ui';
import { makeTestEngine, renderWithEngine } from './test-utils';

describe('<TextEditorOverlay />', () => {
  it('is absent when no text node is being edited', () => {
    renderWithEngine(<TextEditorOverlay />);
    expect(screen.queryByLabelText('Edit text')).toBeNull();
  });

  it('shows a focused editor for the edited node and commits typed content on blur', () => {
    const engine = makeTestEngine();
    const id = engine.controller.createText(new Vector2(0, 0));
    engine.controller.beginTextEdit(id);
    renderWithEngine(<TextEditorOverlay />, engine);

    const field = screen.getByLabelText('Edit text') as HTMLTextAreaElement;
    expect(field).toHaveFocus();

    fireEvent.change(field, { target: { value: 'Pricing' } });
    fireEvent.blur(field);

    expect((engine.controller.scene.getOrThrow(id) as { content: string }).content).toBe('Pricing');
    expect(engine.controller.state.editingTextId).toBeNull();
  });

  it('commits and closes on Escape', () => {
    const engine = makeTestEngine();
    const id = engine.controller.createText(new Vector2(0, 0));
    engine.controller.beginTextEdit(id);
    renderWithEngine(<TextEditorOverlay />, engine);

    const field = screen.getByLabelText('Edit text');
    fireEvent.change(field, { target: { value: 'Done' } });
    fireEvent.keyDown(field, { key: 'Escape' });
    expect((engine.controller.scene.getOrThrow(id) as { content: string }).content).toBe('Done');
    expect(engine.controller.state.editingTextId).toBeNull();
  });
});
