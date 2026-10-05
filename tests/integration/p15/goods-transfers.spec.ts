import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const runtime = () =>
  JSON.parse(readFileSync('tests/.p15-runtime.json', 'utf8')) as {
    companyId: string;
    a: string;
    b: string;
    driver: string;
    brand: string;
    variant: string;
    parcel: string;
  };
test('mixed physical trip, scoped destination receipt, and responsive Arabic views', async ({
  page,
  request,
}) => {
  const f = runtime();
  await page.goto('/api/test/p15-login/admin');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1050 : 844 });
    await page.goto('/goods-transfers/new');
    await expect(page.getByRole('heading', { name: 'تجهيز نقل بين الفروع' })).toBeVisible();
    await page.screenshot({
      path: `docs/verification/P15/screenshots/create-${width}.png`,
      fullPage: true,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.getByLabel('الفرع المرسل').selectOption(f.a);
  await page.getByLabel('الفرع المستقبل').selectOption(f.b);
  await expect(page.getByLabel('الناقل').locator('option')).toHaveCount(2);
  await page.getByLabel('الناقل').selectOption(f.driver);
  await page.getByRole('checkbox', { name: /شحنة/ }).check();
  await page.getByRole('spinbutton', { name: /المتاح 8/ }).fill('3');
  await page.getByRole('button', { name: 'تجهيز وحجز محتويات الرحلة' }).click();
  await expect(page).toHaveURL(/\/goods-transfers\/[0-9a-f-]+$/);
  const manifestId = page.url().split('/').at(-1)!;
  await expect(page.getByText('جاهزة — لا تزال في المصدر')).toBeVisible();
  await page.screenshot({
    path: 'docs/verification/P15/screenshots/prepared-1440.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'تأكيد التسليم الفعلي للناقل' }).click();
  await expect(page.getByText('الحالة: مع الناقل')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/inventory?view=parcels&branches=' + f.a + '&custody=external');
  await expect(page.getByText('عهدة ناقل رحلة داخلية')).toBeVisible();
  await page.screenshot({
    path: 'docs/verification/P15/screenshots/in-transit-390.png',
    fullPage: true,
  });
  await page.goto('/api/test/p15-login/staffA');
  const forbidden = await request.get(
    `/api/v1/goods-receipts/${manifestId}?companyId=${f.companyId}`,
    {
      headers: {
        Cookie:
          (await page.context().cookies()).find((c) => c.name === 'erp_session')!.name +
          '=' +
          (await page.context().cookies()).find((c) => c.name === 'erp_session')!.value,
      },
    },
  );
  expect(forbidden.status()).toBe(403);
  await page.goto('/api/test/p15-login/staffB');
  await page.goto('/goods-receipts/' + manifestId);
  await expect(page.getByRole('heading', { name: /فحص رحلة/ })).toBeVisible();
  const parcel = page.locator('fieldset').filter({ hasText: 'طرد' });
  await parcel.getByLabel('ما وصل؟').selectOption('sound');
  const loose = page.locator('fieldset').filter({ hasText: 'المتبقي 3' });
  await loose.getByLabel('سليم').fill('2');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'docs/verification/P15/screenshots/inspect-390.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'تأكيد ما استُلم فعلياً' }).click();
  await expect(page.getByText(/الكمية الباقية مع الناقل تحتاج متابعة/)).toBeVisible();
  await expect(page.getByText(/المتبقي 1/)).toBeVisible();
  await page.screenshot({
    path: 'docs/verification/P15/screenshots/partial-390.png',
    fullPage: true,
  });
  await page.goto('/goods-receipts');
  await expect(page.getByText(/مع الناقل — المتبقي ظاهر بالتفصيل/)).toBeVisible();
});
