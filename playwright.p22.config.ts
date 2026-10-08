import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/integration/p22',
  testMatch: '**/*.spec.ts',
  globalTeardown: './tests/integration/p22/teardown.mjs',
  workers: 1,
  fullyParallel: false,
  timeout: 120000,
  retries: 0,
  expect: { timeout: 15000 },
  reporter: [['list'], ['json', { outputFile: 'docs/verification/P22/browser-results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:5422',
    headless: true,
    viewport: { width: 1440, height: 1050 },
    locale: 'ar-EG',
    timezoneId: 'Africa/Cairo',
    reducedMotion: 'reduce',
    trace: 'off',
    screenshot: 'off',
    ...(process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH']
      ? { launchOptions: { executablePath: process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'] } }
      : {}),
  },
  webServer: {
    command: 'node --import tsx tests/integration/p22/serve.ts',
    env: { TSX_TSCONFIG_PATH: 'tsconfig.base.json' },
    url: 'http://127.0.0.1:4424/health',
    reuseExistingServer: false,
    timeout: 180000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 45000 },
  },
});
