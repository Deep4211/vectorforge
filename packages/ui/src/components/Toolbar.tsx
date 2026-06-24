import type { ToolId } from '@vectorforge/editor';
import { useController } from '../context';
import { useEditorSelector } from '../hooks/use-editor-selector';

interface ToolSpec {
  readonly id: ToolId;
  readonly label: string;
  readonly shortcut: string;
  readonly glyph: string;
}

const TOOLS: readonly ToolSpec[] = [
  { id: 'move', label: 'Move', shortcut: 'V', glyph: '↖' },
  { id: 'frame', label: 'Frame', shortcut: 'F', glyph: '⊞' },
  { id: 'rectangle', label: 'Rectangle', shortcut: 'R', glyph: '▭' },
  { id: 'ellipse', label: 'Ellipse', shortcut: 'O', glyph: '◯' },
  { id: 'text', label: 'Text', shortcut: 'T', glyph: 'T' },
  { id: 'hand', label: 'Hand', shortcut: 'H', glyph: '✋' },
];

/** Tool switcher (UI-2: dispatches `setTool`; reads the active tool via a selector). */
export function Toolbar() {
  const controller = useController();
  const active = useEditorSelector((state) => state.tool);

  return (
    <div
      role="toolbar"
      aria-label="Tools"
      aria-orientation="horizontal"
      className="flex items-center gap-1 border-b border-[#26262F] bg-[#101015] px-3 py-2"
    >
      <span className="mr-2 text-sm font-bold tracking-tight text-[#ECECF1]">VectorForge</span>
      {TOOLS.map((tool) => {
        const selected = active === tool.id;
        return (
          <button
            key={tool.id}
            type="button"
            aria-pressed={selected}
            aria-label={`${tool.label} (${tool.shortcut})`}
            title={`${tool.label} (${tool.shortcut})`}
            onClick={() => controller.setTool(tool.id)}
            className={`flex h-8 w-8 items-center justify-center rounded-md text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFF] ${
              selected
                ? 'bg-[#7C5CFF] text-white'
                : 'text-[#9A9AA6] hover:bg-[#1E1E27] hover:text-[#ECECF1]'
            }`}
          >
            <span aria-hidden="true">{tool.glyph}</span>
          </button>
        );
      })}
    </div>
  );
}
