import { test, expect, type Page } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
let runtime: {
  secret: string;
  token: string;
  companyId: string;
  csrfToken: string;
  staffToken: string;
  branchB: string;
  seed: { brand: string };
  inventorySeed: {
    branchA: string;
    brand: string;
    product: string;
    blue: string;
    red: string;
    receipt: string;
  };
};
test.beforeEach(async ({ context }) => {
  runtime = JSON.parse(await readFile('tests/.p05-runtime.json', 'utf8'));
  await context.addCookies([
    {
      name: 'erp_session',
      value: runtime.token,
      url: 'http://127.0.0.1:5297',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    },
  ]);
});
const noOverflow = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
const capture = async (page: Page, name: string, fullPage = true) => {
  await mkdir('docs/verification/P05/screenshots', { recursive: true });
  await page.screenshot({
    path: 'docs/verification/P05/screenshots/' + name + '.png',
    fullPage,
  });
};
test('registry module entry, explicit multi-branch choice, and A-only denied browser request', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: /المخزون/ }).click();
  await expect(page.getByText('اختر فرعًا لعرض المخزون الحالي.')).toBeVisible();
  await page.getByLabel('الفرع', { exact: true }).selectOption(runtime.inventorySeed.branchA);
  await expect(page.locator('.stock-row').first()).toBeVisible();
  await context.clearCookies();
  await page.goto('/api/test/inventory-staff-login');
  await page.getByRole('link', { name: /المخزون/ }).click();
  await expect(page.locator('.stock-row').first()).toBeVisible();
  await expect(page.getByLabel('الفرع', { exact: true })).toHaveValue('الفرع أ');
  const denied = await page.evaluate(
    async ({ companyId, branchB }) => {
      const response = await fetch(
        `/api/v1/inventory/products?companyId=${companyId}&branches=${branchB}`,
      );
      return { status: response.status, body: await response.text() };
    },
    { companyId: runtime.companyId, branchB: runtime.branchB },
  );
  expect(denied.status).toBe(403);
  expect(denied.body).not.toContain('الفرع ب');
  await page.goto(`/inventory?branches=${runtime.branchB}`);
  await expect(page).not.toHaveURL(new RegExp(runtime.branchB));
  await expect(page.locator('.inventory-page')).not.toContainText('الفرع ب');
});
test('phone product setup starts at zero and multi-line receipt creates immutable history', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/brands/${runtime.seed.brand}/products`);
  await page.getByLabel('اسم المنتج', { exact: true }).fill('منتج رحلة الهاتف');
  await page.getByLabel('اسم المتغير 1', { exact: true }).fill('أزرق الهاتف');
  await page.getByRole('button', { name: 'إضافة متغير', exact: true }).click();
  await page.getByLabel('اسم المتغير 2', { exact: true }).fill('أحمر الهاتف');
  await page.getByRole('button', { name: 'تعريف المنتج', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'تم حفظ المنتج' })).toBeVisible();
  await page.goto(
    `/inventory?branches=${runtime.inventorySeed.branchA}&search=${encodeURIComponent('منتج رحلة الهاتف')}`,
  );
  await expect(page.locator('.stock-row')).toHaveCount(2);
  for (const row of await page.locator('.stock-row').all())
    await expect(row.locator('dd')).toHaveText(['٠', '٠', '٠', '٠', '٠', '٠']);
  await page.getByRole('link', { name: 'تسجيل استلام مخزون', exact: true }).click();
  await page
    .getByLabel('فرع الاستلام', { exact: true })
    .selectOption(runtime.inventorySeed.branchA);
  await page.getByLabel('البراند', { exact: true }).selectOption(runtime.seed.brand);
  await page
    .getByLabel('المتغير 1', { exact: true })
    .selectOption({ label: 'منتج رحلة الهاتف · أزرق الهاتف · ' });
  await page.getByLabel('الكمية 1', { exact: true }).fill('١٠');
  await page.getByRole('button', { name: 'إضافة سطر', exact: true }).click();
  await page
    .getByLabel('المتغير 2', { exact: true })
    .selectOption({ label: 'منتج رحلة الهاتف · أزرق الهاتف · ' });
  await page.getByLabel('الكمية 2', { exact: true }).fill('٢');
  await page.getByLabel('الحالة 2', { exact: true }).selectOption('damaged');
  await page.getByRole('button', { name: 'مراجعة الاستلام', exact: true }).click();
  await expect(page.getByLabel('مراجعة الاستلام')).toContainText('الفرع أ');
  await noOverflow(page);
  await capture(page, 'receipt-confirm-390');
  await page.getByRole('button', { name: 'تأكيد الاستلام الفعلي', exact: true }).click();
  await expect(page.getByRole('heading', { name: /استلام مخزون [0-9]/ })).toBeVisible();
  await expect(page.locator('.stock-row')).toHaveCount(2);
  await page.getByRole('link', { name: 'عرض تاريخ المتغير' }).first().click();
  await expect(page.locator('.stock-balances dd')).toHaveText(['١٢', '١٠', '٠', '١٠', '٢', '٠']);
  await capture(page, 'received-history-390');
});
for (const width of [320, 390, 768, 1440])
  test(`current inventory, advanced filter/back state and long labels at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 1440 ? 1050 : 844 });
    await page.goto(
      `/inventory?branches=${runtime.inventorySeed.branchA}&search=Blue&categories=unavailable`,
    );
    await expect(page.locator('.stock-row')).toHaveCount(1);
    await expect(page.locator('.stock-balances dd')).toHaveText(['١٢', '١٠', '٠', '١٠', '٢', '٠']);
    await page.getByRole('button', { name: /فلاتر متقدمة/ }).click();
    await expect(page.getByLabel('غير متاح', { exact: true })).toBeChecked();
    await noOverflow(page);
    await capture(page, `filters-${width}`, width > 768);
    await page.getByRole('button', { name: 'تطبيق الفلاتر', exact: true }).click();
    await expect(page.getByLabel('الفلاتر النشطة')).toContainText('فئات');
    await capture(page, `inventory-${width}`);
    await page.locator('.stock-row h2 a').click();
    await expect(page.getByRole('heading', { name: /Blue/ })).toBeVisible();
    await expect(page.locator('h1')).toBeFocused();
    await page.getByRole('link', { name: 'العودة بنفس الفلاتر' }).click();
    await expect(page.getByLabel('بحث', { exact: true })).toHaveValue('Blue');
    await expect(page).toHaveURL(/categories=unavailable/);
    await page.getByRole('button', { name: 'الطرود', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'لا توجد طرود مسجلة بعد' })).toBeVisible();
    await page.getByLabel('موقع العهدة').selectOption('external');
    await expect(page.locator('.stock-empty')).toContainText('لا يضيف مخزونًا');
    await noOverflow(page);
  });
