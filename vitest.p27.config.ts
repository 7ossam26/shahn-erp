import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['tests/integration/p27/**/*.unit.test.ts', 'tests/integration/p27/**/*.db.test.ts'],
    environment: 'node',
    passWithNoTests: false,
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 90000,
    hookTimeout: 120000,
    reporters: ['default'],
  },
});
