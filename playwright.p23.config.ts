import { defineConfig } from '@playwright/test';
export default defineConfig({
  outputDir: 'test-results/p23',
  testDir: './tests/integration/p23',
  testMatch: '**/*.spec.ts',
  globalTeardown: './tests/integration/p23/teardown.mjs',
  workers: 1,
  fullyParallel: false,
  timeout: 120000,
  retries: 0,
  expect: { timeout: 20000 },
  reporter: [['list'], ['json', { outputFile: 'docs/verification/P23/browser-results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:5423',
    headless: true,
    viewport: { width: 1440, height: 1050 },
    locale: 'ar-EG',
    timezoneId: 'Africa/Cairo',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...(process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH']
      ? { launchOptions: { executablePath: process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'] } }
      : {}),
  },
  webServer: {
    command: 'node --import tsx tests/integration/p23/serve.ts',
    env: { TSX_TSCONFIG_PATH: 'tsconfig.base.json' },
    url: 'http://127.0.0.1:4426/health',
    reuseExistingServer: false,
    timeout: 180000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 45000 },
  },
});
