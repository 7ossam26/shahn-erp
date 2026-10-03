import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['tests/diagnostics/controlled-failure.test.ts'],
    environment: 'node',
    passWithNoTests: false,
  },
});
