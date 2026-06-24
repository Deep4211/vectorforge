import { describe, expect, it } from 'vitest';
import { LAYER, PACKAGE_ID } from '@vectorforge/persistence';

describe('@vectorforge/persistence', () => {
  it('exposes its package identity', () => {
    expect(PACKAGE_ID).toBe('@vectorforge/persistence');
  });

  it('declares its architectural layer', () => {
    expect(LAYER).toBe('infrastructure');
  });
});
