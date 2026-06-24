import { describe, expect, it } from 'vitest';
import { LAYER, PACKAGE_ID } from '@vectorforge/geometry';

describe('@vectorforge/geometry', () => {
  it('exposes its package identity', () => {
    expect(PACKAGE_ID).toBe('@vectorforge/geometry');
  });

  it('declares its architectural layer', () => {
    expect(LAYER).toBe('domain');
  });
});
