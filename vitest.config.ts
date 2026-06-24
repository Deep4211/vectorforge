import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

/**
 * Root Vitest configuration.
 *
 * Two test "projects" isolate environments by layer:
 *   - `core` runs framework-independent packages under Node (no DOM).
 *   - `dom`  runs the React presentation layer (packages/ui, apps/web) under jsdom.
 *
 * `vite-tsconfig-paths` resolves the `@vectorforge/*` aliases declared in
 * tsconfig.base.json straight to package source, so tests run against the
 * latest source with no intermediate build step.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    projects: [
      {
        plugins: [tsconfigPaths()],
        test: {
          name: 'core',
          environment: 'node',
          include: [
            'packages/{geometry,document,commands,editor,renderer,persistence,shared}/tests/**/*.test.ts',
          ],
          benchmark: {
            include: ['packages/*/tests/**/*.bench.ts'],
          },
        },
      },
      {
        plugins: [tsconfigPaths()],
        test: {
          name: 'dom',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./vitest.setup.ts'],
          include: ['packages/ui/tests/**/*.test.{ts,tsx}', 'apps/web/tests/**/*.test.{ts,tsx}'],
          benchmark: {
            include: [],
          },
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['packages/*/src/**/*.{ts,tsx}', 'apps/web/src/**/*.{ts,tsx}'],
      exclude: ['**/index.ts', '**/*.d.ts', '**/types.ts', '**/tool.ts'],
    },
  },
});
