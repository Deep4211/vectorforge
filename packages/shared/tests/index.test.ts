import { describe, expect, it } from 'vitest';
import { LAYER, PACKAGE_ID } from '@vectorforge/shared';

describe('@vectorforge/shared', () => {
  it('exposes its package identity', () => {
    expect(PACKAGE_ID).toBe('@vectorforge/shared');
  });

  it('declares its architectural layer', () => {
    expect(LAYER).toBe('cross-cutting');
  });
});
