import { useEffect, useRef, useState } from 'react';
import { useWorkspace } from '../workspace';
import { Icon, PATHS } from './icons';

interface Item {
  readonly label: string;
  readonly run: () => void | Promise<void>;
  readonly hint?: string;
}

/** A compact File dropdown: new / open / download `.vf` / export PNG · SVG. */
export function FileMenu() {
  const workspace = useWorkspace();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const items: Item[] = [
    { label: 'New document', run: () => workspace.newDocument() },
    { label: 'Open…', run: () => workspace.openVf(), hint: '.vf' },
    { label: 'Download', run: () => workspace.downloadVf(), hint: '.vf' },
    { label: 'Export PNG', run: () => workspace.exportPng() },
    { label: 'Export SVG', run: () => workspace.exportSvg() },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        title="File"
        onClick={() => setOpen((v) => !v)}
        className="border-border bg-surface text-muted hover:bg-hover hover:text-ink flex h-8 items-center gap-1.5 rounded-[9px] border px-2.5 text-xs"
      >
        <Icon d={PATHS.file} size={15} sw={1.7} />
        File
        <Icon d={PATHS.chevronDown} size={12} sw={2} />
      </button>
      {open && (
        <div
          role="menu"
          className="border-border bg-panel absolute left-0 top-[38px] z-50 w-[180px] overflow-hidden rounded-xl border py-1 shadow-[0_16px_40px_rgba(0,0,0,.35)]"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void item.run();
              }}
              className="text-muted-2 hover:bg-hover hover:text-ink flex w-full items-center justify-between px-3 py-2 text-left text-[12.5px]"
            >
              {item.label}
              {item.hint && <span className="text-faint font-mono text-[10.5px]">{item.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
