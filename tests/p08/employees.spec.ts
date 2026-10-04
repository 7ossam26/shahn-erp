import { test, expect, type Page } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
const runtime = async () => JSON.parse(await readFile('tests/.p08-runtime.json', 'utf8'));
async function control(path: string) {
  const r = await runtime();
  const response = await fetch('http://127.0.0.1:4312' + path, {
    method: 'POST',
    headers: { 'x-test-secret': r.secret },
  });
  expect(response.ok).toBe(true);
  return path === '/statistics' ? response.json() : response.text();
}
async function login(page: Page, staff = false) {
  await page.goto('/api/test/employees' + (staff ? '-staff' : '') + '-login');
  await expect(page.getByRole('heading', { name: 'الموظفون', exact: true })).toBeVisible();
}
test.beforeAll(async () => {
  await mkdir('docs/verification/P08/screenshots', { recursive: true });
});
test('module entry, actual pending local linkage and distinct identities without payment controls', async ({
  page,
}) => {
  await login(page);
  await page.goto('/');
  await expect(page.getByRole('link', { name: /الموظفون/ })).toBeVisible();
  await page.goto('/employees');
  await page.getByRole('link', { name: 'تجربة P08 — كريم', exact: true }).first().click();
  await expect(page.getByText('الربط المحلي محفوظ.', { exact: false })).toBeVisible();
  await expect(page.locator('.employee-summary')).toContainText('7.00');
  expect(await page.getByRole('button', { name: /دفع|سلفة/ }).count()).toBe(0);
});
test('responsive grouped setup preserves entered long Arabic fields on validation and saves independent combined terms', async ({
  page,
}) => {
  await login(page);
  await page.goto('/employees/new');
  const name = 'موظفة تجربة طويلة الاسم لاستخدام واجهة عربية واضحة مع شروط راتب وعمولة مستقلة';
  await page.getByLabel('اسم الموظف', { exact: true }).fill(name);
  await page.getByRole('switch', { name: 'تفعيل الراتب', exact: true }).check();
  await page.getByLabel('الراتب الشهري (ج.م)', { exact: true }).fill('٦٠٠٠');
  await page.getByRole('switch', { name: 'تفعيل العمولة', exact: true }).check();
  await page.getByLabel('نسبة العمولة (٪)', { exact: true }).fill('١٠');
  await page.getByLabel('يوم الراحة الأسبوعية', { exact: true }).selectOption('0');
  await page.getByRole('button', { name: 'حفظ الموظف', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('راجع أيام العمل');
  await expect(page.getByLabel('اسم الموظف', { exact: true })).toHaveValue(name);
  await expect(page.getByRole('alert')).toBeFocused();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1050 });
    await expect(page.getByRole('switch', { name: 'تفعيل العمولة', exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: `docs/verification/P08/screenshots/setup-error-${width}.png`,
      fullPage: true,
    });
  }
  await page.getByLabel('يوم الراحة الأسبوعية', { exact: true }).selectOption('5');
  await page.getByRole('button', { name: 'حفظ الموظف', exact: true }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(page.getByText('تم حفظ الموظف وشروطه', { exact: true })).toBeVisible();
  await expect(page.getByText('لا يوجد ربط مندوب فعال.', { exact: false })).toBeVisible();
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1050 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: `docs/verification/P08/screenshots/saved-${width}.png`,
      fullPage: true,
    });
  }
});
test('previews base-only commission, protected salary, and schedules future rate preserving history', async ({
  page,
}) => {
  const r = await runtime();
  await login(page);
  await page.goto('/employees/' + r.seed.mona.employeeId);
  await page.getByRole('button', { name: 'تغيير الشروط', exact: true }).click();
  await page.getByLabel('تعديل الراتب', { exact: true }).uncheck();
  await page.getByLabel('تعديل العمولة', { exact: true }).check();
  const future = new Date(Date.parse(r.seed.today + 'T12:00:00Z') + 86400000)
    .toISOString()
    .slice(0, 10);
  await page.getByLabel('تاريخ سريان العمولة', { exact: true }).fill(future);
  await page.getByLabel('سبب التغيير', { exact: true }).fill('جدولة مع الحفاظ على العمل السابق');
  await page.getByRole('button', { name: 'معاينة الأثر', exact: true }).click();
  await expect(page.getByText('يمكن حفظ هذه الشروط', { exact: true })).toBeVisible();
  await expect(page.locator('.employee-preview')).toContainText('5.00');
  await page.screenshot({
    path: 'docs/verification/P08/screenshots/base-preview-1440.png',
    fullPage: true,
  });
  await page.getByLabel('نسبة العمولة (٪)', { exact: true }).fill('20');
  await expect(page.getByRole('button', { name: 'حفظ التغيير', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'معاينة الأثر', exact: true }).click();
  await expect(page.locator('.employee-preview')).toContainText('10.00');
  await page.getByRole('button', { name: 'حفظ التغيير', exact: true }).click();
  await expect(page.getByRole('button', { name: 'تغيير الشروط', exact: true })).toBeVisible();
  await expect(page.locator('.employee-history').first()).toContainText(future);
  await page.getByRole('button', { name: 'تغيير الشروط', exact: true }).click();
  const old = new Date(Date.parse(r.seed.today + 'T12:00:00Z'));
  old.setUTCMonth(old.getUTCMonth() - 1);
  await page.getByLabel('شهر الراتب', { exact: true }).fill(old.toISOString().slice(0, 7));
  await page.getByLabel('سبب التغيير', { exact: true }).fill('معاينة شهر سابق');
  await page.getByRole('button', { name: 'معاينة الأثر', exact: true }).click();
  await expect(page.getByText('التعديل محمي', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'حفظ التغيير', exact: true })).toBeDisabled();
});
test('stale revision retains input, loads current version for review, then current full-month salary saves', async ({
  page,
}) => {
  const r = await runtime();
  await login(page);
  await page.goto('/employees/' + r.seed.salma.employeeId);
  await page.getByRole('button', { name: 'تغيير الشروط', exact: true }).click();
  await page.getByLabel('الراتب الشهري (ج.م)', { exact: true }).fill('6200');
  await page.getByLabel('سبب التغيير', { exact: true }).fill('تصحيح كامل الشهر');
  await control('/bump-salma');
  await page.getByRole('button', { name: 'معاينة الأثر', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('حفظ مستخدم آخر');
  await expect(page.getByLabel('الراتب الشهري (ج.م)', { exact: true })).toHaveValue('6200');
  await page.getByRole('button', { name: 'تحميل النسخة الحالية للمراجعة', exact: true }).click();
  await page.getByRole('button', { name: 'معاينة الأثر', exact: true }).click();
  await expect(page.getByText('يمكن حفظ هذه الشروط', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'حفظ التغيير', exact: true }).click();
  await expect(page.getByRole('button', { name: 'تغيير الشروط', exact: true })).toBeVisible();
  await expect(page.locator('.employee-summary')).toContainText('6200.00');
  await control('/freeze-salma');
  await page.getByRole('button', { name: 'تغيير الشروط', exact: true }).click();
  await page.getByLabel('سبب التغيير', { exact: true }).fill('محاولة بعد التجميد');
  await page.getByRole('button', { name: 'معاينة الأثر', exact: true }).click();
  await expect(page.getByText('التعديل محمي', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'حفظ التغيير', exact: true })).toBeDisabled();
});
test('lost committed create response survives reload and recovers one employee with the same identity', async ({
  page,
}) => {
  await login(page);
  await page.goto('/employees/new');
  const before = await control('/statistics');
  await page.getByLabel('اسم الموظف', { exact: true }).fill('اسم مكرر دون ربط تلقائي');
  await page.route('**/api/v1/employees', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fetch();
      await route.abort('failed');
    } else await route.continue();
  });
  await page.getByRole('button', { name: 'حفظ الموظف', exact: true }).click();
  await expect(page.getByRole('button', { name: 'استرد نتيجة الحفظ', exact: true })).toBeVisible();
  await page.unroute('**/api/v1/employees');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'docs/verification/P08/screenshots/unknown-390.png',
    fullPage: true,
  });
  await page.reload();
  await expect(page.getByLabel('اسم الموظف', { exact: true })).toHaveValue(
    'اسم مكرر دون ربط تلقائي',
  );
  await page.getByRole('button', { name: 'استرد نتيجة الحفظ', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'اسم مكرر دون ربط تلقائي', exact: true }),
  ).toBeVisible();
  expect((await control('/statistics')).employees).toBe(before.employees + 1);
  await expect(page.getByText('القسمان غير مفعلين:', { exact: false })).toBeVisible();
});
test('explicit local driver linking creates pending mapping, deactivation recovery retains one history', async ({
  page,
}) => {
  const r = await runtime();
  await login(page);
  await page.goto('/employees/' + r.seed.off.employeeId);
  await page.getByRole('button', { name: 'ربط مندوب', exact: true }).click();
  await page
    .getByLabel('اسم مرجع المندوب المحلي', { exact: true })
    .fill('هوية محلية مستقلة — ليس حساب دخول');
  await page.getByLabel('سبب التغيير', { exact: true }).fill('ربط صريح بالمرجع المحلي');
  await page.getByRole('button', { name: 'حفظ التغيير', exact: true }).click();
  await expect(page.getByText('الربط المحلي محفوظ.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'إيقاف الموظف', exact: true }).click();
  await page.getByLabel('سبب التغيير', { exact: true }).fill('انتهاء العمل مع حفظ التاريخ');
  await page.route('**/api/v1/employees/' + r.seed.off.employeeId, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fetch();
      await route.abort('failed');
    } else await route.continue();
  });
  await page.getByRole('button', { name: 'حفظ التغيير', exact: true }).click();
  await expect(page.getByRole('button', { name: 'استرد نتيجة الحفظ', exact: true })).toBeVisible();
  await page.unroute('**/api/v1/employees/' + r.seed.off.employeeId);
  await page.getByRole('button', { name: 'استرد نتيجة الحفظ', exact: true }).click();
  await expect(page.getByRole('button', { name: 'إيقاف الموظف', exact: true })).toHaveCount(0);
  await page.getByText('تاريخ الملف والفرع والربط', { exact: true }).click();
  await expect(page.getByText('انتهاء العمل مع حفظ التاريخ', { exact: false })).toBeVisible();
});
test('assigned filters use the API, persist on back, and A-only tracking grant cannot expose B finance', async ({
  page,
}) => {
  await login(page, true);
  const r = await runtime();
  await page.getByRole('button', { name: /فلاتر متقدمة/ }).click();
  await page.getByLabel('نمط العمولة', { exact: true }).selectOption('fixed');
  await expect(page.getByRole('link', { name: 'تجربة P08 — كريم', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'تجربة P08 — كريم', exact: true }).click();
  await page.goBack();
  await expect(page.getByRole('button', { name: 'مسح الفلاتر', exact: true })).toBeVisible();
  expect(page.url()).toContain('commission=fixed');
  await page.goto('/employees/' + r.seedB.mona.employeeId);
  await expect(page.getByRole('alert')).toContainText('صلاحياتك الحالية');
  expect(await page.getByText('6000.00', { exact: false }).count()).toBe(0);
});
test('revoked branch denies recovery of a previously committed unknown save', async ({ page }) => {
  await login(page);
  await page.goto('/employees/new');
  await page.getByLabel('اسم الموظف', { exact: true }).fill('ملف لاسترداد صلاحية مسحوبة');
  await page.route('**/api/v1/employees', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fetch();
      await route.abort('failed');
    } else await route.continue();
  });
  await page.getByRole('button', { name: 'حفظ الموظف', exact: true }).click();
  await expect(page.getByRole('button', { name: 'استرد نتيجة الحفظ', exact: true })).toBeVisible();
  await page.unroute('**/api/v1/employees');
  await control('/revoke-a');
  try {
    await page.getByRole('button', { name: 'استرد نتيجة الحفظ', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('صلاحياتك الحالية');
    await expect(page.getByLabel('اسم الموظف', { exact: true })).toHaveValue(
      'ملف لاسترداد صلاحية مسحوبة',
    );
  } finally {
    await control('/restore-a');
  }
});
