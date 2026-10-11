import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/integration/p27',
  testMatch: 'returned-parcel.spec.ts',
  globalTeardown: './tests/integration/p27/returned-parcel-teardown.mjs',
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5351',
    headless: true,
    locale: 'ar-EG',
    timezoneId: 'Africa/Cairo',
    reducedMotion: 'reduce',
  },
  webServer: {
    command: 'node --import tsx tests/integration/p27/returned-parcel-serve.ts',
    env: { TSX_TSCONFIG_PATH: 'tsconfig.base.json' },
    url: 'http://127.0.0.1:4352/health',
    reuseExistingServer: false,
    timeout: 120000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 45000 },
  },
});
