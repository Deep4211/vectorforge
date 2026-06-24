import type { NodeId } from './types';

/**
 * Source of stable, unique node ids (DOC-3). Injectable so callers can supply a
 * deterministic generator in tests and, later, a collision-resistant one in
 * production. ARCHITECTURE.md §1.4 keeps id generation behind a port; until the
 * `shared` package exposes one, the document package provides this minimal
 * interface plus a deterministic default.
 */
export interface IdGenerator {
  next(): NodeId;
}

/**
 * Deterministic, monotonically increasing generator: `${prefix}-1`, `${prefix}-2`, …
 * Reproducible by design — ideal for tests and stable serialization fixtures.
 */
export function createSequentialIdGenerator(prefix = 'node'): IdGenerator {
  let counter = 0;
  return {
    next(): NodeId {
      counter += 1;
      return `${prefix}-${counter}`;
    },
  };
}
