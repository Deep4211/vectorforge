import { bench, describe } from 'vitest';
import { Matrix3, Vector2 } from '@vectorforge/geometry';

/**
 * Micro-benchmarks for the renderer/hit-test hot path. Run with `pnpm bench`.
 * They compare the immutable default API against the allocation-free `*Into`
 * variants — the latter exist precisely for per-frame inner loops where GC
 * pressure matters (ARCHITECTURE.md §6.5, §12.1).
 */

const view = Matrix3.translation(90, 46)
  .multiply(Matrix3.rotation(15))
  .multiply(Matrix3.scaling(0.82, 0.82));

const a = new Vector2(123.4, -56.7);
const b = new Vector2(8.9, 42.1);
const scratch = { x: 0, y: 0 };

describe('Vector2 add', () => {
  bench('immutable add (allocates)', () => {
    a.add(b);
  });
  bench('addInto (allocation-free)', () => {
    Vector2.addInto(scratch, a, b);
  });
});

describe('Matrix3 transformPoint', () => {
  bench('transformPoint (allocates a Vector2)', () => {
    view.transformPoint(a);
  });
  bench('transformPointInto (allocation-free)', () => {
    view.transformPointInto(scratch, a);
  });
});

describe('Matrix3 multiply', () => {
  bench('multiply', () => {
    view.multiply(view);
  });
});

describe('Matrix3 invert', () => {
  bench('invert', () => {
    view.invert();
  });
});
