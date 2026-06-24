import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { EditorShell } from '@vectorforge/ui';
import { renderWithEngine } from './test-utils';

describe('<EditorShell />', () => {
  it('composes the chrome and makes it inert while the command palette is open (UI-6)', () => {
    renderWithEngine(<EditorShell />);
    const toolbar = screen.getByRole('toolbar', { name: /tools/i });
    expect(toolbar.closest('[inert]')).toBeNull(); // not inert initially

    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(screen.getByRole('dialog', { name: /command palette/i })).toBeInTheDocument();
    // The chrome wrapper holding the toolbar is now inert (background not interactable).
    expect(toolbar.closest('[inert]')).not.toBeNull();
  });
});
