import { describe, expect, it } from 'vitest';
import { act, render } from '@testing-library/react';
import { Rectangle, Vector2 } from '@vectorforge/editor';
import { EditorProvider, useEditorSelector } from '@vectorforge/ui';
import { makeTestEngine } from './test-utils';

describe('useEditorSelector — fine-grained subscriptions (UI-3)', () => {
  it('does not re-render a selection consumer on a pan, but does on a selection change', () => {
    const engine = makeTestEngine();
    let renders = 0;

    function SelectionProbe() {
      renders += 1;
      const ids = useEditorSelector((s) => s.selection.ids);
      return <span data-testid="count">{ids.length}</span>;
    }

    render(
      <EditorProvider engine={engine}>
        <SelectionProbe />
      </EditorProvider>,
    );
    expect(renders).toBe(1);

    // A pan changes the viewport slice only — the selection consumer must not re-render.
    act(() => engine.controller.panBy(new Vector2(40, 0)));
    expect(renders).toBe(1);

    // Creating a shape changes the selection — now it re-renders.
    act(() => {
      engine.controller.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    });
    expect(renders).toBe(2);
  });

  it('re-renders a viewport consumer on a pan while a selection consumer stays flat', () => {
    const engine = makeTestEngine();
    let selRenders = 0;
    let vpRenders = 0;

    function SelectionProbe() {
      selRenders += 1;
      useEditorSelector((s) => s.selection.ids);
      return null;
    }
    function ViewportProbe() {
      vpRenders += 1;
      useEditorSelector((s) => s.viewport);
      return null;
    }

    render(
      <EditorProvider engine={engine}>
        <SelectionProbe />
        <ViewportProbe />
      </EditorProvider>,
    );
    expect([selRenders, vpRenders]).toEqual([1, 1]);

    act(() => engine.controller.panBy(new Vector2(40, 0)));
    expect([selRenders, vpRenders]).toEqual([1, 2]); // viewport changed, selection did not
  });

  it('does not re-render a selection consumer on a no-op-selection document edit', () => {
    const engine = makeTestEngine();
    const id = engine.controller.createShape('rectangle', new Rectangle(0, 0, 10, 10));
    let renders = 0;

    function SelectionProbe() {
      renders += 1;
      useEditorSelector((s) => s.selection.ids);
      return null;
    }

    render(
      <EditorProvider engine={engine}>
        <SelectionProbe />
      </EditorProvider>,
    );
    expect(renders).toBe(1);

    // Editing the already-selected node leaves the selection content unchanged;
    // the slice keeps its identity, so the consumer must not re-render (UI-3).
    act(() => engine.controller.setProperty(id, 'fill', '#222222'));
    expect(renders).toBe(1);
  });
});
