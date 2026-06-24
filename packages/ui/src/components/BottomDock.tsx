import { useState } from 'react';
import { Icon, PATHS } from './icons';

type Tab = 'comments' | 'history' | 'console';
const TABS: readonly { id: Tab; label: string }[] = [
  { id: 'comments', label: 'Comments' },
  { id: 'history', label: 'History' },
  { id: 'console', label: 'Console' },
];

const COMMENTS = [
  {
    initials: 'JD',
    name: 'Jordan Diaz',
    color: '#3FCF8E',
    time: '2h ago',
    text: 'Can we bump the balance number a few px? Feels cramped against the label.',
  },
  {
    initials: 'MK',
    name: 'Mira Kovač',
    color: '#F5A623',
    time: '5h ago',
    text: 'Love the card gradient — approved from my side.',
  },
];

const LOGS = [
  {
    time: '09:41:02',
    tag: 'info',
    color: '#5B9BFF',
    msg: 'Document synced · 3 collaborators online',
  },
  {
    time: '09:41:04',
    tag: 'render',
    color: '#8B6BFF',
    msg: 'Frame "Frame 1" painted in 4.2ms (60fps)',
  },
  { time: '09:41:21', tag: 'info', color: '#5B9BFF', msg: 'Auto-saved to cloud ✓' },
];

/** Bottom dock (DesignOS): comments / history / console tabs. Chrome only for now. */
export function BottomDock() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('comments');

  const select = (id: Tab): void => {
    setTab(id);
    setOpen((prev) => (tab === id ? !prev : true));
  };

  return (
    <div className="border-border-strong bg-panel z-30 flex-none border-t">
      <div className="flex h-[34px] items-center gap-0.5 px-2">
        {TABS.map((t) => {
          const active = open && tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => select(t.id)}
              className={`h-[26px] rounded-[7px] px-[11px] text-xs ${
                active
                  ? 'text-ink bg-[#22222D] font-semibold'
                  : 'hover:text-ink font-medium text-[#8A8A96]'
              }`}
            >
              {t.label}
            </button>
          );
        })}
        <div className="flex-1" />
        <button
          type="button"
          aria-label={open ? 'Collapse dock' : 'Expand dock'}
          onClick={() => setOpen((p) => !p)}
          className="text-faint-2 flex h-[26px] w-[26px] items-center justify-center rounded-md hover:bg-[#22222B] hover:text-white"
        >
          <Icon d={PATHS.chevronDown} size={15} sw={1.8} className={open ? '' : 'rotate-180'} />
        </button>
      </div>

      {open && (
        <div className="border-border-soft h-[200px] overflow-y-auto border-t">
          {tab === 'comments' && (
            <div className="flex flex-col gap-3.5 p-4">
              {COMMENTS.map((c) => (
                <div key={c.name} className="flex gap-2.5">
                  <div
                    className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-[11px] font-bold text-white"
                    style={{ background: c.color }}
                  >
                    {c.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-center gap-2">
                      <span className="text-ink text-[12.5px] font-semibold">{c.name}</span>
                      <span className="text-faint text-[11px]">{c.time}</span>
                    </div>
                    <div className="text-[12.5px] leading-relaxed text-[#B6B6C2]">{c.text}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'history' && (
            <div className="text-faint-2 p-4 text-[12.5px]">
              Version history coming with persistence (Sprint 8).
            </div>
          )}
          {tab === 'console' && (
            <div className="p-2.5 font-mono text-xs leading-7">
              {LOGS.map((l, i) => (
                <div key={i} className="flex gap-2.5 px-1">
                  <span className="flex-none text-[#4E4E5A]">{l.time}</span>
                  <span className="w-12 flex-none font-semibold" style={{ color: l.color }}>
                    {l.tag}
                  </span>
                  <span className="text-[#B6B6C2]">{l.msg}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