test('negative quantity retains input and connection failure differs from no results', async ({
  page,
}) => {
  await page.goto('/inventory/receipts/new');
  await page
    .getByLabel('فرع الاستلام', { exact: true })
    .selectOption(runtime.inventorySeed.branchA);
  await page.getByLabel('البراند', { exact: true }).selectOption(runtime.seed.brand);
  await page.getByLabel('المتغير 1', { exact: true }).selectOption(runtime.inventorySeed.blue);
  await page.getByLabel('الكمية 1', { exact: true }).fill('-1');
  await page.getByRole('button', { name: 'مراجعة الاستلام', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('كمية صحيحة موجبة');
  await expect(page.getByRole('alert')).toBeFocused();
  await expect(page.getByLabel('الكمية 1')).toHaveValue('-1');
  await page.route('**/api/v1/inventory/products?**', (route) => route.abort());
  await page.goto(`/inventory?branches=${runtime.inventorySeed.branchA}`);
  await expect(page.getByRole('alert')).toContainText('تعذر الاتصال');
  await expect(page.getByText('لا توجد نتائج بهذه الفلاتر.', { exact: false })).toHaveCount(0);
  await capture(page, 'loading-failure-1440');
});
test('lost response after real commit persists original identity across reload and recovers once', async ({
  page,
}) => {
  const before = await page.request.get(
    `/api/v1/inventory/products?companyId=${runtime.companyId}&branches=${runtime.inventorySeed.branchA}&variantId=${runtime.inventorySeed.red}`,
  );
  const initial = (await before.json()).items[0].soundOnHand;
  await page.goto('/inventory/receipts/new');
  await page.getByLabel('فرع الاستلام').selectOption(runtime.inventorySeed.branchA);
  await page.getByLabel('البراند', { exact: true }).selectOption(runtime.seed.brand);
  await page.getByLabel('المتغير 1').selectOption(runtime.inventorySeed.red);
  await page.getByLabel('الكمية 1').fill('4');
  await page.getByRole('button', { name: 'مراجعة الاستلام', exact: true }).click();
  let identity = '';
  await page.route(
    '**/api/v1/inventory/receipts',
    async (route) => {
      identity = route.request().postDataJSON().commandId;
      const result = await route.fetch();
      expect(result.status()).toBe(200);
      await route.abort();
    },
    { times: 1 },
  );
  await page.getByRole('button', { name: 'تأكيد الاستلام الفعلي', exact: true }).click();
  await expect(page.getByRole('button', { name: 'استرد نتيجة الحفظ' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'استرد نتيجة الحفظ' })).toBeVisible();
  await expect(page.locator('.commercial-recovery')).toContainText(identity);
  await capture(page, 'receipt-unknown');
  await page.getByRole('button', { name: 'استرد نتيجة الحفظ' }).click();
  await expect(page.getByRole('heading', { name: /استلام مخزون [0-9]/ })).toBeVisible();
  const after = await page.request.get(
    `/api/v1/inventory/products?companyId=${runtime.companyId}&branches=${runtime.inventorySeed.branchA}&variantId=${runtime.inventorySeed.red}`,
  );
  expect((await after.json()).items[0].soundOnHand).toBe(initial + 4);
});
test('offline confirmation waits for connection without sending a command', async ({
  page,
  context,
}) => {
  await page.goto('/inventory/receipts/new');
  await page.getByLabel('فرع الاستلام').selectOption(runtime.inventorySeed.branchA);
  await page.getByLabel('البراند', { exact: true }).selectOption(runtime.seed.brand);
  await page.getByLabel('المتغير 1').selectOption(runtime.inventorySeed.red);
  await page.getByLabel('الكمية 1').fill('1');
  await page.getByRole('button', { name: 'مراجعة الاستلام', exact: true }).click();
  await context.setOffline(true);
  await page.getByRole('button', { name: 'تأكيد الاستلام الفعلي', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('تعذر الاتصال');
  await expect(page.getByRole('button', { name: 'استرد نتيجة الحفظ' })).toHaveCount(0);
  await context.setOffline(false);
});
test('stale product edit retains draft and requires explicit review of current revision', async ({
  page,
}) => {
  const fields = {
    name: 'منتج اختبار النسخة',
    active: true,
    variants: [{ name: 'افتراضي', options: '', active: true }],
  };
  const created = await page.request.post(`/api/v1/brands/${runtime.seed.brand}/products`, {
    headers: { origin: 'http://127.0.0.1:5297', 'x-csrf-token': runtime.csrfToken },
    data: {
      companyId: runtime.companyId,
      commandId: randomUUID(),
      schemaVersion: 1,
      type: 'product.create',
      brandId: runtime.seed.brand,
      fields,
    },
  });
  expect(created.status()).toBe(200);
  const id = (await created.json()).entityId;
  await page.goto('/products/' + id + '/edit');
  await page.getByLabel('اسم المنتج', { exact: true }).fill('تعديلي المحتفظ به');
  const detail = await page.request.get(`/api/v1/products/${id}?companyId=${runtime.companyId}`);
  const product = (await detail.json()).product;
  const changed = await page.request.patch('/api/v1/products/' + id, {
    headers: { origin: 'http://127.0.0.1:5297', 'x-csrf-token': runtime.csrfToken },
    data: {
      companyId: runtime.companyId,
      commandId: randomUUID(),
      schemaVersion: 1,
      type: 'product.update',
      productId: id,
      expectedVersion: 1,
      fields: { name: 'تعديل زميل', active: true, variants: product.variants },
    },
  });
  expect(changed.status()).toBe(200);
  await page.getByRole('button', { name: 'حفظ التعديل', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('نسخة أحدث');
  await expect(page.getByLabel('اسم المنتج', { exact: true })).toHaveValue('تعديلي المحتفظ به');
  await page.getByRole('button', { name: 'تحميل النسخة الحالية للمراجعة' }).click();
  await expect(page.locator('.stock-confirm')).toContainText('تعديل زميل');
  await page.getByRole('button', { name: 'راجعت النسخة الحالية — الاحتفاظ بتعديلي' }).click();
  await page.getByRole('button', { name: 'حفظ التعديل', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'تم حفظ المنتج' })).toBeVisible();
});
test('permission refresh clears a revoked selected branch and rejects old receipt recovery', async ({
  page,
}) => {
  await page.goto(`/inventory?branches=${runtime.inventorySeed.branchA}&search=Blue`);
  await expect(page.locator('.stock-row')).toHaveCount(1);
  try {
    await page.request.post('http://127.0.0.1:4298/revoke-a', {
      headers: { 'x-test-secret': runtime.secret },
    });
    await page.getByText('الحساب والجلسة', { exact: true }).click();
    await page.getByRole('button', { name: 'تحديث الصلاحيات', exact: true }).click();
    await expect(page).not.toHaveURL(new RegExp(runtime.inventorySeed.branchA));
    await expect(page.locator('.stock-row')).toHaveCount(0);
    const denied = await page.evaluate(
      async ({ companyId, receipt }) => {
        const response = await fetch(
          `/api/v1/inventory/receipts/${receipt}?companyId=${companyId}`,
        );
        return response.status;
      },
      { companyId: runtime.companyId, receipt: runtime.inventorySeed.receipt },
    );
    expect(denied).toBe(403);
  } finally {
    await page.request.post('http://127.0.0.1:4298/restore-a', {
      headers: { 'x-test-secret': runtime.secret },
    });
  }
});
