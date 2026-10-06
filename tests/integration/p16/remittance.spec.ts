import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
test('real API/DB remittance preserves components on refresh, blocks gaps and recovers an unknown committed result', async ({
  page,
  request,
}) => {
  const f = JSON.parse(readFileSync('tests/.p16-runtime.json', 'utf8')) as {
    companyId: string;
    roundId: string;
    driverId: string;
    branchId: string;
    accounts: string[];
    secret: string;
  };
  const url =
    '/remittances/review?roundId=' +
    f.roundId +
    '&driverId=' +
    f.driverId +
    '&branchId=' +
    f.branchId;
  await page.goto('/api/test/p16-login/admin');
  await page.goto('/remittances?branchId=' + f.branchId + '&state=unremitted');
  const trialRound = page.getByRole('article').filter({ hasText: f.roundId });
  await expect(trialRound.getByRole('link', { name: 'مراجعة أدلة الجولة' })).toBeVisible();
  await trialRound.getByRole('link', { name: 'مراجعة أدلة الجولة' }).click();
  await page.getByRole('link', { name: 'العودة للجولات' }).click();
  await expect(page).toHaveURL(/state=unremitted/);
  await page.goto(url);
  await page.getByRole('button', { name: 'تحديث أدلة الجولة' }).click();
  await expect(page.getByText('الأدلة المستلمة متطابقة', { exact: false })).toBeVisible();
  await page.getByLabel('الحساب المستلم').selectOption(f.accounts[0]!);
  await page.getByLabel('المبلغ بالجنيه').fill('800');
  await page.getByRole('button', { name: 'إضافة طريقة أو حساب' }).click();
  await page.getByLabel('طريقة الاستلام').nth(1).selectOption('instapay');
  await page.getByLabel('الحساب المستلم').nth(1).selectOption(f.accounts[1]!);
  await page.getByLabel('المبلغ بالجنيه').nth(1).fill('199');
  await page.getByRole('checkbox').check();
  await expect(page.getByRole('button', { name: 'تأكيد استلام كامل أموال الجولة' })).toBeDisabled();
  await request.get('http://127.0.0.1:4362/mode/gap', { headers: { 'x-test-secret': f.secret } });
  await page.getByRole('button', { name: 'تحديث أدلة الجولة' }).click();
  await expect(page.getByRole('alert').first()).toBeVisible();
  await expect(page.getByLabel('المبلغ بالجنيه').first()).toHaveValue('800');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'docs/verification/P16/screenshots/gap-390.png', fullPage: true });
  await request.get('http://127.0.0.1:4362/mode/ok', { headers: { 'x-test-secret': f.secret } });
  await page.getByRole('button', { name: 'تحديث أدلة الجولة' }).click();
  await expect(page.getByText('الأدلة المستلمة متطابقة', { exact: false })).toBeVisible();
  await page.getByLabel('المبلغ بالجنيه').nth(1).fill('200');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1050 : 844 });
    await page.screenshot({
      path: `docs/verification/P16/screenshots/review-${width}.png`,
      fullPage: true,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.getByRole('checkbox').check();
  await page.route('**/api/v1/finance/remittances/commands', async (route) => {
    await route.fetch();
    await route.abort('failed');
  });
  await page.getByRole('button', { name: 'تأكيد استلام كامل أموال الجولة' }).click();
  await expect(page.getByRole('button', { name: 'استرداد نتيجة الطلب' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'استرداد نتيجة الطلب' }).click();
  await expect(page).toHaveURL(/\/remittances\/[a-f0-9-]+$/);
  await expect(page.getByText(/850.*ج.م/)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'docs/verification/P16/screenshots/received-390.png',
    fullPage: true,
  });
  await request.get('http://127.0.0.1:4362/correction', { headers: { 'x-test-secret': f.secret } });
  await page.reload();
  await expect(page.getByText('وصلت حقائق لاحقة تحتاج مراجعة')).toBeVisible();
  await page.screenshot({
    path: 'docs/verification/P16/screenshots/review-required-390.png',
    fullPage: true,
  });
  const detailUrl = page.url();
  await page.goto('/api/test/p16-login/staffB');
  await page.goto(detailUrl);
  await expect(page.getByRole('alert')).toBeVisible();
});
