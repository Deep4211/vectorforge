import { describe, expect, it } from 'vitest';
import { createSequentialIdGenerator } from '@vectorforge/document';

describe('createSequentialIdGenerator', () => {
  it('produces monotonic, prefixed, reproducible ids', () => {
    const gen = createSequentialIdGenerator();
    expect(gen.next()).toBe('node-1');
    expect(gen.next()).toBe('node-2');

    const layers = createSequentialIdGenerator('layer');
    expect(layers.next()).toBe('layer-1');

    // independent generators do not share state (deterministic by design)
    expect(createSequentialIdGenerator().next()).toBe('node-1');
  });
});
