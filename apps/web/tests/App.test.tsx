import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../src/App';

describe('<App />', () => {
  it('renders the VectorForge boot screen', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: /vectorforge/i })).toBeTruthy();
  });

  it('lists every workspace package (proves the dependency graph resolves)', () => {
    render(<App />);
    expect(screen.getByText('@vectorforge/editor')).toBeTruthy();
    expect(screen.getByText('@vectorforge/renderer')).toBeTruthy();
    expect(screen.getByText('@vectorforge/ui')).toBeTruthy();
  });
});
