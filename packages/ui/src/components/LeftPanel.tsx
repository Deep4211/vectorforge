import { useState } from 'react';
import { LayersPanel } from './LayersPanel';
import { Icon, PATHS } from './icons';

type Tab = 'layers' | 'assets' | 'pages';
const TABS: readonly Tab[] = ['layers', 'assets', 'pages'];

const COMPONENTS = ['Button', 'Card', 'Avatar', 'Input'];
const COLORS = [
  '#7C5CFF',
  '#5B3CE0',
  '#3FCF8E',
  '#F5A623',
  '#5B9BFF',
  '#FF5E7E',
  '#0B0B0F',
  '#16161F',
];
const TYPESCALE = [
  { name: 'Display', spec: '28 / 800', size: 22, weight: 800 },
  { name: 'Title', spec: '20 / 700', size: 18, weight: 700 },
  { name: 'Body', spec: '15 / 400', size: 14, weight: 400 },
  { name: 'Caption', spec: '12 / 500', size: 12, weight: 500 },
];
const PAGES = [
  { name: 'Home Flow', count: '24', active: true },
  { name: 'Onboarding', count: '11', active: false },
  { name: 'Components', count: '38', active: false },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-faint mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.08em]">
      {children}
    </div>
  );
}

function AssetsTab() {
  return (
    <div className="h-full overflow-auto px-3 py-2.5">
      <div className="relative mb-3.5">
        <span className="text-faint pointer-events-none absolute left-2.5 top-2">
          <Icon d={PATHS.search} size={14} sw={1.8} />
        </span>
        <input
          aria-label="Search assets"
          placeholder="Search assets"
          className="border-border bg-surface text-ink focus:border-brand h-[30px] w-full rounded-lg border pl-[30px] pr-2.5 text-xs focus:outline-none"
        />
      </div>
      <SectionLabel>Components</SectionLabel>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {COMPONENTS.map((c) => (
          <div
            key={c}
            className="border-border bg-surface-2 text-muted-2 hover:border-brand hover:text-ink flex aspect-[1.4] cursor-grab flex-col items-center justify-center gap-1.5 rounded-[9px] border"
          >
            <span className="text-brand-2">
              <Icon d={PATHS.rectangle} size={20} sw={1.5} />
            </span>
            <span className="text-[11px]">{c}</span>
          </div>
        ))}
      </div>
      <SectionLabel>Colors</SectionLabel>
      <div className="mb-4 flex flex-wrap gap-2">
        {COLORS.map((hex) => (
          <div
            key={hex}
            title={hex}
            className="h-[30px] w-[30px] rounded-lg border border-white/10 transition-transform hover:scale-110"
            style={{ background: hex }}
          />
        ))}
      </div>
      <SectionLabel>Typography</SectionLabel>
      <div className="flex flex-col">
        {TYPESCALE.map((t) => (
          <div
            key={t.name}
            className="flex items-baseline justify-between border-b border-[#1C1C24] py-[7px]"
          >
            <span className="text-ink" style={{ fontSize: t.size, fontWeight: t.weight }}>
              {t.name}
            </span>
            <span className="text-faint font-mono text-[11px]">{t.spec}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PagesTab() {
  return (
    <div className="h-full overflow-auto p-2">
      <div className="flex items-center justify-between px-1 pb-2 pt-0.5">
        <span className="text-faint text-[10.5px] font-bold uppercase tracking-[0.08em]">
          Pages
        </span>
        <button
          type="button"
          aria-label="Add page"
          className="bg-surface text-muted hover:bg-border flex h-[22px] w-[22px] items-center justify-center rounded-md hover:text-white"
        >
          <Icon d={PATHS.plus} size={14} sw={2} />
        </button>
      </div>
      {PAGES.map((p) => (
        <button
          key={p.name}
          type="button"
          className={`flex h-[34px] w-full items-center gap-2.5 rounded-lg px-2 text-left ${
            p.active ? 'bg-[#1C1C24] text-white' : 'text-muted hover:bg-[#1C1C24]'
          }`}
        >
          <Icon d={PATHS.image} size={15} />
          <span className="flex-1 text-[12.5px]" style={{ fontWeight: p.active ? 600 : 500 }}>
            {p.name}
          </span>
          <span className="text-faint font-mono text-[11px]">{p.count}</span>
        </button>
      ))}
    </div>
  );
}

/** Left panel: Layers / Assets / Pages (DesignOS §left). */
export function LeftPanel() {
  const [tab, setTab] = useState<Tab>('layers');
  return (
    <div className="flex h-full w-full flex-col">
      <div
        role="tablist"
        aria-label="Left panel sections"
        className="border-border-soft flex h-10 flex-none items-center gap-0.5 border-b px-2"
      >
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`h-7 rounded-[7px] px-[11px] text-xs capitalize ${
              tab === t
                ? 'text-ink bg-[#22222D] font-semibold'
                : 'hover:text-ink font-medium text-[#8A8A96]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        {tab === 'layers' && <LayersPanel />}
        {tab === 'assets' && <AssetsTab />}
        {tab === 'pages' && <PagesTab />}
      </div>
    </div>
  );
}
