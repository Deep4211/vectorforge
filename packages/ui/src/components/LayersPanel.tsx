import { useMemo, useState } from 'react';
import type { LayerItem, NodeId, NodeType } from '@vectorforge/editor';
import { useController } from '../context';
import { useDocumentVersion, useEditorSelector } from '../hooks/use-editor-selector';
import { Icon, PATHS } from './icons';

const TYPE_PATH: Record<NodeType, string> = {
  frame: PATHS.frame,
  group: PATHS.group,
  rectangle: PATHS.rectangle,
  ellipse: PATHS.ellipse,
  line: PATHS.line,
  text: PATHS.text,
  image: PATHS.image,
};

interface FlatRow {
  readonly item: LayerItem;
  readonly depth: number;
}

/** Pre-order flatten, hiding descendants of collapsed nodes. */
function flatten(
  items: readonly LayerItem[],
  collapsed: ReadonlySet<NodeId>,
  depth = 0,
): FlatRow[] {
  const out: FlatRow[] = [];
  for (const item of items) {
    out.push({ item, depth });
    if (item.children.length > 0 && !collapsed.has(item.id)) {
      out.push(...flatten(item.children, collapsed, depth + 1));
    }
  }
  return out;
}

/** Layer outline (UI-3) — a flattened, `aria-level` tree (WAI-ARIA tree pattern). */
export function LayersPanel() {
  const controller = useController();
  const version = useDocumentVersion();
  const selectedIds = useEditorSelector((state) => state.selection.ids);
  const tree = useMemo(() => controller.outline(), [controller, version]);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const [collapsed, setCollapsed] = useState<ReadonlySet<NodeId>>(new Set());
  const rows = useMemo(() => flatten(tree, collapsed), [tree, collapsed]);

  const toggle = (id: NodeId): void =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <nav aria-label="Layers" className="flex h-full flex-col">
      <div className="px-3 pb-2 pt-1">
        <span className="text-faint text-[10.5px] font-bold uppercase tracking-[0.08em]">
          Layers
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-faint px-3 text-sm">No layers yet</p>
      ) : (
        <ul role="tree" aria-label="Layer tree" className="flex-1 overflow-auto px-1">
          {rows.map(({ item, depth }) => {
            const isSelected = selected.has(item.id);
            const hasChildren = item.children.length > 0;
            const isOpen = hasChildren && !collapsed.has(item.id);
            return (
              <li
                key={item.id}
                role="treeitem"
                aria-level={depth + 1}
                aria-selected={isSelected}
                aria-expanded={hasChildren ? isOpen : undefined}
                tabIndex={0}
                onClick={() => controller.select(item.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    controller.select(item.id);
                  }
                }}
                className={`group/row focus-visible:ring-brand flex h-7 items-center rounded pr-2 text-[12.5px] outline-none focus-visible:ring-2 ${
                  isSelected ? 'bg-brand/[0.16] text-ink' : 'text-label hover:bg-white/[0.04]'
                } ${item.visible ? '' : 'opacity-50'}`}
              >
                <span style={{ width: depth * 15 }} className="flex-none" />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={isOpen ? 'Collapse' : 'Expand'}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasChildren) toggle(item.id);
                  }}
                  className="text-faint-2 flex h-7 w-[18px] flex-none items-center justify-center"
                >
                  {hasChildren && (
                    <Icon
                      d={PATHS.chevronRight}
                      size={11}
                      sw={2.4}
                      className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}
                    />
                  )}
                </button>
                <span
                  className={`mr-[7px] flex h-4 w-4 flex-none items-center justify-center ${
                    isSelected || item.type === 'frame' ? 'text-brand-2' : 'text-dim-2'
                  }`}
                >
                  <Icon d={TYPE_PATH[item.type]} size={14} sw={1.5} />
                </span>
                <span
                  className="flex-1 truncate"
                  style={{ fontWeight: isSelected || item.type === 'frame' ? 600 : 400 }}
                >
                  {item.name}
                </span>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={item.locked ? 'Unlock' : 'Lock'}
                  aria-pressed={item.locked}
                  onClick={(e) => {
                    e.stopPropagation();
                    controller.setProperty(item.id, 'locked', !item.locked);
                  }}
                  className={`text-faint hover:text-ink hover:bg-track h-[22px] w-[22px] items-center justify-center rounded-[5px] ${
                    item.locked ? 'flex' : 'hidden group-hover/row:flex'
                  }`}
                >
                  <Icon d={item.locked ? PATHS.lock : PATHS.unlock} size={13} />
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={item.visible ? 'Hide' : 'Show'}
                  aria-pressed={!item.visible}
                  onClick={(e) => {
                    e.stopPropagation();
                    controller.setProperty(item.id, 'visibility', !item.visible);
                  }}
                  className={`text-faint hover:text-ink hover:bg-track h-[22px] w-[22px] items-center justify-center rounded-[5px] ${
                    item.visible ? 'hidden group-hover/row:flex' : 'flex'
                  }`}
                >
                  <Icon d={item.visible ? PATHS.eye : PATHS.eyeOff} size={13} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
