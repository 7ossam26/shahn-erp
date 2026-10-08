import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
test('real ERP API recovery states at desktop/mobile widths, expired detail, keyboard and revoked cached access', async ({
  page,
  request,
}) => {
  const f = JSON.parse(await readFile('tests/.p22-runtime.json', 'utf8'));
  await page.goto('/api/test/p22-login');
  await expect(page.getByRole('heading', { name: 'استرداد الربط', exact: true })).toBeVisible();
  await expect(page.getByText('التاريخ غير مكتمل؛ لا تثبت الحالة الحالية')).toBeVisible();
  for (const [width, height] of [
    [1440, 1050],
    [390, 844],
    [320, 844],
    [768, 1050],
  ]) {
    await page.setViewportSize({ width: width!, height: height! });
    await expect(page.getByRole('button', { name: 'استرداد أحداث المسار' }).first()).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: `docs/verification/P22/screenshots/recovery-${width}.png`,
      fullPage: true,
    });
  }
  await page.goto('/integration/recovery/jobs/' + f.jobId);
  await expect(page.getByRole('heading', { name: 'التاريخ غير متاح', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'إعادة نفس المهمة' })).toHaveCount(0);
  await page.getByText('دليل الاسترداد والتشخيص').click();
  await page.screenshot({
    path: 'docs/verification/P22/screenshots/expired-detail.png',
    fullPage: true,
  });
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
  const revoked = await request.get('http://127.0.0.1:4424/revoke', {
    headers: { 'x-test-secret': f.secret },
  });
  expect(revoked.ok()).toBe(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'التاريخ غير متاح', exact: true })).toHaveCount(0);
  const denied = await page.request.get(
    '/api/v1/integration/recovery/jobs/' + f.jobId + '?companyId=' + f.companyId,
  );
  expect(denied.status()).toBe(401);
  expect((await denied.json()).code).toBe('AUTHENTICATION_REQUIRED');
  await page.screenshot({
    path: 'docs/verification/P22/screenshots/revoked-access.png',
    fullPage: true,
  });
});
