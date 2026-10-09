import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: [
      'tests/integration/p26/**/*.unit.test.{ts,tsx}',
      'tests/integration/p25/**/*.unit.test.{ts,tsx}',
      'tests/integration/p24/**/*.unit.test.{ts,tsx}',
      'tests/integration/p23/**/*.unit.test.{ts,tsx}',
      'tests/integration/p22/**/*.unit.test.{ts,tsx}',
      'tests/integration/p21/**/*.unit.test.{ts,tsx}',
      'tests/integration/p20/**/*.unit.test.{ts,tsx}',
      'tests/integration/p19/**/*.unit.test.{ts,tsx}',
      'tests/integration/p18/**/*.unit.test.{ts,tsx}',
      'tests/integration/p17/**/*.unit.test.{ts,tsx}',
      'tests/integration/p16/**/*.unit.test.ts',
      'tests/integration/p15/**/*.unit.test.ts',
      'tests/integration/p14/**/*.unit.test.ts',
      'tests/unit/**/*.test.{ts,tsx}',
      'tests/integration/p11/**/*.unit.test.ts',
      'tests/integration/p12/**/*.unit.test.ts',
      'tests/integration/p13/**/*.unit.test.ts',
    ],
    environment: 'jsdom',
    setupFiles: ['tests/unit/setup.ts'],
    passWithNoTests: false,
    reporters: ['default'],
    testTimeout: 10000,
  },
});
