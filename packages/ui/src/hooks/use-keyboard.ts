import { useEffect } from 'react';
import type { EditorController } from '@vectorforge/editor';
import { toKeyInput } from '../input/normalize';

function isTextInput(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement).isContentEditable;
}

/**
 * Bind global keyboard shortcuts to the controller. The focus-in-text-input and
 * IME guards live in the controller (EDT-8); this hook only normalizes the event
 * and reports whether focus is in a text field.
 */
export function useGlobalKeyboard(controller: EditorController, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent): void => {
      controller.handleKeyboard(toKeyInput(e, isTextInput(document.activeElement)));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [controller, enabled]);
}
