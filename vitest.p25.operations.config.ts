import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/p25/*.operations.test.ts'],
    passWithNoTests: false,
    fileParallelism: false,
  },
});
