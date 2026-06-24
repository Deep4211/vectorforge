import { useEffect, useState } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { CommandPalette } from '@vectorforge/ui';
import { makeTestEngine, renderWithEngine } from './test-utils';

/** Mirrors the shell wiring: Cmd/Ctrl+K opens; the dialog closes itself. */
function PaletteHarness() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <>
      <button type="button">trigger</button>
      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function openPalette(): HTMLElement {
  fireEvent.keyDown(window, { key: 'k', metaKey: true });
  return screen.getByRole('dialog', { name: /command palette/i });
}

describe('<CommandPalette /> — modal + focus trap', () => {
  it('opens on Cmd+K, focuses the search field, and is a modal dialog', () => {
    renderWithEngine(<PaletteHarness />);
    expect(screen.queryByRole('dialog')).toBeNull();
    const dialog = openPalette();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('combobox', { name: /search commands/i })).toHaveFocus();
  });

  it('traps Tab focus within the dialog', () => {
    renderWithEngine(<PaletteHarness />);
    const dialog = openPalette();
    const focusable = dialog.querySelectorAll<HTMLElement>('button, input');
    focusable[focusable.length - 1]!.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(screen.getByRole('combobox', { name: /search commands/i })).toHaveFocus();
  });

  it('filters and runs a command, then closes', () => {
    const engine = makeTestEngine();
    renderWithEngine(<PaletteHarness />, engine);
    const dialog = openPalette();
    fireEvent.change(screen.getByRole('combobox', { name: /search commands/i }), {
      target: { value: 'rectangle tool' },
    });
    fireEvent.keyDown(dialog, { key: 'Enter' });
    expect(engine.controller.state.tool).toBe('rectangle');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes on Escape and restores focus to the previously focused element (UI-6)', () => {
    renderWithEngine(<PaletteHarness />);
    const trigger = screen.getByRole('button', { name: 'trigger' });
    trigger.focus();
    expect(trigger).toHaveFocus();
    const dialog = openPalette();
    expect(screen.getByRole('combobox', { name: /search commands/i })).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
  });
});
