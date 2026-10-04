import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
let runtime: {
  companyId: string;
  branchA: string;
  branchB: string;
  seed: { cash: { entityId: string }; bank: { entityId: string }; categoryId: string };
  secret: string;
};
test.beforeAll(async () => {
  runtime = JSON.parse(await readFile('tests/.p09-runtime.json', 'utf8'));
});
test.beforeEach(async ({ page }) => {
  await page.goto('/api/test/p09-login/admin');
  await expect(
    page.getByRole('heading', { name: 'الحسابات النقدية والبنكية', exact: true }),
  ).toBeVisible();
});
const control = async (path: string) =>
  (await fetch('http://127.0.0.1:4314' + path, { headers: { 'x-test-secret': runtime.secret } }))
    .json()
    .catch(() => null);
async function fillPayment(page: Page, expense = true, account = 'P09 خزينة ب', amount = '200') {
  await page.goto(expense ? '/expenses/new' : '/finance/movements/new');
  await expect(
    page.getByRole('heading', {
      name: expense ? 'تسجيل مصروف مدفوع' : 'تسجيل إيداع أو سحب',
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel('فرع العملية', { exact: true }).selectOption(runtime.branchB);
  await page.getByLabel('الحساب', { exact: true }).selectOption({ label: account });
  await page.getByLabel('المبلغ بالجنيه', { exact: true }).fill(amount);
  await page.getByLabel('تاريخ الدفع الفعلي', { exact: true }).fill('2026-09-01');
  if (expense) {
    await page.getByLabel('تصنيف المصروف', { exact: true }).selectOption(runtime.seed.categoryId);
    await page.getByLabel('وصف المصروف', { exact: true }).fill('P09 مصروف شهر سابق');
  }
}
async function confirm(page: Page) {
  await page.getByRole('button', { name: 'مراجعة التسجيل', exact: true }).click();
  await expect(page.getByRole('region', { name: 'مراجعة التسجيل', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'تأكيد التسجيل', exact: true }).click();
}
test('creates real zero-balance bank account, no opening input; responsive focused pages', async ({
  page,
}) => {
  await page.goto('/finance/accounts/new');
  await page
    .getByLabel('اسم الحساب', { exact: true })
    .fill('P09 حساب بنكي طويل الاسم للمراجعة على شاشة الهاتف والكمبيوتر');
  await page.getByLabel('نوع الحساب', { exact: true }).selectOption('bank');
  await page.getByLabel('الفرع ب', { exact: true }).check();
  await page.getByLabel('وصف البنك (اختياري)', { exact: true }).fill('مرجع وصفي للحساب التجريبي');
  expect(await page.getByLabel('الرصيد', { exact: true }).count()).toBe(0);
  await page.getByRole('button', { name: 'حفظ الحساب', exact: true }).click();
  await expect(
    page.getByRole('heading', {
      name: 'P09 حساب بنكي طويل الاسم للمراجعة على شاشة الهاتف والكمبيوتر',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator('.finance-detail')).toContainText('0.00');
  await expect(page.getByText('لم تُسجل حركات على هذا الحساب.', { exact: true })).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1050 : 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `docs/verification/P09/screenshots/account-${width}.png`,
      fullPage: true,
    });
  }
});
test('P04 category maintenance adds a category through the real catalog', async ({ page }) => {
  await page.goto('/settings/reference-data');
  await page.getByRole('link', { name: /تصنيفات المصروفات/ }).click();
  await page.getByLabel('اسم المرجع', { exact: true }).fill('P09 تصنيف جديد من المتصفح');
  await page.getByRole('button', { name: 'حفظ المرجع', exact: true }).click();
  await expect(page.getByText('P09 تصنيف جديد من المتصفح', { exact: true }).first()).toBeVisible();
  await page.goto('/expenses/new');
  await expect(page.getByLabel('تصنيف المصروف', { exact: true })).toContainText(
    'P09 تصنيف جديد من المتصفح',
  );
});
test('records prior-month expense200, loses committed response and recovers after reload once', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fillPayment(page);
  await page.route('**/api/v1/finance/commands', async (route) => {
    if (route.request().method() === 'POST') {
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      await route.abort('failed');
    } else await route.continue();
  });
  await confirm(page);
  await expect(page.getByRole('alert')).toContainText('لم تصل نتيجة التسجيل');
  await expect(page.getByRole('button', { name: 'استرد نتيجة الحفظ' })).toBeVisible();
  await page.screenshot({
    path: 'docs/verification/P09/screenshots/unknown-390.png',
    fullPage: true,
  });
  await page.unroute('**/api/v1/finance/commands');
  await page.reload();
  await expect(page.getByLabel('المبلغ بالجنيه')).toHaveValue('200.00');
  await page.getByRole('button', { name: 'استرد نتيجة الحفظ' }).click();
  await expect(page.getByRole('heading', { name: 'المصروف المسجل', exact: true })).toBeVisible();
  await expect(page.locator('.finance-detail')).toContainText('2026-09-01');
  expect(await control('/statistics')).toEqual({ cash: '80000', movements: 2, expenses: 1 });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1050 : 844 });
    await page.screenshot({
      path: `docs/verification/P09/screenshots/expense-${width}.png`,
      fullPage: true,
    });
  }
});
test('withdraws100 with blank reason; cash700 and three movements', async ({ page }) => {
  await fillPayment(page, false, 'P09 خزينة ب', '100');
  await page.getByLabel('اتجاه الحركة').selectOption('withdrawal');
  await confirm(page);
  await expect(page.getByRole('heading', { name: 'الحركة المسجلة', exact: true })).toBeVisible();
  expect(await control('/statistics')).toEqual({ cash: '70000', movements: 3, expenses: 1 });
  await page.goto('/finance/accounts/' + runtime.seed.cash.entityId);
  await expect(page.locator('.finance-detail')).toContainText('700.00');
  await expect(page.locator('.finance-row')).toHaveCount(3);
});
test('insufficient funds preserves entered expense, focuses rejection, validation and refresh', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fillPayment(page, true, 'P09 خزينة ب', '800');
  await confirm(page);
  await expect(page.getByRole('alert')).toContainText('الرصيد المتاح لا يكفي');
  await expect(page.getByRole('alert')).toBeFocused();
  await expect(page.getByLabel('المبلغ بالجنيه')).toHaveValue('800');
  await page.screenshot({
    path: 'docs/verification/P09/screenshots/insufficient-390.png',
    fullPage: true,
  });
  expect(await control('/statistics')).toEqual({ cash: '70000', movements: 3, expenses: 1 });
  await page.getByRole('button', { name: 'تعديل البيانات', exact: true }).click();
  await page.getByLabel('المبلغ بالجنيه').fill('٠');
  await page.getByRole('button', { name: 'مراجعة التسجيل', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('راجع الحقول');
});
test('B-only chooses shared bank via InstaPay; A absent and attribution B', async ({ page }) => {
  await page.goto('/api/test/p09-login/staff-b');
  await page.goto('/expenses/new');
  await expect(page.getByLabel('فرع العملية')).toBeDisabled();
  expect(await page.getByLabel('فرع العملية').locator('option').count()).toBe(1);
  await page.getByLabel('الحساب', { exact: true }).selectOption({ label: 'P09 بنك الشركة' });
  await page.getByLabel('طريقة الدفع').selectOption('instapay');
  await page.getByLabel('المبلغ بالجنيه').fill('١٠٠');
  await page.getByLabel('تاريخ الدفع الفعلي').fill('2026-09-01');
  await page.getByLabel('تصنيف المصروف').selectOption(runtime.seed.categoryId);
  await page.getByLabel('وصف المصروف').fill('P09 مصروف ب من البنك');
  await confirm(page);
  await expect(page.locator('.finance-detail')).toContainText('الفرع ب');
  await expect(page.locator('.finance-detail')).toContainText('إنستا باي');
});
test('stale setup shows current version, requires review; new inactive use is rejected', async ({
  page,
}) => {
  await page.goto('/finance/accounts/' + runtime.seed.cash.entityId);
  await page.getByRole('button', { name: 'تعديل الحساب', exact: true }).click();
  await page.getByLabel('اسم الحساب').fill('P09 تعديل قديم');
  await control('/bump-cash');
  await page.getByRole('button', { name: 'حفظ الحساب', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('نسخة أحدث');
  await expect(page.getByLabel('اسم الحساب')).toHaveValue('P09 تعديل قديم');
  await page.screenshot({
    path: 'docs/verification/P09/screenshots/stale-1440.png',
    fullPage: true,
  });
  await fillPayment(page, false, 'P09 بنك الشركة', '10');
  await control('/deactivate-bank');
  await confirm(page);
  await expect(page.getByRole('alert')).toContainText('الحساب موقوف');
  await page.goto('/finance/accounts/' + runtime.seed.bank.entityId);
  await expect(page.locator('.finance-detail')).toContainText('موقوف');
  await expect(page.locator('.finance-row').first()).toBeVisible();
});
test('combined advanced filters survive detail/back, reset and empty results on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/expenses');
  await page.getByText(/فلاتر متقدمة/).click();
  await page.getByLabel('الفرع', { exact: true }).selectOption(runtime.branchB);
  await page.getByLabel('الحساب', { exact: true }).selectOption(runtime.seed.cash.entityId);
  await page.getByLabel('من تاريخ').fill('2026-09-01');
  await page.getByLabel('إلى تاريخ').fill('2026-09-01');
  await expect(page.locator('.finance-row')).toHaveCount(1);
  await page.locator('.finance-row').click();
  await expect(page.getByRole('heading', { name: 'المصروف المسجل', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'العودة للقائمة', exact: true }).click();
  await expect(page).toHaveURL(/accountId=/);
  await page.getByText(/فلاتر متقدمة/).click();
  await expect(page.getByLabel('من تاريخ')).toHaveValue('2026-09-01');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1050 : 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `docs/verification/P09/screenshots/filters-${width}.png`,
      fullPage: true,
    });
  }
  await page.getByLabel('بحث', { exact: true }).fill('P09 لا يوجد سجل');
  await expect(page.getByText('لا توجد سجلات بهذه الفلاتر', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'مسح الفلاتر', exact: true }).click();
  await expect(page).toHaveURL(/\/expenses$/);
});
test('connection loss before commit retains intent; unknown lookup replays same ID', async ({
  page,
}) => {
  await fillPayment(page, false, 'P09 خزينة ب', '1');
  let id = '';
  await page.route('**/api/v1/finance/commands', async (route) => {
    id = route.request().postDataJSON().commandId;
    await route.abort('failed');
  });
  await confirm(page);
  await expect(page.getByRole('alert')).toContainText('لم تصل نتيجة التسجيل');
  await page.unroute('**/api/v1/finance/commands');
  await page.getByRole('button', { name: 'استرد نتيجة الحفظ' }).click();
  await expect(page.getByRole('heading', { name: 'الحركة المسجلة', exact: true })).toBeVisible();
  expect(id).toMatch(/^[0-9a-f-]{36}$/);
  expect(await control('/statistics')).toEqual({ cash: '70100', movements: 4, expenses: 1 });
});
