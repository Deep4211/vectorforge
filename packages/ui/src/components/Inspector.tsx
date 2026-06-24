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

/** Swatch + hex row, shared by Fill and Stroke. */
function ColorRow({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string;
  onCommit: (value: string) => void;
}) {
  return (
    <div className="border-border bg-surface flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5">
      <span
        aria-hidden="true"
        className="h-[22px] w-[22px] flex-none rounded-md border border-white/15"
        style={{ backgroundColor: value }}
      />
      <input
        type="text"
        key={value}
        defaultValue={value}
        aria-label={label}
        onBlur={(e) => onCommit(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onCommit(e.currentTarget.value);
        }}
        className="text-ink flex-1 bg-transparent font-mono text-xs outline-none"
      />
    </div>
  );
}

interface Option {
  readonly value: string;
  readonly label: string;
}

/** Labeled dropdown styled like {@link Field}; tolerates a current value outside `options`. */
function Select({
  label,
  value,
  options,
  onCommit,
}: {
  label: string;
  value: string;
  options: readonly Option[];
  onCommit: (value: string) => void;
}) {
  const known = options.some((o) => o.value === value);
  return (
    <div className="border-border bg-surface flex h-[30px] items-center gap-1.5 rounded-lg border px-2.5">
      <span className="text-faint text-[11px]">{label}</span>
      <select
        value={value}
        aria-label={label}
        onChange={(e) => onCommit(e.currentTarget.value)}
        className="text-ink [&>option]:text-ink w-full cursor-pointer bg-transparent text-xs outline-none [&>option]:bg-[#1A1A22]"
      >
        {!known && <option value={value}>{value}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const FONT_FAMILIES: readonly Option[] = [
  { value: 'Onest', label: 'Onest' },
  { value: 'Inter', label: 'Inter' },
  { value: 'system-ui', label: 'System' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'JetBrains Mono', label: 'JetBrains Mono' },
];

const FONT_WEIGHTS: readonly Option[] = [
  { value: '300', label: 'Light' },
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semibold' },
  { value: '700', label: 'Bold' },
];

const TEXT_ALIGNS: readonly Option[] = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
  { value: 'justify', label: 'Justify' },
];

/** Segmented text-align control. */
function AlignButtons({ value, onCommit }: { value: string; onCommit: (value: string) => void }) {
  return (
    <div className="border-border bg-surface grid grid-cols-4 gap-px overflow-hidden rounded-lg border">
      {TEXT_ALIGNS.map((a) => (
        <button
          key={a.value}
          type="button"
          title={a.label}
          aria-label={a.label}
          aria-pressed={value === a.value}
          onClick={() => onCommit(a.value)}
          className={`h-[28px] text-[11px] ${
            value === a.value ? 'bg-brand text-white' : 'text-muted hover:text-ink'
          }`}
        >
          {a.label[0]}
        </button>
      ))}
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
          <Field
            label="∠"
            value={Math.round(model.rotation)}
            unit="°"
            onCommit={(deg) => controller.setRotation(id, deg)}
          />
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
            <ColorRow label="Fill" value={model.fill} onCommit={(c) => controller.setFill(id, c)} />
          </div>
        </>
      )}

      {model.stroke !== null && (
        <>
          <Divider />
          <div className="px-3.5">
            <SectionLabel>Stroke</SectionLabel>
            <ColorRow
              label="Stroke"
              value={model.stroke.color}
              onCommit={(c) => controller.setProperty(id, 'stroke', c)}
            />
            <div className="mt-2">
              <Field
                label="W"
                value={model.stroke.width}
                unit="px"
                onCommit={(w) => controller.setProperty(id, 'strokeWidth', Math.max(0, w))}
              />
            </div>
          </div>
        </>
      )}

      {model.text !== null && (
        <>
          <Divider />
          <div className="px-3.5">
            <SectionLabel>Typography</SectionLabel>
            <div className="mb-2">
              <Select
                label="Font"
                value={model.text.fontFamily}
                options={FONT_FAMILIES}
                onCommit={(v) => controller.setProperty(id, 'fontFamily', v)}
              />
            </div>
            <div className="mb-2 grid grid-cols-2 gap-2">
              <Field
                label="Size"
                value={model.text.fontSize}
                unit="px"
                onCommit={(v) => controller.setProperty(id, 'fontSize', Math.max(1, v))}
              />
              <Select
                label="Wt"
                value={String(model.text.fontWeight)}
                options={FONT_WEIGHTS}
                onCommit={(v) => {
                  const weight = Number.parseInt(v, 10);
                  if (Number.isFinite(weight)) controller.setProperty(id, 'fontWeight', weight);
                }}
              />
            </div>
            <div className="mb-2.5 grid grid-cols-2 gap-2">
              <Field
                label="Line"
                value={model.text.lineHeight}
                unit="px"
                onCommit={(v) => controller.setProperty(id, 'lineHeight', Math.max(0, v))}
              />
              <Field
                label="Spc"
                value={model.text.letterSpacing}
                unit="px"
                onCommit={(v) => controller.setProperty(id, 'letterSpacing', v)}
              />
            </div>
            <AlignButtons
              value={model.text.textAlign}
              onCommit={(v) => controller.setProperty(id, 'textAlign', v)}
            />
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
