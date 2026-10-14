import path from 'path'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // Database integration tests run separately: `pnpm test:integration`.
    exclude: [...configDefaults.exclude, '**/*.int.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
