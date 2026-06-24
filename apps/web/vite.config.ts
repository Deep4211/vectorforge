import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

/**
 * Composition root build config.
 *
 * - `@vitejs/plugin-react` enables Fast Refresh and the React 19 JSX runtime.
 * - `@tailwindcss/vite` is the Tailwind v4 (zero-config) plugin.
 * - `vite-tsconfig-paths` resolves the `@vectorforge/*` aliases from
 *   tsconfig.base.json directly to package source — no per-package build step.
 */
export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
