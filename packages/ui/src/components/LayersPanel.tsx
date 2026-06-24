import { useMemo } from 'react';
import type { LayerItem, NodeId, NodeType } from '@vectorforge/editor';
import { useController } from '../context';
import { useDocumentVersion, useEditorSelector } from '../hooks/use-editor-selector';

const TYPE_GLYPH: Record<NodeType, string> = {
  frame: '⊞',
  group: '▣',
  rectangle: '▭',
  ellipse: '◯',
  line: '╱',
  text: 'T',
  image: '🖼',
};

interface RowProps {
  readonly item: LayerItem;
  readonly depth: number;
  readonly selected: ReadonlySet<NodeId>;
  readonly onSelect: (id: NodeId) => void;
}

function LayerRow({ item, depth, selected, onSelect }: RowProps) {
  const isSelected = selected.has(item.id);
  const hasChildren = item.children.length > 0;
  // The treeitem IS the focusable element (role + selected/expanded state +
  // keyboard handler co-located, per the WAI-ARIA tree pattern). stopPropagation
  // keeps a child activation from also selecting its ancestor rows.
  return (
    <li
      role="treeitem"
      aria-selected={isSelected}
      aria-expanded={hasChildren ? true : undefined}
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(item.id);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onSelect(item.id);
        }
      }}
      className="rounded outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFF]"
    >
      <div
        style={{ paddingLeft: depth * 14 + 8 }}
        className={`flex cursor-default items-center gap-2 rounded py-1 pr-2 text-sm ${
          isSelected ? 'bg-[#7C5CFF]/20 text-[#ECECF1]' : 'text-[#9A9AA6] hover:bg-[#1E1E27]'
        }`}
      >
        <span aria-hidden="true" className="w-4 text-center text-xs">
          {TYPE_GLYPH[item.type]}
        </span>
        <span className="flex-1 truncate">{item.name}</span>
        {item.locked && (
          <span role="img" aria-label="locked" className="text-xs">
            🔒
          </span>
        )}
        {!item.visible && (
          <span role="img" aria-label="hidden" className="text-xs opacity-60">
            ⦸
          </span>
        )}
      </div>
      {hasChildren && (
        <ul role="group">
          {item.children.map((child) => (
            <LayerRow
              key={child.id}
              item={child}
              depth={depth + 1}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Layer outline (UI-3: re-reads the tree only when the document changes; a pan never does). */
export function LayersPanel() {
  const controller = useController();
  const version = useDocumentVersion();
  const selectedIds = useEditorSelector((state) => state.selection.ids);
  const tree = useMemo(() => controller.outline(), [controller, version]);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  return (
    <nav aria-label="Layers" className="flex h-full flex-col">
      <h2 className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#5C5C6A]">
        Layers
      </h2>
      {tree.length === 0 ? (
        <p className="px-3 text-sm text-[#5C5C6A]">No layers yet</p>
      ) : (
        <ul role="tree" aria-label="Layer tree" className="flex-1 overflow-auto px-1">
          {tree.map((item) => (
            <LayerRow
              key={item.id}
              item={item}
              depth={0}
              selected={selected}
              onSelect={(id) => controller.select(id)}
            />
          ))}
        </ul>
      )}
    </nav>
  );
}
