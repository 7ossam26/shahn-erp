import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['tests/integration/p22/*.acceptance.test.ts'],
    environment: 'node',
    passWithNoTests: false,
    testTimeout: 90000,
    reporters: ['default'],
  },
});
