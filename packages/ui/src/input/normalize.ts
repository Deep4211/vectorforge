import {
  screenToWorld,
  Vector2,
  type EngineInput,
  type KeyInput,
  type Modifiers,
  type PointerButton,
  type PointerKind,
  type Viewport,
} from '@vectorforge/editor';

interface ModifierSource {
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
}

/** The subset of a DOM pointer/mouse event we read (so pointer AND dblclick events both fit). */
interface PointerLike extends ModifierSource {
  readonly clientX: number;
  readonly clientY: number;
  readonly button: number;
  readonly pointerType?: string;
}

function modifiersOf(e: ModifierSource): Modifiers {
  return { shift: e.shiftKey, alt: e.altKey, meta: e.metaKey, ctrl: e.ctrlKey };
}

function buttonOf(button: number): PointerButton {
  if (button === 2) return 'secondary';
  if (button === 1) return 'middle';
  return 'primary';
}

function kindOf(pointerType: string | undefined): PointerKind {
  if (pointerType === 'pen') return 'pen';
  if (pointerType === 'touch') return 'touch';
  return 'mouse';
}

/**
 * Normalize a raw DOM pointer/mouse event into the engine's framework-agnostic
 * {@link EngineInput} (the engine never sees a DOM event — EDT-1 / §8.1). The
 * `rect` is the canvas's bounding box (screen origin); the world point is derived
 * from the current viewport.
 */
export function toEngineInput(e: PointerLike, rect: DOMRect, viewport: Viewport): EngineInput {
  const screen = new Vector2(e.clientX - rect.left, e.clientY - rect.top);
  return {
    world: screenToWorld(screen, viewport),
    screen,
    button: buttonOf(e.button),
    modifiers: modifiersOf(e),
    pointerType: kindOf(e.pointerType),
  };
}

/** Normalize a DOM `KeyboardEvent` into the engine's {@link KeyInput} (EDT-8). */
export function toKeyInput(e: KeyboardEvent, inTextInput: boolean): KeyInput {
  return {
    key: e.key,
    modifiers: modifiersOf(e),
    inTextInput,
    isComposing: e.isComposing,
  };
}
