import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/p05',
  testMatch: '**/*.spec.ts',
  globalTeardown: './tests/p05/teardown.mjs',
  workers: 1,
  fullyParallel: false,
  timeout: 60000,
  retries: 0,
  expect: { timeout: 15000 },
  reporter: [['list'], ['json', { outputFile: 'docs/verification/P05/browser-results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:5297',
    headless: true,
    locale: 'ar-EG',
    reducedMotion: 'reduce',
    trace: 'off',
    screenshot: 'off',
  },
  webServer: {
    command: 'node --import tsx tests/p05/serve.ts',
    env: { TSX_TSCONFIG_PATH: 'tsconfig.base.json' },
    url: 'http://127.0.0.1:4298/health',
    reuseExistingServer: false,
    timeout: 120000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 45000 },
  },
});
