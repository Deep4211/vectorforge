import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { setTheme, Toolbar } from '@vectorforge/ui';
import { renderWithEngine } from './test-utils';

describe('<Toolbar />', () => {
  beforeEach(() => {
    setTheme('dark'); // deterministic starting theme for the singleton store
    delete document.documentElement.dataset.theme;
  });

  it('exposes a toolbar with a pressed state on the active tool', () => {
    const { engine } = renderWithEngine(<Toolbar />);
    const toolbar = screen.getByRole('toolbar', { name: /tools/i });
    expect(toolbar).toBeInTheDocument();
    // Move is the default active tool.
    expect(screen.getByRole('button', { name: /move/i })).toHaveAttribute('aria-pressed', 'true');
    expect(engine.controller.state.tool).toBe('move');
  });

  it('switches the tool when a button is clicked (dispatches an intention)', () => {
    const { engine } = renderWithEngine(<Toolbar />);
    fireEvent.click(screen.getByRole('button', { name: /rectangle/i }));
    expect(engine.controller.state.tool).toBe('rectangle');
    expect(screen.getByRole('button', { name: /rectangle/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /move/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles the theme (flips data-theme and aria-pressed)', () => {
    renderWithEngine(<Toolbar />);
    const toggle = screen.getByRole('button', { name: /toggle theme/i });
    expect(toggle).toHaveAttribute('aria-pressed', 'false'); // dark active → light not pressed

    fireEvent.click(toggle);
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(screen.getByRole('button', { name: /toggle theme/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
