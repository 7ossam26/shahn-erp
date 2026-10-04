import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const runtime = async () =>
  JSON.parse(await readFile('tests/.p12-runtime.json', 'utf8')) as {
    secret: string;
    companyId: string;
    ordinary: { reference: string };
    paid: { reference: string };
    long: { reference: string };
    unknownId: string;
    driverId: string;
  };
const control = async (path: string) => {
  const f = await runtime();
  return fetch('http://127.0.0.1:4322' + path, { headers: { 'x-test-secret': f.secret } });
};
test.beforeEach(async ({ page }) => {
  await page.goto('/api/test/p12-login/admin');
  await expect(
    page.getByRole('heading', { name: 'تسليم الشحنات للمندوب', exact: true }),
  ).toBeVisible();
});
test('responsive RTL, long recipient, blockers and preserved OR/AND filters', async ({ page }) => {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1050 : 844 });
    await expect(page.getByText('شحنة لم يكتمل تجهيزها', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `docs/verification/P12/screenshots/selection-${width}.png`,
      fullPage: true,
    });
  }
  await page.getByRole('button', { name: /فلاتر متقدمة/ }).click();
  await page.getByLabel('بانتظار التجهيز', { exact: true }).check();
  await expect(page.getByText('شحنة لم يكتمل تجهيزها', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'أحمد — شحنة عادية' })).toHaveCount(0);
  // URL navigation commits the controlled value asynchronously; assert its settled state.
  await page.getByLabel('جاهزة', { exact: true }).click();
  await expect(page.getByLabel('جاهزة', { exact: true })).toBeChecked();
  await expect(page.getByRole('heading', { name: 'أحمد — شحنة عادية' })).toBeVisible();
  await page.getByLabel('تجهيز الشركة', { exact: true }).click();
  await expect(page.getByLabel('تجهيز الشركة', { exact: true })).toBeChecked();
  await expect(page.getByRole('heading', { name: 'أحمد — شحنة عادية' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'شحنة لم يكتمل تجهيزها' })).toBeVisible();
  await page.getByRole('button', { name: 'مسح الفلاتر' }).click();
});
test('preparation stays separate from receipt and reserves cover only on physical confirmation', async ({
  page,
}) => {
  const f = await runtime();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole('checkbox', { name: 'اختيار الشحنة ' + f.paid.reference, exact: true })
    .check();
  await page.getByLabel('المندوب', { exact: true }).selectOption(f.driverId);
  await page.getByRole('button', { name: 'مراجعة التحضير', exact: true }).click();
  await page.getByRole('button', { name: 'تأكيد التحضير للمندوب' }).click();
  await expect(page).toHaveURL(/\/dispatch\/[a-f0-9-]+$/);
  expect((await (await control('/wallet')).json()).cover).toBe('0');
  await control('/advance');
  await page.getByRole('button', { name: 'تحديث الحالة' }).click();
  await expect(page.getByRole('heading', { name: 'مُحضّر للمندوب — لم يُسلّم' })).toBeVisible();
  await page.screenshot({
    path: 'docs/verification/P12/screenshots/prepared-390.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'مراجعة التسليم الفعلي' }).click();
  await expect(page.getByRole('button', { name: 'تأكيد استلام المندوب' })).toBeDisabled();
  await page.getByRole('checkbox', { name: 'أؤكد أن المندوب استلم هذه الدفعة فعلياً' }).check();
  await page.getByRole('button', { name: 'تأكيد استلام المندوب' }).click();
  await expect(page.getByRole('heading', { name: 'تسليم فعلي بانتظار تأكيد توصيل' })).toBeVisible();
  expect((await (await control('/wallet')).json()).eligibleToPay).toBe('4000');
  await page.screenshot({
    path: 'docs/verification/P12/screenshots/pending-390.png',
    fullPage: true,
  });
  await control('/advance');
  await page.getByRole('button', { name: 'تحديث الحالة' }).click();
  await expect(page.getByRole('heading', { name: 'تم قبول استلام المندوب' })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.screenshot({
    path: 'docs/verification/P12/screenshots/accepted-1440.png',
    fullPage: true,
  });
});
test('lost native response recovers one persisted command after reload', async ({ page }) => {
  const f = await runtime();
  await page
    .getByRole('checkbox', { name: 'اختيار الشحنة ' + f.ordinary.reference, exact: true })
    .check();
  await page.getByLabel('المندوب', { exact: true }).selectOption(f.driverId);
  await page.getByRole('button', { name: 'مراجعة التحضير', exact: true }).click();
  await page.route(
    '**/api/v1/dispatch/commands',
    async (route) => {
      await route.fetch();
      await route.abort('failed');
    },
    { times: 1 },
  );
  await page.getByRole('button', { name: 'تأكيد التحضير للمندوب' }).click();
  await expect(page.getByRole('button', { name: 'التحقق من نفس الطلب' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'التحقق من نفس الطلب' }).click();
  await expect(page).toHaveURL(/\/dispatch\/[a-f0-9-]+$/);
  await control('/advance');
  await page.getByRole('button', { name: 'تحديث الحالة' }).click();
  await expect(page.getByRole('heading', { name: 'مُحضّر للمندوب — لم يُسلّم' })).toBeVisible();
  await page.getByText('تعديل التحضير قبل المغادرة', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'سحب التحضير', exact: true })).toBeDisabled();
  await page
    .getByRole('checkbox', { name: 'أؤكد أن جميع شحنات الدفعة موجودة فعلياً في الفرع' })
    .check();
  await page.getByRole('button', { name: 'سحب التحضير', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'بانتظار سحب التحضير', exact: true }),
  ).toBeVisible();
  await control('/advance');
  await page.getByRole('button', { name: 'تحديث الحالة' }).click();
  await expect(page.getByRole('heading', { name: 'تم سحب التحضير', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'docs/verification/P12/screenshots/withdrawn-390.png',
    fullPage: true,
  });
});
test('unknown remote response keeps retry identity and restores list filters on Back', async ({
  page,
}) => {
  const f = await runtime();
  await page.goto('/dispatch?services=brand_packed');
  await page.locator(`a[href="/dispatch/${f.unknownId}"]`).click();
  await expect(page.getByRole('heading', { name: 'تسليم فعلي بانتظار تأكيد توصيل' })).toBeVisible();
  await page.getByText('الربط والمتابعة', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'إعادة المحاولة بنفس الطلب' })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: 'docs/verification/P12/screenshots/unknown-320.png',
    fullPage: true,
  });
  await page.getByRole('link', { name: 'العودة لقائمة التسليم' }).click();
  await expect(page).toHaveURL(/services=brand_packed/);
});
test('permission revoked with a stale selected form is rejected by the real API', async ({
  page,
}) => {
  const f = await runtime();
  await page
    .getByRole('checkbox', { name: 'اختيار الشحنة ' + f.long.reference, exact: true })
    .check();
  await page.getByLabel('المندوب', { exact: true }).selectOption(f.driverId);
  await page.getByRole('button', { name: 'مراجعة التحضير', exact: true }).click();
  await control('/revoke');
  try {
    await page.getByRole('button', { name: 'تأكيد التحضير للمندوب' }).click();
    await expect(page.getByRole('alert')).toContainText('صلاحياتك الحالية');
  } finally {
    await control('/restore');
  }
});
