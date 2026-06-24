import { describe, expect, it } from 'vitest';
import { LAYER, PACKAGE_ID } from '@vectorforge/commands';

describe('@vectorforge/commands', () => {
  it('exposes its package identity', () => {
    expect(PACKAGE_ID).toBe('@vectorforge/commands');
  });

  it('declares its architectural layer', () => {
    expect(LAYER).toBe('domain');
  });
});
