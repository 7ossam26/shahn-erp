import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['tests/integration/p12/*.public.test.ts'],
    environment: 'node',
    passWithNoTests: false,
    fileParallelism: false,
    testTimeout: 180000,
    reporters: ['default'],
  },
});
