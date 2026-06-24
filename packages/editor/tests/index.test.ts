import { describe, expect, it } from 'vitest';
import { LAYER, PACKAGE_ID } from '@vectorforge/editor';

describe('@vectorforge/editor', () => {
  it('exposes its package identity', () => {
    expect(PACKAGE_ID).toBe('@vectorforge/editor');
  });

  it('declares its architectural layer', () => {
    expect(LAYER).toBe('application');
  });
});
