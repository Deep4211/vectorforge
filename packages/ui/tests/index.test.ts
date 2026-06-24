import { describe, expect, it } from 'vitest';
import { LAYER, PACKAGE_ID } from '@vectorforge/ui';

describe('@vectorforge/ui', () => {
  it('exposes its package identity', () => {
    expect(PACKAGE_ID).toBe('@vectorforge/ui');
  });

  it('declares its architectural layer', () => {
    expect(LAYER).toBe('presentation');
  });
});
