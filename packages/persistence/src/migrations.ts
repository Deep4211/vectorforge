/**
 * `.vf` schema versioning + migration framework (ARCHITECTURE.md §11.4).
 *
 * Versions are `"major.minor"`. Migrations are **sequential** (1.0 → 1.1 → …)
 * and each step is an independently-testable pure function. Loading applies the
 * chain from the file's version up to {@link CURRENT_VF_VERSION}:
 *
 * - file version == current  → no migration
 * - file version  < current  → migrate step-by-step; if a step is missing the
 *   chain stops and the file is flagged **read-only** (we never guess)
 * - file version  > current  → **read-only** (a newer app wrote it; never write
 *   back and risk dropping fields we don't understand — forward compatibility)
 * - unparseable version       → **read-only**
 */
export const CURRENT_VF_VERSION = '1.0';

export interface VfVersion {
  readonly major: number;
  readonly minor: number;
}

export function parseVersion(value: unknown): VfVersion | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d+)\.(\d+)$/.exec(value);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]) };
}

/** -1 if a<b, 0 if equal, 1 if a>b (compare major, then minor). */
export function compareVersions(a: VfVersion, b: VfVersion): -1 | 0 | 1 {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  return 0;
}

/** A single forward migration `from → to`, applied to the raw envelope object. */
export interface Migration {
  readonly from: string;
  readonly to: string;
  migrate(file: Record<string, unknown>): Record<string, unknown>;
}

/** Built-in migrations. Empty in V1 (1.0 is current); 1.0→1.1 lands here later. */
export const MIGRATIONS: readonly Migration[] = [];

export interface MigrationResult {
  /** The (possibly migrated) envelope object. */
  readonly file: Record<string, unknown>;
  /** The version actually reached (current unless the chain stopped early). */
  readonly version: string;
  /** True when the file cannot be safely written back at the current schema. */
  readonly readOnly: boolean;
}

/**
 * Migrate `file` (declared at `fileVersion`) up to `target`. Pure; the migration
 * list is injectable so the framework can be tested without inventing real
 * versions. Never throws on version skew — it returns a `readOnly` flag instead.
 */
export function applyMigrations(
  file: Record<string, unknown>,
  fileVersion: unknown,
  target: string = CURRENT_VF_VERSION,
  migrations: readonly Migration[] = MIGRATIONS,
): MigrationResult {
  const targetV = parseVersion(target)!;
  const startV = parseVersion(fileVersion);

  if (startV === null) return { file, version: target, readOnly: true };

  const cmp = compareVersions(startV, targetV);
  if (cmp === 0) return { file, version: target, readOnly: false };
  if (cmp === 1) return { file, version: String(fileVersion), readOnly: true }; // newer than us

  // Older: walk the chain from the file's version toward the target. At most one
  // step per migration, so `migrations.length` iterations suffice; the top-of-loop
  // target check returns as soon as we arrive.
  let current = String(fileVersion);
  let working = file;
  for (let step = 0; step < migrations.length; step += 1) {
    if (current === target) return { file: working, version: current, readOnly: false };
    const next = migrations.find((m) => m.from === current);
    if (!next) break; // no path forward from here
    // Copy in (migrations are pure — never mutate the caller's object) and stamp
    // the reached version onto the result so the envelope and version agree.
    working = { ...next.migrate({ ...working }), version: next.to };
    current = next.to;
  }
  const done = current === target;
  return { file: working, version: current, readOnly: !done };
}
