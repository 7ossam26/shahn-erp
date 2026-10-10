import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globalSetup: ['tests/integration/p27/publisher-setup.mjs'],
    include: ['tests/integration/p27/**/*.public.test.ts'],
    environment: 'node',
    passWithNoTests: false,
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 120000,
    hookTimeout: 120000,
    reporters: ['default'],
  },
});
