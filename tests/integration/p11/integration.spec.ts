import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const ids = () =>
  JSON.parse(readFileSync('tests/.p11-runtime.json', 'utf8')) as {
    companyId: string;
    actionId: string;
    eventId: string;
  };
test('Arabic RTL status, unknown request and receipt/application distinction at four widths', async ({
  page,
}) => {
  await page.goto('/api/test/p11-login/admin');
  await expect(page.getByRole('heading', { name: 'حالة الربط', exact: true })).toBeVisible();
  await expect(page.locator('.state-unknown')).toHaveText('النتيجة غير معروفة');
  await expect(page.getByText('تم الاستلام · بانتظار التطبيق')).toBeVisible();
  for (const width of [1440, 390, 320, 768]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1050 : 844 });
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: `docs/verification/P11/screenshots/status-${width}.png`,
      fullPage: true,
    });
  }
});
test('unknown command detail retries the same action and shows safe correlation metadata', async ({
  page,
}) => {
  await page.goto('/api/test/p11-login/admin');
  await page.goto('/integration/commands/' + ids().actionId);
  await expect(page.getByRole('heading', { name: 'تفاصيل الطلب' })).toBeVisible();
  await expect(page.getByText(ids().actionId, { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'docs/verification/P11/screenshots/unknown-390.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'إعادة المحاولة بنفس الطلب' }).click();
  await expect(page.getByText('في انتظار الإرسال', { exact: true })).toBeVisible();
  expect(page.url()).toContain(ids().actionId);
  expect(await page.locator('body').innerText()).not.toMatch(/twp_|secretHash|secretHex/);
});
test('provisions a native branch and preserves a lost native response across reload', async ({
  page,
}) => {
  await page.goto('/api/test/p11-login/admin');
  await page.goto('/integration/provision');
  await page.getByLabel('السجل المحلي', { exact: true }).selectOption({ label: 'الفرع ب' });
  let actionId = '';
  await page.route('**/api/v1/integration/commands', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    const response = await route.fetch();
    const result = await response.json();
    actionId = result.actionId;
    await route.abort('failed');
  });
  await page.getByRole('button', { name: 'حفظ طلب الربط' }).click();
  await expect(page.getByRole('alert')).toContainText('لم تصل نتيجة الطلب');
  await expect(page.getByRole('button', { name: 'استرداد نفس الطلب' })).toBeVisible();
  await page.reload();
  await page.unroute('**/api/v1/integration/commands');
  await expect(page.getByRole('button', { name: 'استرداد نفس الطلب' })).toBeVisible();
  await page.getByRole('button', { name: 'استرداد نفس الطلب' }).click();
  await expect(page.getByRole('button', { name: 'استرداد نفس الطلب' })).toHaveCount(0);
  await page.goto('/integration/commands/' + actionId);
  await expect(page.getByText('في انتظار الإرسال', { exact: true })).toBeVisible();
  await page.screenshot({
    path: 'docs/verification/P11/screenshots/provisioned-1440.png',
    fullPage: true,
  });
});
test('filters persist in URL and receipt detail never claims application', async ({ page }) => {
  await page.goto('/api/test/p11-login/admin');
  await page.getByText('فلاتر المتابعة', { exact: true }).click();
  await page.getByLabel('الحالة', { exact: true }).selectOption('rejected');
  await expect(page.getByText('لا توجد طلبات مطابقة.')).toBeVisible();
  expect(page.url()).toContain('state=rejected');
  await page.reload();
  await expect(page.getByText('لا توجد طلبات مطابقة.')).toBeVisible();
  await page.goto('/integration/events/' + ids().eventId);
  await expect(page.getByText('بانتظار التطبيق', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /إعادة المحاولة/ })).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.screenshot({
    path: 'docs/verification/P11/screenshots/event-320.png',
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('real API denies a session without integration capability', async ({ page }) => {
  await page.goto('/api/test/p11-login/staff');
  await expect(page.getByRole('alert')).toContainText('صلاحياتك الحالية');
  // Chromium honors the HttpOnly Secure localhost test cookie; use its authenticated context.
  const status = await page.evaluate(
    (url) => fetch(url).then((r) => r.status),
    '/api/v1/integration?companyId=' + ids().companyId,
  );
  expect(status).toBe(403);
});
