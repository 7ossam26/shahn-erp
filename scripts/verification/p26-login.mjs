import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

if (process.env.APP_ENV !== 'test' || process.env.P26_APPROVED_ISOLATION !== 'true')
  throw Error('P26_APPROVED_ISOLATED_LOGIN_REQUIRED');
const state = JSON.parse(readFileSync('/run/p26/pilot-state.json', 'utf8'));
if (state.origin !== 'https://app.switch2tech.cloud:25426')
  throw Error('P26_PILOT_ORIGIN_REQUIRED');
mkdirSync('/run/p26/evidence/screenshots', { recursive: true });
const browser = await chromium.launch({ headless: true });
const evidence = { origin: state.origin, issuerLogins: [], passed: false };
try {
  for (const role of ['admin', 'staff-a', 'staff-b', 'staff-ab']) {
    const user = state.users.find((u) => u.role === role);
    const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
    try {
      const start = await context.request.post(state.origin + '/api/v1/access/login', {
        headers: { Origin: state.origin },
        data: {
          companyCode: state.companyCode.toLowerCase(),
          username: role,
          support: false,
          returnPath: '/',
        },
      });
      if (start.status() !== 200) throw Error('P26_LOGIN_START_' + start.status());
      const page = await context.newPage();
      await page.goto((await start.json()).url);
      await page.locator('#username').fill(user.username);
      await page.locator('#password').fill(user.password);
      await page.locator('#kc-login').click();
      await page.waitForURL(state.origin + '/', { timeout: 30000 });
      const response = await context.request.get(state.origin + '/api/v1/access/session');
      if (response.status() !== 200) throw Error('P26_AUTHENTICATED_SESSION_' + response.status());
      const session = await response.json();
      if (session.principalId !== user.principalId || session.companyId !== state.companyId)
        throw Error('P26_ISSUER_BINDING_MISMATCH');
      evidence.issuerLogins.push({ role, subject: user.subject, principalId: session.principalId });
      await context.storageState({ path: '/run/p26/erp-' + role + '-browser.json' });
      writeFileSync('/run/p26/erp-' + role + '-session.json', JSON.stringify(session), {
        mode: 0o600,
      });
      if (role === 'admin') {
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({
          path: '/run/p26/evidence/screenshots/home-1440.png',
          fullPage: true,
        });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.screenshot({
          path: '/run/p26/evidence/screenshots/home-390.png',
          fullPage: true,
        });
      }
    } finally {
      await context.close();
    }
  }
  evidence.passed = true;
} catch (error) {
  evidence.failure =
    error instanceof Error && /^P26_[A-Z_]+[0-9]*$/.test(error.message)
      ? error.message
      : 'P26_ISSUER_BROWSER_LOGIN_FAILED';
  process.exitCode = 1;
} finally {
  await browser.close();
  writeFileSync('/run/p26/evidence/issuer-login.json', JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
}
