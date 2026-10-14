import path from 'path'
import { defineConfig } from 'vitest/config'

/**
 * Database integration tests (`*.int.test.ts`). Run them through
 * `pnpm crm --local --test` (or `--staging --test`), which injects one verified
 * environment; test/integration/setup.ts refuses anything else, including
 * Production. Every test runs inside a transaction that is rolled back, so
 * nothing is left behind.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.int.test.ts'],
    exclude: ['**/node_modules/**'],
    setupFiles: ['./test/integration/setup.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
