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
export function createSequentialIdGenerator(prefix = 'node', start = 0): IdGenerator {
  let counter = start;
  return {
    next(): NodeId {
      counter += 1;
      return `${prefix}-${counter}`;
    },
  };
}

/**
 * Highest `N` among ids shaped `${prefix}-N` (0 if none). Used to reseed the id
 * generator after loading a document so freshly-created nodes never collide with
 * loaded ones.
 */
export function maxSequentialId(ids: Iterable<string>, prefix = 'node'): number {
  const re = new RegExp(`^${prefix}-(\\d+)$`);
  let max = 0;
  for (const id of ids) {
    const match = re.exec(id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max;
}
