#!/usr/bin/env node
/**
 * Package-standards guardrail.
 *
 * Every workspace member must follow the layout mandated in the Sprint 0 spec
 * and docs/ENGINE_CONTRACT.md §6:
 *
 *   src/                a public API entry at src/index.ts (libraries)
 *   tests/              co-located test directory
 *   README.md           explains the package's purpose
 *   package.json        scoped @vectorforge/* name, ESM, src-pointing exports
 *   tsconfig.json       project-reference config
 *
 * Exit code 0 = clean, 1 = one or more violations.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** [workspaceRelativeDir, isLibrary] — libraries must expose src/index.ts as their public API. */
const MEMBERS = [
  ['packages/shared', true],
  ['packages/geometry', true],
  ['packages/document', true],
  ['packages/commands', true],
  ['packages/editor', true],
  ['packages/renderer', true],
  ['packages/persistence', true],
  ['packages/ui', true],
  ['apps/web', false],
];

const violations = [];

function isDir(p) {
  return existsSync(p) && statSync(p).isDirectory();
}
function isFile(p) {
  return existsSync(p) && statSync(p).isFile();
}

for (const [rel, isLibrary] of MEMBERS) {
  const dir = join(ROOT, rel);
  const fail = (msg) => violations.push(`${rel}: ${msg}`);

  if (!isDir(join(dir, 'src'))) fail('missing src/ directory');
  if (!isDir(join(dir, 'tests'))) fail('missing tests/ directory');
  if (!isFile(join(dir, 'README.md'))) fail('missing README.md');
  if (!isFile(join(dir, 'tsconfig.json'))) fail('missing tsconfig.json');

  const pkgPath = join(dir, 'package.json');
  if (!isFile(pkgPath)) {
    fail('missing package.json');
    continue;
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  if (typeof pkg.name !== 'string' || !pkg.name.startsWith('@vectorforge/')) {
    fail(`package.json "name" must be scoped @vectorforge/* (got "${pkg.name}")`);
  }
  if (pkg.type !== 'module') {
    fail('package.json must set "type": "module"');
  }

  if (isLibrary) {
    if (!isFile(join(dir, 'src', 'index.ts'))) {
      fail('library must expose a public API at src/index.ts');
    }
    const expectsSrcIndex = (value) =>
      typeof value === 'string' && value.replace('./', '') === 'src/index.ts';
    const exportsEntry =
      pkg.exports && typeof pkg.exports === 'object' ? pkg.exports['.'] : undefined;
    const exportsDefault = typeof exportsEntry === 'string' ? exportsEntry : exportsEntry?.default;
    if (!expectsSrcIndex(pkg.main) && !expectsSrcIndex(exportsDefault)) {
      fail('package.json "main"/"exports" must point to ./src/index.ts (single public entry)');
    }
  }
}

if (violations.length > 0) {
  console.error('✖ Package standards check failed:\n');
  for (const v of violations) console.error(`  - ${v}`);
  console.error(`\n${violations.length} violation(s).`);
  process.exit(1);
}

console.log(`✓ Package standards OK (${MEMBERS.length} workspace members verified).`);
