import path from 'path'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    exclude: ['node_modules', 'playwright', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        '.next/**',
        'playwright/**',
        '**/*.config.*',
        '**/index.ts',
        'src/__tests__/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      // App alias
      '@': path.resolve(__dirname, './src'),
      // Workspace packages — resolve to source directly so Vitest doesn't need built dist/
      '@sage/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
      '@sage/db': path.resolve(__dirname, '../../packages/db/src/index.ts'),
    },
  },
})
