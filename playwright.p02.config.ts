import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/p02',
  testMatch: '**/*.spec.ts',
  globalTeardown: './tests/p02/teardown.mjs',
  workers: 1,
  fullyParallel: false,
  timeout: 60000,
  expect: { timeout: 15000 },
  retries: 0,
  reporter: [['./tests/p02/safe-reporter.ts'],['list'], ['json', { outputFile: 'docs/verification/P02/browser-results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:5291',
    headless: true,
    locale: 'ar-EG',
    reducedMotion: 'reduce',
    trace: 'off',
    screenshot: 'off',
  },
  webServer: {
    command: 'node --import tsx tests/p02/serve.ts',
    url: 'http://127.0.0.1:4292/health',
    reuseExistingServer: false,
    timeout: 150000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10000 },
  },
});
