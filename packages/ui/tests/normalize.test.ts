import { describe, expect, it } from 'vitest';
import { toEngineInput, toKeyInput } from '@vectorforge/ui';

const rect = { left: 10, top: 20 } as DOMRect;

function pointer(over: Partial<PointerEvent>): PointerEvent {
  return {
    clientX: 0,
    clientY: 0,
    button: 0,
    pointerType: 'mouse',
    shiftKey: false,
    altKey: false,
    metaKey: false,
    ctrlKey: false,
    ...over,
  } as PointerEvent;
}

describe('toEngineInput', () => {
  it('maps client coords to canvas-local screen and world (identity viewport)', () => {
    const input = toEngineInput(pointer({ clientX: 60, clientY: 70 }), rect, {
      panX: 0,
      panY: 0,
      zoom: 1,
    });
    expect([input.screen.x, input.screen.y]).toEqual([50, 50]); // client − rect origin
    expect([input.world.x, input.world.y]).toEqual([50, 50]);
    expect(input.button).toBe('primary');
    expect(input.pointerType).toBe('mouse');
  });

  it('applies the viewport to world and maps button/pointerType/modifiers', () => {
    const input = toEngineInput(
      pointer({ clientX: 110, clientY: 120, button: 2, pointerType: 'pen', shiftKey: true }),
      rect,
      { panX: 100, panY: 0, zoom: 2 },
    );
    expect([input.screen.x, input.screen.y]).toEqual([100, 100]);
    expect([input.world.x, input.world.y]).toEqual([0, 50]); // (screen − pan) / zoom
    expect(input.button).toBe('secondary');
    expect(input.pointerType).toBe('pen');
    expect(input.modifiers.shift).toBe(true);
  });
});

describe('toKeyInput', () => {
  it('carries key, modifiers, focus and IME flags', () => {
    const k = toKeyInput(
      {
        key: 'z',
        shiftKey: false,
        altKey: false,
        metaKey: true,
        ctrlKey: false,
        isComposing: true,
      } as KeyboardEvent,
      true,
    );
    expect(k.key).toBe('z');
    expect(k.modifiers.meta).toBe(true);
    expect(k.inTextInput).toBe(true);
    expect(k.isComposing).toBe(true);
  });
});
