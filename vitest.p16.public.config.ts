import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['tests/integration/p16/**/*.public.test.ts'],
    environment: 'node',
    passWithNoTests: false,
    testTimeout: 120000,
    reporters: ['default'],
  },
});
