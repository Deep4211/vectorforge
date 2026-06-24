#!/usr/bin/env node
/**
 * Dependency-boundary guardrail.
 *
 * Enforces — at the package.json level — the internal dependency DAG defined in
 * ARCHITECTURE.md §3.2 and docs/ENGINE_CONTRACT.md §6:
 *
 *   1. Every `@vectorforge/*` dependency a package declares must be in that
 *      package's allowed set.
 *   2. No package may depend on the application (`@vectorforge/web`).
 *   3. The resulting graph must be acyclic.
 *
 * This is the second of two independent guardrails; ESLint's `no-restricted-imports`
 * enforces the same rules at the source-import level (see eslint.config.js).
 *
 * Exit code 0 = clean, 1 = one or more violations.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PACKAGES_DIR = join(ROOT, 'packages');

/** Authoritative allowed-dependency map (kept in sync with eslint.config.js). */
const ALLOWED_DEPS = {
  shared: [],
  geometry: [],
  document: ['geometry', 'shared'],
  commands: ['document', 'geometry', 'shared'],
  editor: ['commands', 'document', 'geometry', 'shared'],
  renderer: ['document', 'geometry', 'shared'],
  persistence: ['document', 'shared'],
  ui: ['editor', 'shared'],
};

const SCOPE = '@vectorforge/';
const violations = [];
const graph = new Map();

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function internalDeps(pkgJson) {
  const fields = ['dependencies', 'peerDependencies', 'optionalDependencies'];
  const names = new Set();
  for (const field of fields) {
    for (const dep of Object.keys(pkgJson[field] ?? {})) {
      if (dep.startsWith(SCOPE)) names.add(dep.slice(SCOPE.length));
    }
  }
  return [...names];
}

const packageDirs = readdirSync(PACKAGES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

for (const name of packageDirs) {
  const pkgPath = join(PACKAGES_DIR, name, 'package.json');
  if (!existsSync(pkgPath)) {
    violations.push(`packages/${name} is missing package.json`);
    continue;
  }
  const pkg = readJson(pkgPath);
  const deps = internalDeps(pkg);
  graph.set(name, deps);

  const allowed = ALLOWED_DEPS[name];
  if (!allowed) {
    violations.push(`packages/${name} is not declared in the allowed dependency map`);
    continue;
  }

  for (const dep of deps) {
    if (dep === 'web') {
      violations.push(
        `packages/${name} depends on @vectorforge/web — packages must never import the app`,
      );
    } else if (!allowed.includes(dep)) {
      violations.push(
        `packages/${name} → @vectorforge/${dep} is not allowed (permitted: [${allowed.join(', ') || 'none'}])`,
      );
    }
  }
}

// Cycle detection (DFS with a recursion stack).
const WHITE = 0;
const GRAY = 1;
const BLACK = 2;
const color = new Map([...graph.keys()].map((k) => [k, WHITE]));

function visit(node, stack) {
  color.set(node, GRAY);
  for (const next of graph.get(node) ?? []) {
    if (!graph.has(next)) continue; // external or unknown handled above
    if (color.get(next) === GRAY) {
      violations.push(`Circular dependency: ${[...stack, node, next].join(' → ')}`);
    } else if (color.get(next) === WHITE) {
      visit(next, [...stack, node]);
    }
  }
  color.set(node, BLACK);
}

for (const node of graph.keys()) {
  if (color.get(node) === WHITE) visit(node, []);
}

if (violations.length > 0) {
  console.error('✖ Dependency boundary check failed:\n');
  for (const v of violations) console.error(`  - ${v}`);
  console.error(`\n${violations.length} violation(s). See docs/ENGINE_CONTRACT.md §6.`);
  process.exit(1);
}

console.log(`✓ Dependency boundaries OK (${graph.size} packages, acyclic, all edges permitted).`);
