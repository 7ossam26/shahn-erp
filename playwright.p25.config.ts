import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/integration/p25',
  testMatch: '**/*.spec.ts',
  workers: 1,
  retries: 0,
  timeout: 90000,
  expect: { timeout: 20000 },
  reporter: [['list'], ['json', { outputFile: 'docs/verification/P25/browser-results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:5425',
    headless: true,
    locale: 'ar-EG',
    timezoneId: 'Africa/Cairo',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node --import tsx tests/integration/p25/serve.ts',
    env: { TSX_TSCONFIG_PATH: 'tsconfig.base.json' },
    url: 'http://127.0.0.1:5425/api/v1/operations',
    timeout: 180000,
    reuseExistingServer: false,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 45000 },
  },
});
