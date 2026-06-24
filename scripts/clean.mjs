#!/usr/bin/env node
/**
 * Removes all build/test artifacts across the workspace:
 * dist/, coverage/, and *.tsbuildinfo files under packages/* and apps/*.
 */
import { rmSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

function memberDirs() {
  const groups = ['packages', 'apps'];
  const dirs = [];
  for (const group of groups) {
    const base = join(ROOT, group);
    if (!existsSync(base)) continue;
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      if (entry.isDirectory()) dirs.push(join(base, entry.name));
    }
  }
  return dirs;
}

const removed = [];
function remove(path) {
  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true });
    removed.push(path.replace(`${ROOT}/`, ''));
  }
}

remove(join(ROOT, 'coverage'));
for (const dir of memberDirs()) {
  remove(join(dir, 'dist'));
  remove(join(dir, 'coverage'));
  for (const entry of existsSync(dir) ? readdirSync(dir) : []) {
    if (entry.endsWith('.tsbuildinfo')) remove(join(dir, entry));
  }
}

console.log(removed.length ? `Cleaned:\n  ${removed.join('\n  ')}` : 'Nothing to clean.');
