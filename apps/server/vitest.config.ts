import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run tests sequentially inside each file so in-memory state is predictable
    sequence: { concurrent: false },
    environment: 'node',
    globals: true,
    // Each test file gets a fresh module registry — important for inMemoryDb isolation
    isolate: true,
    reporters: ['verbose'],
    include: ['src/**/*.test.ts'],
    exclude: ['dist/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/db/inMemoryDb.ts'],
    },
  },
  resolve: {
    alias: {
      // Mirror the tsconfig path so @anvaya/shared resolves during tests
    },
  },
});
