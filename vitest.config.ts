import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Use jsdom for browser-like environment
    environment: 'jsdom',

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '.wxt/',
        '.output/',
        '**/*.config.*',
        '**/dist/**',
        'entrypoints/**', // Exclude UI and service worker code (tested via E2E)
        '.eslintrc.cjs' // Exclude ESLint config from coverage
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    },

    // Test match patterns
    include: ['tests/unit/**/*.test.{js,ts}'],

    // Setup files
    setupFiles: ['./tests/setup.ts']
  },

  // Path aliases (must match tsconfig.json)
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './utils')
    }
  }
});
