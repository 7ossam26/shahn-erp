import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
const runtime = () =>
  JSON.parse(readFileSync('tests/.p13-runtime.json', 'utf8')) as {
    companyId: string;
    shipment: { shipmentId: string; reference: string };
    long: { shipmentId: string; reference: string };
    pending: { shipmentId: string; reference: string };
  };

test('authorized employee earnings and integration reviews have separate read pages', async ({
  page,
}) => {
  await page.goto('/api/test/p13-login/admin');
  await page.goto('/execution/earnings');
  await expect(page.getByRole('heading', { name: 'عمولات الزيارات', exact: true })).toBeVisible();
  await expect(page.getByText('مندوب التجربة', { exact: true })).toBeVisible();
  await page.screenshot({
    path: 'docs/verification/P13/screenshots/earnings-1440.png',
    fullPage: true,
  });
  await page.goto('/execution/reviews');
  await expect(
    page.getByRole('heading', { name: 'مراجعات تصحيح التنفيذ', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('لا توجد مراجعات في نطاقك', { exact: true })).toBeVisible();
});
test('home search reaches company-wide operational tracking and preserves Back query', async ({
  page,
}) => {
  const f = runtime();
  await page.goto('/api/test/p13-login/staff');
  await page.getByLabel('ابحث عن شحنة').fill(f.shipment.reference);
  await page.getByRole('button', { name: 'بحث', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'تتبع شحنة', exact: true })).toBeVisible();
  await page.getByRole('link').filter({ hasText: f.shipment.reference }).click();
  await expect(page.getByText('سُجل الوصول', { exact: true })).toBeVisible();
  await expect(page.getByText('التسليم المبلّغ لا يعني استلام الشركة للأموال.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'تفاصيل الشحنة والإجراء المتاح' })).toHaveCount(0);
  await page.screenshot({
    path: 'docs/verification/P13/screenshots/timeline-1440.png',
    fullPage: true,
  });
  await page.getByRole('link', { name: 'العودة إلى نتائج البحث' }).click();
  await expect(page.getByLabel('رقم الشحنة، مرجع البراند، الهاتف أو الاسم')).toHaveValue(
    f.shipment.reference,
  );
});
test('responsive list, advanced filters, long Arabic detail and known gap states', async ({
  page,
}) => {
  const f = runtime();
  await page.goto('/api/test/p13-login/admin');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1050 : 844 });
    await page.goto('/tracking');
    await expect(page.getByText('أحمد — متابعة وصول دون رد')).toBeVisible();
    await page.screenshot({
      path: `docs/verification/P13/screenshots/results-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tracking/' + f.long.shipmentId);
  await expect(page.getByRole('heading', { name: 'شحنة ' + f.long.reference })).toBeVisible();
  await page.screenshot({ path: 'docs/verification/P13/screenshots/long-390.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.goto('/tracking/' + f.pending.shipmentId);
  await expect(
    page.getByText('الدليل غير مكتمل؛ توجد أحداث أو تبعيات بانتظار المعالجة.'),
  ).toBeVisible();
  await page.screenshot({
    path: 'docs/verification/P13/screenshots/pending-390.png',
    fullPage: true,
  });
  await page.goto('/tracking?query=00000000');
  await expect(page.getByText('لا توجد نتائج', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /فلاتر متقدمة/ }).click();
  await expect(page.getByLabel('أساس التاريخ')).toBeVisible();
  await page.screenshot({
    path: 'docs/verification/P13/screenshots/empty-filters-390.png',
    fullPage: true,
  });
});
test('connection failure preserves the query and offers retry without a false empty result', async ({
  page,
}) => {
  await page.goto('/api/test/p13-login/staff');
  await page.route('**/api/v1/tracking?**', (route) => route.abort('failed'));
  await page.goto('/tracking?query=12345');
  await expect(page.getByText('تعذر تحميل نتائج التتبع')).toBeVisible({ timeout: 30000 });
  await expect(page.getByLabel('رقم الشحنة، مرجع البراند، الهاتف أو الاسم')).toHaveValue('12345');
  await page.screenshot({
    path: 'docs/verification/P13/screenshots/offline-390.png',
    fullPage: true,
  });
});
