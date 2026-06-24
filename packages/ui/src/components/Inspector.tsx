import { useMemo } from 'react';
import { Vector2, type Inspection, type NodeId } from '@vectorforge/editor';
import { useController } from '../context';
import { useDocumentVersion, useEditorSelector } from '../hooks/use-editor-selector';

interface NumberFieldProps {
  readonly label: string;
  readonly value: number;
  readonly onCommit: (value: number) => void;
}

/** Uncontrolled numeric field: edits commit on blur/Enter (one history entry), not per keystroke. */
function NumberField({ label, value, onCommit }: NumberFieldProps) {
  const commit = (raw: string): void => {
    const next = Number.parseFloat(raw);
    if (Number.isFinite(next) && next !== value) onCommit(next);
  };
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="w-6 text-[#5C5C6A]">{label}</span>
      <input
        type="number"
        // Remount when the model value changes (e.g. via a drag) to reflect it.
        key={value}
        defaultValue={value}
        aria-label={label}
        onBlur={(e) => commit(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit(e.currentTarget.value);
        }}
        className="w-full rounded bg-[#0B0B0E] px-2 py-1 text-[#ECECF1] outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFF]"
      />
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-[#1E1E27] px-3 py-3">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#5C5C6A]">{title}</h3>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </section>
  );
}

interface SingleProps {
  readonly model: Extract<Inspection, { mode: 'single' }>;
}

function SingleInspector({ model }: SingleProps) {
  const controller = useController();
  const id: NodeId = model.id;

  return (
    <div>
      <Section title="Position">
        <NumberField
          label="X"
          value={model.x}
          onCommit={(x) => controller.moveSelectionBy(new Vector2(x - model.x, 0))}
        />
        <NumberField
          label="Y"
          value={model.y}
          onCommit={(y) => controller.moveSelectionBy(new Vector2(0, y - model.y))}
        />
      </Section>
      {model.width !== null && model.height !== null && (
        <Section title="Size">
          <NumberField
            label="W"
            value={model.width}
            onCommit={(w) => controller.setProperty(id, 'size', { w, h: model.height })}
          />
          <NumberField
            label="H"
            value={model.height}
            onCommit={(h) => controller.setProperty(id, 'size', { w: model.width, h })}
          />
        </Section>
      )}
      <Section title="Appearance">
        <NumberField
          label="%"
          value={Math.round(model.opacity * 100)}
          onCommit={(pct) =>
            controller.setProperty(id, 'opacity', Math.min(1, Math.max(0, pct / 100)))
          }
        />
        {model.fill !== null && (
          <label className="flex items-center gap-2 text-sm">
            <span
              aria-hidden="true"
              className="h-4 w-4 rounded border border-[#26262F]"
              style={{ backgroundColor: model.fill }}
            />
            <input
              type="text"
              key={model.fill}
              defaultValue={model.fill}
              aria-label="Fill"
              onBlur={(e) => controller.setFill(id, e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') controller.setFill(id, e.currentTarget.value);
              }}
              className="w-full rounded bg-[#0B0B0E] px-2 py-1 font-mono text-[#ECECF1] outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFF]"
            />
          </label>
        )}
      </Section>
    </div>
  );
}

/** Right inspector — empty / single / multi modes (UI-3: never re-renders on a pan). */
export function Inspector() {
  const controller = useController();
  const version = useDocumentVersion();
  const selection = useEditorSelector((state) => state.selection);
  const model = useMemo(
    () => controller.inspection(),
    // Re-derive on a selection change or any document edit.
    [controller, version, selection],
  );

  return (
    <aside aria-label="Inspector" className="flex h-full w-64 flex-col overflow-auto bg-[#101015]">
      <h2 className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#5C5C6A]">
        Inspector
      </h2>
      {model.mode === 'empty' && (
        <p className="px-3 text-sm text-[#5C5C6A]">Select a layer to see its properties.</p>
      )}
      {model.mode === 'multi' && (
        <p className="px-3 text-sm text-[#9A9AA6]">{model.count} layers selected</p>
      )}
      {model.mode === 'single' && <SingleInspector model={model} />}
    </aside>
  );
}
