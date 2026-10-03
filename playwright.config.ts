import { defineConfig } from '@playwright/test';
export default defineConfig({
  globalTeardown: './tests/browser/teardown.mjs',
  testDir: './tests/browser',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  expect: { timeout: 10000 },
  retries: 0,
  reporter: [
    ['list'],
    [
      'json',
      {
        outputFile: process.env['P01_RESULT_FILE'] ?? 'docs/verification/P01/browser-results.json',
      },
    ],
  ],
  use: {
    baseURL: 'http://127.0.0.1:5201',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'ar-EG',
    reducedMotion: 'reduce',
  },
  webServer: {
    command: 'node tests/browser/serve.mjs',
    url: 'http://127.0.0.1:4202/health',
    reuseExistingServer: false,
    timeout: 90000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10000 },
  },
});
