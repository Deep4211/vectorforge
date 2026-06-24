import { useMemo } from 'react';
import { Vector2, type Inspection, type NodeId } from '@vectorforge/editor';
import { useController } from '../context';
import { useDocumentVersion, useEditorSelector } from '../hooks/use-editor-selector';

function Field({
  label,
  value,
  unit,
  readOnly,
  onCommit,
}: {
  label: string;
  value: number;
  unit?: string;
  readOnly?: boolean;
  onCommit?: (value: number) => void;
}) {
  const commit = (raw: string): void => {
    const next = Number.parseFloat(raw);
    if (onCommit && Number.isFinite(next) && next !== value) onCommit(next);
  };
  return (
    <div className="border-border bg-surface flex h-[30px] items-center gap-1.5 rounded-lg border px-2.5">
      <span className="text-faint text-[11px]">{label}</span>
      <input
        type="number"
        key={value}
        defaultValue={value}
        aria-label={label}
        readOnly={readOnly}
        onBlur={(e) => commit(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit(e.currentTarget.value);
        }}
        className="text-ink w-full bg-transparent font-mono text-xs outline-none"
      />
      {unit && <span className="text-faint text-[11px]">{unit}</span>}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-faint mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.08em]">
      {children}
    </div>
  );
}

const Divider = () => <div className="bg-border-soft my-3.5 h-px" />;

function SingleInspector({ model }: { model: Extract<Inspection, { mode: 'single' }> }) {
  const controller = useController();
  const id: NodeId = model.id;
  const hasSize = model.width !== null && model.height !== null;
  return (
    <div className="pb-4">
      <div className="px-3.5 pt-3.5">
        <SectionLabel>Position</SectionLabel>
        <div className="mb-2 grid grid-cols-2 gap-2">
          <Field
            label="X"
            value={model.x}
            onCommit={(x) => controller.moveSelectionBy(new Vector2(x - model.x, 0))}
          />
          <Field
            label="Y"
            value={model.y}
            onCommit={(y) => controller.moveSelectionBy(new Vector2(0, y - model.y))}
          />
        </div>
        {hasSize && (
          <div className="mb-2 grid grid-cols-2 gap-2">
            <Field
              label="W"
              value={model.width!}
              onCommit={(w) => controller.setProperty(id, 'size', { w, h: model.height })}
            />
            <Field
              label="H"
              value={model.height!}
              onCommit={(h) => controller.setProperty(id, 'size', { w: model.width, h })}
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Field label="∠" value={Math.round(model.rotation)} unit="°" readOnly />
          <Field
            label="%"
            value={Math.round(model.opacity * 100)}
            onCommit={(pct) =>
              controller.setProperty(id, 'opacity', Math.min(1, Math.max(0, pct / 100)))
            }
          />
        </div>
      </div>

      {model.fill !== null && (
        <>
          <Divider />
          <div className="px-3.5">
            <SectionLabel>Fill</SectionLabel>
            <div className="border-border bg-surface flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5">
              <span
                aria-hidden="true"
                className="h-[22px] w-[22px] flex-none rounded-md border border-white/15"
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
                className="text-ink flex-1 bg-transparent font-mono text-xs outline-none"
              />
            </div>
          </div>
        </>
      )}

      <Divider />
      <div className="px-3.5">
        <SectionLabel>Appearance</SectionLabel>
        <div className="flex items-center gap-2.5">
          <div className="bg-border relative h-[5px] flex-1 rounded-full">
            <div
              className="bg-brand absolute left-0 top-0 h-full rounded-full"
              style={{ width: `${Math.round(model.opacity * 100)}%` }}
            />
          </div>
          <span className="text-ink w-9 text-right font-mono text-xs">
            {Math.round(model.opacity * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}

/** Right inspector — empty / single / multi modes (UI-3: never re-renders on a pan). */
export function Inspector() {
  const controller = useController();
  const version = useDocumentVersion();
  const selection = useEditorSelector((state) => state.selection);
  const model = useMemo(() => controller.inspection(), [controller, version, selection]);

  return (
    <aside aria-label="Inspector" className="bg-panel flex h-full w-[280px] flex-col">
      <div className="border-border-soft flex h-10 flex-none items-center justify-between border-b px-3.5">
        <span className="text-ink text-xs font-semibold">
          {model.mode === 'single' ? model.name : 'Properties'}
        </span>
        {model.mode === 'single' && (
          <span className="text-faint font-mono text-[11px]">{model.type}</span>
        )}
        {model.mode === 'multi' && (
          <span className="text-faint font-mono text-[11px]">{model.count} sel</span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {model.mode === 'empty' && (
          <div className="px-3.5 pt-3.5">
            <SectionLabel>Page</SectionLabel>
            <div className="mb-3.5 flex items-center justify-between">
              <span className="text-muted-2 text-[12.5px]">Background</span>
              <div className="border-border bg-surface flex items-center gap-1.5 rounded-md border px-2 py-1">
                <span className="bg-canvas h-4 w-4 rounded border border-[#33333E]" />
                <span className="text-muted font-mono text-[11.5px]">0B0B0E</span>
              </div>
            </div>
            <div className="border-border mt-7 rounded-xl border border-dashed px-2.5 py-7 text-center">
              <div className="text-faint-2 text-xs leading-relaxed">
                Select a layer to edit its properties
              </div>
            </div>
          </div>
        )}

        {model.mode === 'multi' && (
          <div className="p-3.5">
            <div className="border-border bg-surface mb-4 flex items-center gap-2.5 rounded-[10px] border px-3 py-2.5">
              <span className="text-ink text-[12.5px] font-semibold">
                {model.count} layers selected
              </span>
            </div>
            <SectionLabel>Align</SectionLabel>
            <div className="grid grid-cols-3 gap-1.5">
              {['Left', 'Center', 'Right', 'Top', 'Middle', 'Bottom'].map((a) => (
                <button
                  key={a}
                  type="button"
                  title={a}
                  className="border-border bg-surface text-muted hover:border-brand hover:text-ink h-[30px] rounded-[7px] border text-[11px]"
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        )}

        {model.mode === 'single' && <SingleInspector model={model} />}
      </div>
    </aside>
  );
}
