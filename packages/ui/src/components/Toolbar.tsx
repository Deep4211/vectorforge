import type { ToolId } from '@vectorforge/editor';
import { useController } from '../context';
import { useEditorSelector } from '../hooks/use-editor-selector';
import { useTheme } from '../hooks/use-theme';
import { toggleTheme } from '../theme/theme';
import { Icon, PATHS } from './icons';

interface ToolSpec {
  readonly id: ToolId;
  readonly label: string;
  readonly shortcut: string;
  readonly path: string;
}

const TOOLS: readonly ToolSpec[] = [
  { id: 'move', label: 'Move', shortcut: 'V', path: PATHS.move },
  { id: 'frame', label: 'Frame', shortcut: 'F', path: PATHS.frame },
  { id: 'rectangle', label: 'Rectangle', shortcut: 'R', path: PATHS.rectangle },
  { id: 'ellipse', label: 'Ellipse', shortcut: 'O', path: PATHS.ellipse },
  { id: 'line', label: 'Line', shortcut: 'L', path: PATHS.line },
  { id: 'text', label: 'Text', shortcut: 'T', path: PATHS.text },
  { id: 'hand', label: 'Hand', shortcut: 'H', path: PATHS.hand },
];

const AVATARS = [
  { initials: 'AR', color: '#7C5CFF' },
  { initials: 'JD', color: '#3FCF8E' },
  { initials: 'MK', color: '#F5A623' },
];

/** Top toolbar (DesignOS): brand + doc status, centered tool cluster, actions. */
export function Toolbar() {
  const controller = useController();
  const tool = useEditorSelector((s) => s.tool);
  const dirty = useEditorSelector((s) => s.dirty);
  const theme = useTheme();

  return (
    <div className="border-border-strong bg-panel relative z-40 flex h-12 flex-none items-center gap-2 border-b px-2.5">
      {/* brand + document */}
      <div className="flex w-[300px] items-center gap-2.5">
        <div className="from-brand-2 flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br to-[#5B3CE0] text-white shadow-[0_2px_8px_rgba(124,92,255,.4)]">
          <Icon d={PATHS.logo} size={16} sw={2.2} />
        </div>
        <div className="bg-line h-5 w-px" />
        <div className="flex min-w-0 flex-col gap-px">
          <div className="flex items-center gap-1.5">
            <span className="text-ink-bright truncate text-[13px] font-semibold">Untitled</span>
            <Icon d={PATHS.chevronDown} size={13} sw={2} className="text-faint" />
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${dirty ? 'bg-warn' : 'bg-positive shadow-[0_0_6px_#3FCF8E]'}`}
            />
            <span className="text-faint-2 text-[11px]">
              {dirty ? 'Unsaved changes' : 'All changes saved'}
            </span>
          </div>
        </div>
      </div>

      {/* center tool cluster */}
      <div className="flex flex-1 justify-center">
        <div
          role="toolbar"
          aria-label="Tools"
          className="border-border bg-surface flex items-center gap-0.5 rounded-[11px] border p-[3px]"
        >
          {TOOLS.map((t) => {
            const active = tool === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={active}
                aria-label={`${t.label} (${t.shortcut})`}
                title={`${t.label} · ${t.shortcut}`}
                onClick={() => controller.setTool(t.id)}
                className={`focus-visible:ring-brand flex h-8 w-[34px] items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 ${
                  active ? 'bg-brand text-white' : 'text-muted hover:bg-border hover:text-ink'
                }`}
              >
                <Icon d={t.path} size={17} />
              </button>
            );
          })}
        </div>
      </div>

      {/* actions */}
      <div className="flex w-[300px] items-center justify-end gap-1.5">
        <div className="border-border bg-surface flex items-center rounded-[9px] border p-0.5">
          <button
            type="button"
            aria-label="Undo"
            title="Undo · ⌘Z"
            onClick={() => controller.undo()}
            className="text-muted hover:bg-border hover:text-ink flex h-7 w-[30px] items-center justify-center rounded-[7px]"
          >
            <Icon d={PATHS.undo} size={16} sw={1.7} />
          </button>
          <button
            type="button"
            aria-label="Redo"
            title="Redo · ⌘⇧Z"
            onClick={() => controller.redo()}
            className="text-muted hover:bg-border hover:text-ink flex h-7 w-[30px] items-center justify-center rounded-[7px]"
          >
            <Icon d={PATHS.redo} size={16} sw={1.7} />
          </button>
        </div>

        <button
          type="button"
          title="Device preview"
          className="border-border bg-surface text-muted hover:bg-hover flex h-8 items-center gap-1.5 rounded-[9px] border px-2.5 text-xs"
        >
          <Icon d={PATHS.device} size={15} />
          <span>iPhone 15</span>
        </button>

        <div className="mx-0.5 flex items-center">
          {AVATARS.map((a) => (
            <div
              key={a.initials}
              title={a.initials}
              className="border-panel -ml-[7px] flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 text-[10px] font-bold text-white"
              style={{ background: a.color }}
            >
              {a.initials}
            </div>
          ))}
        </div>

        <button
          type="button"
          className="from-brand-2 flex h-8 items-center gap-1.5 rounded-[9px] border-none bg-gradient-to-b to-[#7048E8] px-3.5 text-[12.5px] font-semibold text-white shadow-[0_2px_10px_rgba(124,92,255,.35)] hover:brightness-110"
        >
          <Icon d={PATHS.share} size={14} sw={1.8} />
          Share
        </button>
        <button
          type="button"
          aria-label="Toggle theme"
          aria-pressed={theme === 'light'}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={() => toggleTheme()}
          className="border-border bg-surface text-muted hover:bg-hover hover:text-ink flex h-8 w-8 items-center justify-center rounded-[9px] border"
        >
          <Icon d={theme === 'dark' ? PATHS.sun : PATHS.moon} size={16} sw={1.7} />
        </button>
        <button
          type="button"
          aria-label="Settings"
          className="border-border bg-surface text-muted hover:bg-hover flex h-8 w-8 items-center justify-center rounded-[9px] border"
        >
          <Icon d={PATHS.settings} size={16} sw={1.5} />
        </button>
      </div>
    </div>
  );
}
