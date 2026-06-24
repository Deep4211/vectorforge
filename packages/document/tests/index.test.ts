import { describe, expect, it } from 'vitest';
import { LAYER, PACKAGE_ID } from '@vectorforge/document';

describe('@vectorforge/document', () => {
  it('exposes its package identity', () => {
    expect(PACKAGE_ID).toBe('@vectorforge/document');
  });

  it('declares its architectural layer', () => {
    expect(LAYER).toBe('domain');
  });
});
