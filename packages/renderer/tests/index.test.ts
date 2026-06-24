import { describe, expect, it } from 'vitest';
import { LAYER, PACKAGE_ID } from '@vectorforge/renderer';

describe('@vectorforge/renderer', () => {
  it('exposes its package identity', () => {
    expect(PACKAGE_ID).toBe('@vectorforge/renderer');
  });

  it('declares its architectural layer', () => {
    expect(LAYER).toBe('infrastructure');
  });
});
