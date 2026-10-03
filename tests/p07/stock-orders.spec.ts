import { test, expect, type Page } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
let runtime: {
  token: string;
  secret: string;
  companyId: string;
  csrfToken: string;
  branchB: string;
  seed: { brand: string; cairo: string; giza: string };
  stockSeed: {
    blue: string;
    red: string;
    held: string;
    branchA: string;
    blocked: { reference: string };
  };
};
test.beforeEach(async ({ context }) => {
  runtime = JSON.parse(await readFile('tests/.p07-runtime.json', 'utf8'));
  await context.addCookies([
    {
      name: 'erp_session',
      value: runtime.token,
      url: 'http://127.0.0.1:5309',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    },
  ]);
});
const control = async (path: string) => {
  const r = await fetch('http://127.0.0.1:4310' + path, {
    headers: { 'x-test-secret': runtime.secret },
  });
  expect(r.ok).toBe(true);
  return path === '/statistics' ? r.json() : r.text();
};
const capture = async (page: Page, name: string) => {
  await mkdir('docs/verification/P07/screenshots', { recursive: true });
  await page.screenshot({
    path: 'docs/verification/P07/screenshots/' + name + '.png',
    fullPage: true,
  });
};
const noOverflow = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
async function fill(page: Page, blue = runtime.stockSeed.blue) {
  await page.goto('/preparation/orders/new');
  await page.getByLabel('فرع الاستلام').selectOption(runtime.stockSeed.branchA);
  await page.getByLabel('البراند', { exact: true }).selectOption(runtime.seed.brand);
  await expect(page.getByLabel('الخدمة', { exact: true })).toHaveValue('stored_stock');
  await page
    .getByLabel('اسم المستلم')
    .fill('مستلم طلب المخزون — اسم طويل للتحقق من العربية والهاتف');
  await page.getByLabel('رقم الهاتف').fill('٠١٠ ١٢٣٤ ٥٦٧٨');
  await page.getByLabel('المحافظة', { exact: true }).selectOption(runtime.seed.cairo);
  await page.getByLabel('العنوان المكتوب').fill('القاهرة — شارع البوليصة — الطابق الثالث');
  await page.getByLabel('الصنف 1', { exact: true }).selectOption(blue);
  await page.getByLabel('الكمية 1', { exact: true }).fill('2');
  await page.getByLabel('المستحق للقطعة 1 (ج.م)').fill('50');
  await page.getByRole('button', { name: 'إضافة قطعة', exact: true }).click();
  await page.getByLabel('الصنف 2', { exact: true }).selectOption(runtime.stockSeed.red);
  await page.getByLabel('المستحق للقطعة 2 (ج.م)').fill('150');
  await page.getByLabel('السماح بالفحص').selectOption('true');
}
async function submit(page: Page) {
  await page.getByRole('button', { name: 'مراجعة طلب المخزون', exact: true }).click();
  await page.getByLabel('راجعت الفرع والأصناف والكميات المطلوب حجزها').check();
  await page.getByRole('button', { name: 'تأكيد طلب المخزون', exact: true }).click();
}
test('Arabic mobile actual stock order at305, explicit preparation, cancellation and partial unpack', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const before = await control('/statistics');
  await fill(page);
  await noOverflow(page);
  await capture(page, 'stock-order-390');
  await submit(page);
  await expect(page).toHaveURL(/\/shipments\/\d+$/);
  const url = page.url(),
    ref = url.split('/').at(-1)!;
  await expect(page.getByRole('heading', { name: 'حجوزات ومكونات المخزون' })).toBeVisible();
  await expect(page.getByText('305.00', { exact: false }).first()).toBeVisible();
  await capture(page, 'stock-detail-390');
  const after = await control('/statistics');
  expect(after.shipments - before.shipments).toBe(1);
  expect(after.receipts).toBe(before.receipts);
  expect(after.journal).toBe(before.journal);
  await page.goto('/preparation?branches=' + runtime.stockSeed.branchA + '&search=' + ref);
  await expect(page.getByRole('link', { name: 'طرد ' + ref })).toBeVisible();
  await page.getByRole('button', { name: 'إكمال التجهيز', exact: true }).click();
  await page.getByRole('button', { name: 'تم التجهيز بالفعل', exact: true }).click();
  await expect(page.locator('article').getByText('تم التجهيز', { exact: true })).toBeVisible();
  await page.goto(url);
  await page.getByText('إجراءات قبل التسليم ونتيجة آخر طلب', { exact: true }).click();
  await page.getByRole('button', { name: 'إلغاء الطلب', exact: true }).click();
  await page.getByLabel('سبب الإلغاء').fill('إلغاء بعد التغليف والفحص الفعلي لاحقًا');
  await page.getByRole('button', { name: 'تأكيد الإلغاء', exact: true }).click();
  await expect(page.getByText('تأكيد فك التغليف والفحص الفعلي', { exact: true })).toBeVisible();
  await page.getByLabel(/^سليم — .*Blue/).fill('1');
  await page.getByLabel(/^تالف — .*Blue/).fill('1');
  await page
    .getByLabel('سبب ونتيجة الفحص الفعلي')
    .fill('فك التغليف فعليًا: وحدة سليمة ووحدة تالفة');
  await page.getByRole('button', { name: 'تأكيد الفحص الفعلي', exact: true }).click();
  await expect(page.getByText(/سليم مفحوص.*1.*تالف.*1/).first()).toBeVisible();
  await capture(page, 'unpack-390');
  await noOverflow(page);
  await page.goto(
    '/inventory/variants/' + runtime.stockSeed.blue + '?branchId=' + runtime.stockSeed.branchA,
  );
  await expect(page.getByRole('heading', { name: 'أين تلتزم الكميات' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'طلب ' + ref }).first()).toBeVisible();
});
test('desktop/mobile shortage and missing tariff retain input; branch change revalidates selections', async ({
  page,
}) => {
  await fill(page);
  await page.getByLabel('الكمية 1', { exact: true }).fill('999');
  await expect(
    page.getByRole('alert').filter({ hasText: 'المخزون المتاح لا يكفي' }).first(),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'مراجعة طلب المخزون' })).toBeDisabled();
  await capture(page, 'shortage-1440');
  await noOverflow(page);
  await page.getByLabel('الكمية 1', { exact: true }).fill('1');
  await page.getByLabel('المحافظة', { exact: true }).selectOption(runtime.seed.giza);
  await expect(page.getByRole('alert').filter({ hasText: 'لا يوجد سعر' }).first()).toBeVisible();
  await expect(page.getByLabel('اسم المستلم')).not.toHaveValue('');
  await page.getByLabel('المحافظة', { exact: true }).selectOption(runtime.seed.cairo);
  await page.getByLabel('فرع الاستلام').selectOption(runtime.branchB);
  await expect(
    page.getByRole('alert').filter({ hasText: 'المخزون المتاح لا يكفي' }).first(),
  ).toBeVisible();
  await expect(page.getByLabel('الصنف 1', { exact: true })).toHaveValue(runtime.stockSeed.blue);
  await page.setViewportSize({ width: 320, height: 844 });
  await noOverflow(page);
  await capture(page, 'branch-shortage-320');
});
test('blocked 5/7 order visible in queue/filter/detail without a preparation shortcut at320/768/1440', async ({
  page,
}) => {
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1050 : 844 });
    await page.goto('/preparation?branches=' + runtime.stockSeed.branchA + '&preparation=blocked');
    await expect(
      page.getByRole('link', { name: 'طرد ' + runtime.stockSeed.blocked.reference }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'إكمال التجهيز', exact: true })).toHaveCount(0);
    await noOverflow(page);
    await capture(page, 'blocked-queue-' + width);
  }
  await page.goto('/shipments/' + runtime.stockSeed.blocked.reference);
  await expect(page.getByText(/موقوف: يوجد عجز/)).toBeVisible();
  await noOverflow(page);
  await capture(page, 'blocked-detail-1440');
});
test('lost committed confirmation response recovers original stock order after reload', async ({
  page,
}) => {
  await fill(page);
  await page.getByLabel('الكمية 1', { exact: true }).fill('1');
  await page.getByLabel('المستحق للقطعة 1 (ج.م)').fill('0');
  const before = await control('/statistics');
  let committedReference = '';
  await page.route('**/api/v1/shipments', async (route) => {
    if (route.request().method() === 'POST') {
      const response = await route.fetch();
      expect(response.ok()).toBe(true);
      committedReference = (await response.json()).reference;
      await route.abort('failed');
    } else await route.continue();
  });
  await submit(page);
  await expect(page.getByRole('button', { name: 'استرد نتيجة الحفظ' })).toBeEnabled();
  await page.unroute('**/api/v1/shipments');
  await page.reload();
  await page.getByRole('button', { name: 'استرد نتيجة الحفظ' }).click();
  await expect(page).toHaveURL(new RegExp('/shipments/' + committedReference + '$'));
  const after = await control('/statistics');
  expect(after.shipments - before.shipments).toBe(1);
  expect(after.receipts).toBe(before.receipts);
  await capture(page, 'recovered-1440');
});
test('server denies branch revoked after form load and preserves entered recipient', async ({
  page,
}) => {
  await fill(page);
  await page.getByLabel('الكمية 1', { exact: true }).fill('1');
  await control('/revoke-a');
  try {
    await submit(page);
    await expect(page.getByRole('alert').filter({ hasText: 'غير مسندة لك' }).first()).toBeVisible();
    await expect(page.getByLabel('اسم المستلم')).not.toHaveValue('');
    await capture(page, 'denied-preserved-1440');
  } finally {
    await control('/restore-a');
  }
});
test('two browser forms loaded before stock changes receive one success and a named server shortage with retained input', async ({
  page,
  context,
}) => {
  await fill(page);
  await page.getByLabel('الكمية 1', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'حذف القطعة 2', exact: true }).click();
  const quantity = await page.evaluate(async (r) => {
    const response = await fetch(
      '/api/v1/shipments/stock?' +
        new URLSearchParams({
          companyId: r.companyId,
          branchId: r.stockSeed.branchA,
          brandId: r.seed.brand,
        }),
    );
    const data = await response.json();
    return data.items.find((x: { variantId: string }) => x.variantId === r.stockSeed.blue)
      .available;
  }, runtime);
  expect(quantity).toBeGreaterThan(0);
  const other = await context.newPage();
  await fill(other);
  await other.getByRole('button', { name: 'حذف القطعة 2', exact: true }).click();
  await other.getByLabel('الكمية 1', { exact: true }).fill(String(quantity));
  const before = await control('/statistics');
  await submit(other);
  await expect(other).toHaveURL(/\/shipments\/\d+$/);
  await submit(page);
  await expect(
    page.getByRole('alert').filter({ hasText: 'المخزون المتاح لا يكفي' }).first(),
  ).toBeVisible();
  await expect(page.getByLabel('الكمية 1', { exact: true })).toHaveValue('1');
  await expect(page.getByLabel('اسم المستلم')).not.toHaveValue('');
  expect((await control('/statistics')).shipments - before.shipments).toBe(1);
  await capture(page, 'server-stock-shortage-1440');
  await other.close();
});
