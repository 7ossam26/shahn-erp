import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: [
      'tests/db/**/*.test.ts',
      'tests/integration/p11/**/*.db.test.ts',
      'tests/integration/p12/**/*.db.test.ts',
      'tests/integration/p13/**/*.db.test.ts',
    ],
    environment: 'node',
    passWithNoTests: false,
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: process.env['SHAHN_TEST_PG_BIN'] ? 90000 : 30000,
    hookTimeout: 90000,
    reporters: ['default'],
  },
});
