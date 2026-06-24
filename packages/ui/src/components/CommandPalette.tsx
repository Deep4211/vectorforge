import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import type { EditorController } from '@vectorforge/editor';
import { useController } from '../context';

interface Command {
  readonly id: string;
  readonly title: string;
  readonly run: (controller: EditorController) => void;
}

function buildCommands(): readonly Command[] {
  return [
    { id: 'tool-move', title: 'Move tool', run: (c) => c.setTool('move') },
    { id: 'tool-rectangle', title: 'Rectangle tool', run: (c) => c.setTool('rectangle') },
    { id: 'tool-ellipse', title: 'Ellipse tool', run: (c) => c.setTool('ellipse') },
    { id: 'tool-line', title: 'Line tool', run: (c) => c.setTool('line') },
    { id: 'tool-frame', title: 'Frame tool', run: (c) => c.setTool('frame') },
    { id: 'tool-text', title: 'Text tool', run: (c) => c.setTool('text') },
    { id: 'delete', title: 'Delete selection', run: (c) => c.deleteSelection() },
    { id: 'group', title: 'Group selection', run: (c) => c.group() },
    { id: 'ungroup', title: 'Ungroup', run: (c) => c.ungroup() },
    { id: 'front', title: 'Bring to front', run: (c) => c.bringToFront() },
    { id: 'back', title: 'Send to back', run: (c) => c.sendToBack() },
    { id: 'undo', title: 'Undo', run: (c) => c.undo() },
    { id: 'redo', title: 'Redo', run: (c) => c.redo() },
    {
      id: 'reset-zoom',
      title: 'Zoom to 100%',
      run: (c) => c.setViewport({ panX: 0, panY: 0, zoom: 1 }),
    },
  ];
}

function focusableWithin(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])'),
  ).filter((el) => !el.hasAttribute('disabled'));
}

export interface CommandPaletteProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

/**
 * Command palette: a modal dialog with a focus trap (UI-6). Controlled by the
 * shell (which makes the rest of the chrome `inert` while it is open and owns the
 * Cmd/Ctrl+K toggle). Focus moves to the search field on open and is restored to
 * the previously focused element on close.
 */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const controller = useController();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      restoreFocusRef.current = document.activeElement as HTMLElement | null;
      inputRef.current?.focus();
    } else {
      setQuery('');
      restoreFocusRef.current?.focus?.();
    }
  }, [open]);

  const commands = useMemo(() => buildCommands(), []);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? commands.filter((c) => c.title.toLowerCase().includes(q)) : commands;
  }, [commands, query]);

  if (!open) return null;

  const runCommand = (command: Command): void => {
    command.run(controller);
    onClose();
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>): void => {
    e.stopPropagation(); // keystrokes in the palette never reach the global shortcuts
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      onClose(); // Cmd/Ctrl+K toggles it shut from within (the window toggle is stopped above)
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[0]) runCommand(filtered[0]);
      return;
    }
    if (e.key === 'Tab') {
      const items = focusableWithin(dialogRef.current);
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-32"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        className="border-border bg-surface-2 w-full max-w-md overflow-hidden rounded-xl border shadow-2xl"
      >
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="command-palette-list"
          aria-label="Search commands"
          placeholder="Type a command…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border-border text-ink w-full border-b bg-transparent px-4 py-3 outline-none"
        />
        <ul
          id="command-palette-list"
          role="listbox"
          aria-label="Commands"
          className="max-h-72 overflow-auto py-1"
        >
          {filtered.length === 0 ? (
            <li className="text-faint px-4 py-2 text-sm">No matching commands</li>
          ) : (
            filtered.map((command, index) => (
              <li key={command.id} role="option" aria-selected={index === 0}>
                <button
                  type="button"
                  onClick={() => runCommand(command)}
                  className={`focus-visible:bg-brand/30 w-full px-4 py-2 text-left text-sm focus:outline-none ${
                    index === 0 ? 'bg-brand/15 text-ink' : 'text-muted-2 hover:bg-elevated'
                  }`}
                >
                  {command.title}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
