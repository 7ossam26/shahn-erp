import { test, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
test.beforeEach(async ({ context }) => {
  const runtime = JSON.parse(await readFile('tests/.p03-runtime.json', 'utf8'));
  await context.addCookies([
    {
      name: 'erp_session',
      value: runtime.token,
      url: 'http://127.0.0.1:5293',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    },
  ]);
});
test('manual entry selects only the isolated fixture session', async ({ page, context }) => {
  await context.clearCookies();
  await page.goto('/api/test/kernel-login');
  await expect(page).toHaveURL(/\/development\/kernel$/);
  await expect(page.getByRole('button', { name: 'ابدأ محفظة اختبار' })).toBeEnabled();
});
for (const width of [390, 1440, 320, 768])
  test(`connected trial at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1440 ? 1050 : 844 });
    await page.goto('/development/kernel');
    await page.getByRole('button', { name: 'ابدأ محفظة اختبار' }).click();
    await expect(page.getByTestId('wallet-eligibleToPay')).toHaveText('100.00 ج.م');
    await page.getByLabel('المبلغ بالجنيه').fill('٥٠');
    await page.getByRole('button', { name: 'احجز غطاء شحن' }).click();
    await expect(page.getByTestId('wallet-cover')).toHaveText('50.00 ج.م');
    await expect(page.getByTestId('wallet-eligibleToPay')).toHaveText('50.00 ج.م');
    await expect(page.getByTestId('wallet-pending')).toHaveText('250.00 ج.م');
    await page.getByLabel('المبلغ بالجنيه').fill('60');
    await page.getByRole('button', { name: 'جرّب تخصيص صرف' }).click();
    await expect(page.getByRole('alert')).toContainText('الرصيد المؤهل لا يكفي');
    await expect(page.getByRole('alert')).toBeFocused();
    await expect(page.getByLabel('المبلغ بالجنيه')).toHaveValue('60');
    await mkdir('docs/verification/P03/screenshots', { recursive: true });
    await page.screenshot({
      path: `docs/verification/P03/screenshots/insufficient-${width}.png`,
      fullPage: true,
    });
    await page.getByLabel('المبلغ بالجنيه').fill('50');
    await page.getByRole('button', { name: 'طبّق الرسم واستهلك الغطاء' }).click();
    await expect(page.getByTestId('wallet-cover')).toHaveText('0.00 ج.م');
    await expect(page.getByTestId('wallet-eligibleToPay')).toHaveText('50.00 ج.م');
    await page.reload();
    await expect(page.getByTestId('wallet-eligibleToPay')).toHaveText('50.00 ج.م');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: `docs/verification/P03/screenshots/recovered-${width}.png`,
      fullPage: true,
    });
  });
test('lost HTTP response blocks new writes until authorized recovery', async ({ page }) => {
  await page.goto('/development/kernel');
  await page.route('**/api/v1/kernel/commands', async (route) => {
    await route.fetch();
    await route.abort('failed');
  });
  await page.getByRole('button', { name: 'ابدأ محفظة اختبار' }).click();
  await expect(page.getByRole('alert')).toContainText('لم تصل نتيجة مؤكدة');
  await expect(page.getByRole('button', { name: 'ابدأ محفظة اختبار' })).toBeDisabled();
  await page.getByRole('button', { name: 'استرد نتيجة الطلب' }).click();
  await expect(page.getByTestId('wallet-eligibleToPay')).toHaveText('100.00 ج.م');
  await expect(page.getByRole('button', { name: 'احجز غطاء شحن' })).toBeEnabled();
});
