import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/p07',
  testMatch: '**/*.spec.ts',
  globalTeardown: './tests/p07/teardown.mjs',
  workers: 1,
  fullyParallel: false,
  timeout: 60000,
  retries: 0,
  expect: { timeout: 15000 },
  reporter: [['list'], ['json', { outputFile: 'docs/verification/P07/browser-results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:5309',
    headless: true,
    viewport: { width: 1440, height: 1050 },
    locale: 'ar-EG',
    reducedMotion: 'reduce',
    trace: 'off',
    screenshot: 'off',
  },
  webServer: {
    command: 'node --import tsx tests/p07/serve.ts',
    env: { TSX_TSCONFIG_PATH: 'tsconfig.base.json' },
    url: 'http://127.0.0.1:4310/health',
    reuseExistingServer: false,
    timeout: 120000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 45000 },
  },
});
