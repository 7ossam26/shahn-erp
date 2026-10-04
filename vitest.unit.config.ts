import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: [
      'tests/unit/**/*.test.{ts,tsx}',
      'tests/integration/p11/**/*.unit.test.ts',
      'tests/integration/p12/**/*.unit.test.ts',
    ],
    environment: 'jsdom',
    setupFiles: ['tests/unit/setup.ts'],
    passWithNoTests: false,
    reporters: ['default'],
    testTimeout: 10000,
  },
});
