// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

/**
 * Single source of truth for the internal dependency graph (DAG).
 * Mirrors ARCHITECTURE.md §3.2 and docs/ENGINE_CONTRACT.md §6.
 * The same map is enforced at the package.json level by
 * scripts/check-boundaries.mjs — two independent guardrails.
 */
const ALLOWED_DEPS = /** @type {const} */ ({
  shared: [],
  geometry: [],
  document: ['geometry', 'shared'],
  commands: ['document', 'geometry', 'shared'],
  editor: ['commands', 'document', 'geometry', 'shared'],
  renderer: ['document', 'geometry', 'shared'],
  persistence: ['document', 'shared'],
  ui: ['editor', 'shared'],
});

const ALL_PACKAGES = Object.keys(ALLOWED_DEPS);
const CORE_PACKAGES = [
  'geometry',
  'document',
  'commands',
  'editor',
  'renderer',
  'persistence',
  'shared',
];

/**
 * DEP-5: a cross-package import must target the public entry `@vectorforge/<pkg>`,
 * never a deep path into another package's `src`. This regex matches any specifier
 * with a path segment after the package name (e.g. `@vectorforge/geometry/src/x`)
 * while allowing the bare public entry. Applied to every workspace member.
 */
const DEEP_IMPORT_PATTERN = {
  regex: '^@vectorforge/[^/]+/.+',
  message:
    'DEP-5: import a package only through its public entry @vectorforge/<pkg>, never a deep path into its src. See docs/ENGINE_CONTRACT.md §6.2.',
};

/**
 * Build one `no-restricted-imports` rule per package. Flat-config does NOT merge
 * the `patterns` array across blocks (last match wins), so each package's single
 * rule must carry every restriction at once. It forbids:
 *   1. any @vectorforge/* package outside that package's allowed dependency set;
 *   2. (for framework-independent core packages) React and any react-* library;
 *   3. deep imports past any package's public entry (DEP-5).
 */
const boundaryConfigs = ALL_PACKAGES.map((pkg) => {
  const allowed = ALLOWED_DEPS[pkg];
  const forbiddenInternal = ALL_PACKAGES.filter((p) => p !== pkg && !allowed.includes(p)).map(
    (p) => `@vectorforge/${p}`,
  );
  forbiddenInternal.push('@vectorforge/web');

  const patterns = forbiddenInternal.map((name) => ({
    group: [name, `${name}/*`],
    message: `Illegal dependency: packages/${pkg} may import only [${allowed.join(', ') || 'none'}]. See docs/ENGINE_CONTRACT.md §6.`,
  }));

  if (CORE_PACKAGES.includes(pkg)) {
    patterns.push({
      group: ['react', 'react-dom', 'react-dom/*', 'react/*', 'react-*'],
      message:
        'Core packages must stay framework-independent (ARCHITECTURE.md §1.5). React is permitted only in packages/ui and apps/web.',
    });
  }

  patterns.push(DEEP_IMPORT_PATTERN);

  return {
    files: [`packages/${pkg}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': ['error', { patterns }],
    },
  };
});

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/*.tsbuildinfo',
      '.husky/_/**',
      'pnpm-lock.yaml',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
  // Per-package dependency boundaries + framework-independence guard.
  ...boundaryConfigs,
  // The app may import any package, but only through public entries (DEP-5).
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [DEEP_IMPORT_PATTERN] }],
    },
  },
  // React presentation layer (the ONLY place React is allowed).
  {
    files: ['packages/ui/**/*.{ts,tsx}', 'apps/web/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  // Node tooling, scripts and config files.
  {
    files: ['**/*.{js,mjs,cjs}', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
);
