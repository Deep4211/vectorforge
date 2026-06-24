import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { Rectangle } from '@vectorforge/editor';
import { LayersPanel } from '@vectorforge/ui';
import { makeTestEngine, renderWithEngine } from './test-utils';

// The treeitem element is itself the focusable, selectable row (WAI-ARIA tree).
function rowOf(treeitem: HTMLElement): HTMLElement {
  return treeitem;
}

describe('<LayersPanel /> — accessibility', () => {
  it('renders an accessible tree with one treeitem per top-level node', () => {
    const engine = makeTestEngine();
    engine.controller.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    engine.controller.createShape('ellipse', new Rectangle(0, 0, 10, 10));
    renderWithEngine(<LayersPanel />, engine);

    expect(screen.getByRole('tree', { name: /layer tree/i })).toBeInTheDocument();
    expect(screen.getAllByRole('treeitem')).toHaveLength(2);
  });

  it('represents nesting via an expandable group with aria-level', () => {
    const engine = makeTestEngine();
    const a = engine.controller.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    const b = engine.controller.createShape('rectangle', new Rectangle(20, 0, 10, 10));
    engine.controller.selectMany([a, b]);
    engine.controller.group();
    renderWithEngine(<LayersPanel />, engine);

    const items = screen.getAllByRole('treeitem');
    expect(items).toHaveLength(3); // group + 2 children
    const group = items.find((i) => i.getAttribute('aria-expanded') === 'true')!;
    expect(group).toHaveAttribute('aria-level', '1');
    // The children sit one level deeper.
    expect(items.filter((i) => i.getAttribute('aria-level') === '2')).toHaveLength(2);
  });

  it('selects a layer when its row is activated, reflecting aria-selected', () => {
    const engine = makeTestEngine();
    const id = engine.controller.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    engine.controller.clearSelection();
    renderWithEngine(<LayersPanel />, engine);

    const item = screen.getByRole('treeitem');
    expect(item).toHaveAttribute('aria-selected', 'false');
    fireEvent.click(rowOf(item));
    expect(engine.controller.state.selection.ids).toEqual([id]);
    expect(screen.getByRole('treeitem')).toHaveAttribute('aria-selected', 'true');
  });
});
