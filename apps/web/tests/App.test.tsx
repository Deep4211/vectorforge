import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../src/App';

describe('<App /> — editor shell', () => {
  it('mounts the composed editor chrome (toolbar, canvas, layers, inspector)', () => {
    render(<App />);
    expect(screen.getByRole('toolbar', { name: /tools/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Design canvas')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /layers/i })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: /inspector/i })).toBeInTheDocument();
  });

  it('shows the sample document in the layer tree', () => {
    render(<App />);
    // The starter document seeds a frame at the root.
    expect(screen.getByRole('tree', { name: /layer tree/i })).toBeInTheDocument();
    expect(screen.getAllByRole('treeitem').length).toBeGreaterThan(0);
  });
});
