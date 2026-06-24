import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { worldToScreen } from '@vectorforge/editor';
import { useController } from '../context';
import { useEditorSelector } from '../hooks/use-editor-selector';

/** The inline text editor for the node in `editingTextId`, positioned over the canvas. */
function TextEditorBox() {
  const controller = useController();
  const viewport = useEditorSelector((s) => s.viewport);
  const target = controller.textEditTarget();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(target?.content ?? '');

  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.focus();
      el.select();
    }
  }, []);

  if (!target) return null;
  const screen = worldToScreen({ x: target.worldX, y: target.worldY }, viewport);
  const commit = (): void => controller.commitTextContent(target.id, value);

  const style: CSSProperties = {
    left: screen.x,
    top: screen.y,
    minWidth: 24,
    width: target.width ? target.width * viewport.zoom : undefined,
    fontFamily: target.fontFamily,
    fontWeight: target.fontWeight,
    fontSize: target.fontSize * viewport.zoom,
    lineHeight: `${target.lineHeight * viewport.zoom}px`,
    letterSpacing: `${target.letterSpacing * viewport.zoom}px`,
    textAlign: target.textAlign as CSSProperties['textAlign'],
    color: target.fill,
    caretColor: '#7C5CFF',
  };

  return (
    <textarea
      ref={ref}
      aria-label="Edit text"
      value={value}
      spellCheck={false}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        // Keep keystrokes out of the global shortcut handler while editing.
        e.stopPropagation();
        if (e.key === 'Escape') {
          e.preventDefault();
          commit();
        }
      }}
      className="border-brand absolute z-40 resize-none overflow-hidden whitespace-pre rounded-[2px] border bg-transparent p-0 outline-none"
      style={style}
    />
  );
}

/** Mounts the inline text editor when a text node is being edited (UI-4 — engine-owned state). */
export function TextEditorOverlay() {
  const editingId = useEditorSelector((s) => s.editingTextId);
  if (editingId === null) return null;
  // Remount per edited node so the textarea re-initializes from that node's content.
  return <TextEditorBox key={editingId} />;
}
