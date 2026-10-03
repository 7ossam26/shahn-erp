import { test, expect, type Page } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
let runtime: {
  token: string;
  companyId: string;
  csrfToken: string;
  staffToken: string;
  seed: { brand: string; cairo: string; giza: string; dokki: string; tier: string };
};
test.beforeEach(async ({ context }) => {
  runtime = JSON.parse(await readFile('tests/.p04-runtime.json', 'utf8'));
  await context.addCookies([
    {
      name: 'erp_session',
      value: runtime.token,
      url: 'http://127.0.0.1:5295',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    },
  ]);
});
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
test('fixture login and grant-filtered module entry reach real seeded brand configuration', async ({
  page,
  context,
}) => {
  await context.clearCookies();
  await page.goto('/api/test/brands-login');
  await expect(page.getByRole('heading', { name: 'البراندات', exact: true })).toBeVisible();
  await page.goto('/');
  await page.getByRole('link', { name: /البراندات/ }).click();
  await expect(page.locator('.commercial-row').first()).toContainText('براند التجربة');
});
test('scope-limited ordinary fixture signs in and has no commercial screen grant', async ({
  page,
  context,
}) => {
  await context.clearCookies();
  await page.goto('/api/test/brands-staff-login');
  await expect(page.locator('.company-context')).toContainText('شركة التجربة');
  await expect(page.locator('.company-context')).toContainText('staff-a');
  await expect(page.getByRole('link', { name: /البراندات/ })).toHaveCount(0);
  await page.goto('/brands');
  await expect(page.getByRole('alert')).toContainText('لا تسمح صلاحياتك');
});
for (const width of [390, 1440, 320, 768])
  test(`grouped setup and retained API error at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1440 ? 1050 : 844 });
    await page.goto('/brands/new');
    const longName = `براند تجريبي ${width} — مجموعة المنتجات والملابس المنزلية والخدمات المتفق عليها بجميع فروع الشركة`;
    await page.getByLabel('اسم البراند', { exact: true }).fill(longName);
    await page.getByLabel('الشريحة المتفق عليها', { exact: true }).selectOption(runtime.seed.tier);
    await page.getByLabel('زيادة التغليف بالجنيه').fill('٥');
    // The default remains brand-packed; disabling it produces a real server domain rejection.
    await page.getByLabel('تغليف بواسطة الشركة', { exact: true }).check();
    await page.getByLabel('طرد جاهز من البراند', { exact: true }).uncheck();
    await page.getByRole('button', { name: 'حفظ البراند', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('اختر خدمة افتراضية');
    await expect(page.getByRole('alert')).toBeFocused();
    await expect(page.getByLabel('اسم البراند', { exact: true })).toHaveValue(longName);
    await noOverflow(page);
    await mkdir('docs/verification/P04/screenshots', { recursive: true });
    await page.screenshot({
      path: `docs/verification/P04/screenshots/setup-error-${width}.png`,
      fullPage: true,
    });
    await page.getByLabel('الخدمة الافتراضية', { exact: true }).selectOption('company_packed');
    await page.getByRole('button', { name: 'حفظ البراند', exact: true }).click();
    await expect(page).toHaveURL(/\/brands\/[0-9a-f-]+$/);
    await expect(page.getByRole('heading', { name: 'إعداد البراند', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'معاينة السعر', exact: true })).toBeVisible();
    await expect(page.getByLabel('اسم البراند', { exact: true })).toHaveValue(longName);
    await noOverflow(page);
    await page.screenshot({
      path: `docs/verification/P04/screenshots/setup-saved-${width}.png`,
      fullPage: true,
    });
  });
test('preview explains 50/60/55 and missing governorate rate with no false success', async ({
  page,
}) => {
  await page.goto('/brands/' + runtime.seed.brand);
  await page.getByLabel('محافظة المعاينة', { exact: true }).selectOption(runtime.seed.cairo);
  await page.getByRole('button', { name: 'معاينة السعر الحالي' }).click();
  await expect(page.getByTestId('tariff-total')).toHaveText('50.00 ج.م');
  await page
    .getByLabel('منطقة المعاينة (اختياري)', { exact: true })
    .selectOption(runtime.seed.dokki);
  await page.getByRole('button', { name: 'معاينة السعر الحالي' }).click();
  await expect(page.getByTestId('tariff-total')).toHaveText('60.00 ج.م');
  await page.getByLabel('منطقة المعاينة (اختياري)', { exact: true }).selectOption('');
  await page.getByLabel('خدمة المعاينة', { exact: true }).selectOption('company_packed');
  await page.getByRole('button', { name: 'معاينة السعر الحالي' }).click();
  await expect(page.getByTestId('tariff-total')).toHaveText('55.00 ج.م');
  await expect(page.locator('.commercial-price')).toContainText('أساس عمولة النسبة: 50.00');
  await page.screenshot({
    path: 'docs/verification/P04/screenshots/price-preview-1440.png',
    fullPage: true,
  });
  await page.getByLabel('محافظة المعاينة', { exact: true }).selectOption(runtime.seed.giza);
  await page.getByRole('button', { name: 'معاينة السعر الحالي' }).click();
  await expect(page.getByRole('alert')).toContainText('لا يوجد سعر');
  await expect(page.getByTestId('tariff-total')).toHaveCount(0);
});
test('two editing sessions retain stale input and explicitly review the newer revision', async ({
  page,
  context,
}) => {
  const second = await context.newPage();
  await page.goto('/brands/' + runtime.seed.brand);
  await second.goto('/brands/' + runtime.seed.brand);
  await expect(second.getByLabel('اسم البراند', { exact: true })).toHaveValue(/براند التجربة/);
  await page.getByLabel('اسم البراند', { exact: true }).fill('النسخة المقبولة من الجلسة الأولى');
  await page.getByRole('button', { name: 'حفظ البراند', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'راجع نتيجة الحفظ' })).toBeVisible();
  await second.getByLabel('اسم البراند', { exact: true }).fill('مدخلات الجلسة الثانية المحفوظة');
  await second.getByRole('button', { name: 'حفظ البراند', exact: true }).click();
  await expect(second.getByRole('alert')).toContainText('النسخة الحالية:');
  await expect(second.getByLabel('اسم البراند', { exact: true })).toHaveValue(
    'مدخلات الجلسة الثانية المحفوظة',
  );
  await second.getByRole('button', { name: 'احتفظ بمدخلاتي وراجع النسخة الحالية' }).click();
  await second.getByRole('button', { name: 'حفظ البراند', exact: true }).click();
  await expect(second.getByRole('alert')).toHaveCount(0);
  await second.close();
});
test('committed response loss blocks edits and recovers one command after reload', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/brands/new');
  await page.getByLabel('اسم البراند', { exact: true }).fill('استرداد الطلب المؤكد');
  await page.getByLabel('الشريحة المتفق عليها', { exact: true }).selectOption(runtime.seed.tier);
  await page.route('**/api/v1/brands/commands', async (route) => {
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    await route.abort('failed');
  });
  await page.getByRole('button', { name: 'حفظ البراند', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('لم تصل نتيجة الحفظ');
  await expect(page.getByLabel('اسم البراند', { exact: true })).toHaveValue('استرداد الطلب المؤكد');
  await expect(page.getByRole('button', { name: 'حفظ البراند', exact: true })).toBeDisabled();
  await page.unroute('**/api/v1/brands/commands');
  await page.reload();
  await page.getByRole('button', { name: 'استرد نتيجة الحفظ' }).click();
  await expect(page).toHaveURL(/\/brands\/[0-9a-f-]+$/);
  await expect(page.getByLabel('اسم البراند', { exact: true })).toHaveValue('استرداد الطلب المؤكد');
  await noOverflow(page);
});
test('search, advanced tier/service filters and back navigation keep query state', async ({
  page,
}) => {
  await page.goto('/brands');
  await page.getByLabel('البحث عن براند', { exact: true }).fill('استرداد');
  await expect(page.locator('.commercial-row')).toHaveCount(1);
  await page.getByLabel('الخدمة', { exact: true }).selectOption('brand_packed');
  await page.locator('summary').filter({ hasText: 'فلاتر متقدمة' }).click();
  await page.getByLabel('شريحة الأسعار', { exact: true }).selectOption(runtime.seed.tier);
  await page.locator('.commercial-row').click();
  await page.goBack();
  await expect(page.getByLabel('البحث عن براند', { exact: true })).toHaveValue('استرداد');
  await expect(page.getByRole('button', { name: 'مسح الفلاتر' })).toBeVisible();
  await page.getByRole('button', { name: 'مسح الفلاتر' }).click();
  await expect(page.getByLabel('البحث عن براند', { exact: true })).toHaveValue('');
});
test('reference and tariff editors save actual revisions; storage settings create no receipts', async ({
  page,
}) => {
  await page.goto('/settings/reference-data/tier');
  await page.getByLabel('اسم المرجع', { exact: true }).fill('شريحة جديدة يختارها الموظف');
  await page
    .getByLabel('وصف حجم الطلبات الشهري (اختياري)', { exact: true })
    .fill('١٠٠٠ طلب · وصف فقط');
  await page.getByRole('button', { name: 'حفظ المرجع' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'تم حفظ المرجع' })).toBeVisible();
  await page.goto('/brands/tariffs');
  await page.getByLabel('شريحة السعر', { exact: true }).selectOption(runtime.seed.tier);
  await page.getByLabel('محافظة السعر', { exact: true }).selectOption(runtime.seed.giza);
  await page.getByLabel('سعر الشحن بالجنيه', { exact: true }).fill('٠');
  await page.getByRole('button', { name: 'حفظ السعر' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'تم حفظ نسخة السعر الجديدة' }),
  ).toBeVisible();
  await page.goto('/brands/new');
  await page.getByLabel('اسم البراند', { exact: true }).fill('اتفاق التخزين الواحد');
  await page.getByLabel('الشريحة المتفق عليها', { exact: true }).selectOption(runtime.seed.tier);
  await page.getByLabel('تجهيز من مخزون البراند', { exact: true }).check();
  await page.getByLabel('رسم التخزين الشهري بالجنيه', { exact: true }).fill('310');
  await page.getByLabel('بداية الخدمة', { exact: true }).fill('2026-01-31');
  await page
    .getByLabel('الفرع المسؤول عن الاتفاق', { exact: true })
    .selectOption({ label: 'الفرع أ' });
  await page.getByRole('button', { name: 'حفظ البراند', exact: true }).click();
  await expect(page).toHaveURL(/\/brands\/[0-9a-f-]+$/);
  await expect(page.getByLabel('رسم التخزين الشهري بالجنيه', { exact: true })).toHaveValue(
    '310.00',
  );
  await expect(
    page.getByText('الفترات والتحصيل الجزئي والمقدم والاسترداد تتاح في مرحلة التخزين لاحقًا.'),
  ).toBeVisible();
});
