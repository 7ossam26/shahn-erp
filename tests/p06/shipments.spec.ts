import { test, expect, type Page } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
let runtime: {
  secret: string;
  token: string;
  companyId: string;
  csrfToken: string;
  staffToken: string;
  branchB: string;
  seed: { brand: string; cairo: string; giza: string; dokki: string };
  inventorySeed: { branchA: string };
  shipmentSeed: Record<string, { reference: string; shipmentId: string }>;
};
test.beforeEach(async ({ context }) => {
  runtime = JSON.parse(await readFile('tests/.p06-runtime.json', 'utf8'));
  await context.addCookies([
    {
      name: 'erp_session',
      value: runtime.token,
      url: 'http://127.0.0.1:5299',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    },
  ]);
});
const noOverflow = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
const capture = async (page: Page, name: string) => {
  await mkdir('docs/verification/P06/screenshots', { recursive: true });
  await page.screenshot({
    path: 'docs/verification/P06/screenshots/' + name + '.png',
    fullPage: true,
  });
};
const control = async (path: string) => {
  const res = await fetch('http://127.0.0.1:4300' + path, {
    headers: { 'x-test-secret': runtime.secret },
  });
  expect(res.ok).toBe(true);
  return path === '/statistics' ? res.json() : res.text();
};
async function fill(
  page: Page,
  options: {
    packed?: boolean;
    reference?: string;
    prepaid?: boolean;
    shippingPaid?: boolean;
    long?: boolean;
  } = {},
) {
  await page.goto('/shipments/new');
  await page.getByLabel('فرع الاستلام').selectOption(runtime.inventorySeed.branchA);
  await page.getByLabel('البراند', { exact: true }).selectOption(runtime.seed.brand);
  if (options.packed)
    await page.getByLabel('الخدمة', { exact: true }).selectOption('company_packed');
  await page.getByLabel('مرجع البراند (اختياري)').fill(options.reference ?? '');
  await page
    .getByLabel('اسم المستلم')
    .fill(options.long ? 'اسم مستلم طويل '.repeat(12) : 'مستلم رحلة المتصفح');
  await page.getByLabel('رقم الهاتف').fill('٠١٠ (١٢٣٤) ٥٦٧٨');
  await page.getByLabel('المحافظة', { exact: true }).selectOption(runtime.seed.cairo);
  await page
    .getByLabel('العنوان المكتوب')
    .fill(
      options.long
        ? 'عنوان عربي طويل مع تفاصيل البوليصة '.repeat(12)
        : 'القاهرة — شارع البوليصة — منزل ١٢',
    );
  await page
    .getByLabel('وصف القطعة 1')
    .fill(options.long ? 'وصف قطعة طويل '.repeat(12) : 'قطعتا البوليصة بقيمتين');
  await page.getByLabel('المستحق للقطعة 1 (ج.م)').fill(options.prepaid ? '0' : '250');
  await page.getByLabel('السماح بالفحص').selectOption('true');
  if (options.shippingPaid) await page.getByLabel('سداد الشحن').selectOption('brand');
}
async function review(page: Page) {
  await page.getByRole('button', { name: 'تسجيل طرد مستلم', exact: true }).click();
  await page.getByLabel('استلمت الطرد أو بضاعته بالفعل في هذا الفرع').check();
}
async function register(page: Page) {
  await review(page);
  await page.getByRole('button', { name: 'تأكيد تسجيل الطرد', exact: true }).click();
  await expect(page).toHaveURL(/\/shipments\/\d+$/);
  return page.url().split('/').at(-1)!;
}
test('mobile ready intake commits 300, shows actual timeline, and appears in P05 parcel custody', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const before = await control('/statistics');
  await fill(page);
  await noOverflow(page);
  await capture(page, 'intake-ready-390');
  await review(page);
  await capture(page, 'confirmation-390');
  await page.getByRole('button', { name: 'تأكيد تسجيل الطرد', exact: true }).click();
  await expect(page).toHaveURL(/\/shipments\/\d+$/);
  const ref = page.url().split('/').at(-1)!;
  await expect(page.getByText('لا يحتاج تجهيزًا', { exact: true })).toBeVisible();
  await expect(page.locator('.intake-money').first()).toContainText('300.00');
  await noOverflow(page);
  await capture(page, 'detail-ready-390');
  await page.goto(
    `/inventory?view=parcels&branches=${runtime.inventorySeed.branchA}&search=${ref}`,
  );
  await expect(page.locator('.parcel-card')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'طرد ' + ref })).toBeVisible();
  const after = await control('/statistics');
  expect(after.shipments - before.shipments).toBe(1);
  expect(after.receipts - before.receipts).toBe(1);
  expect(after.journal).toBe(before.journal);
});
test('company-packed 305 requires explicit completion once without extra receipt or money', async ({
  page,
}) => {
  await fill(page, { packed: true });
  const ref = await register(page);
  await expect(page.locator('.intake-money').first()).toContainText('305.00');
  await page.getByRole('link', { name: 'الخطوة التالية: تجهيز الطرد' }).click();
  await page.getByLabel('الفرع', { exact: true }).selectOption(runtime.inventorySeed.branchA);
  await page.getByLabel('بحث برقم الطرد أو بيانات المستلم').fill(ref);
  const before = await control('/statistics');
  await page.getByRole('button', { name: 'إكمال التجهيز', exact: true }).click();
  await page.getByRole('button', { name: 'تم التجهيز بالفعل' }).click();
  await expect(page.locator('.parcel-card')).toContainText('تم التجهيز');
  await expect(page.getByRole('button', { name: 'إكمال التجهيز' })).toHaveCount(0);
  const after = await control('/statistics');
  expect(after.completions - before.completions).toBe(1);
  expect(after.receipts).toBe(before.receipts);
  expect(after.journal).toBe(before.journal);
  await capture(page, 'preparation-complete-1440');
});
test('shipping-only and fully prepaid forms preserve zero goods and commercial tariff', async ({
  page,
}) => {
  for (const shippingPaid of [false, true]) {
    await fill(page, { prepaid: true, shippingPaid });
    await register(page);
    await expect(page.locator('.intake-money').first()).toContainText(
      shippingPaid ? '0.00' : '50.00',
    );
    const money = await page.locator('.intake-money').first().locator('div').last().textContent();
    expect(money).toContain(shippingPaid ? '0.00' : '50.00');
    if (shippingPaid) await capture(page, 'detail-prepaid-zero');
  }
});
test('missing tariff and invalid phone/URL retain input, then correction of the form registers once', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fill(page);
  const before = await control('/statistics');
  await page.getByLabel('المحافظة', { exact: true }).selectOption(runtime.seed.giza);
  await expect(page.getByRole('alert')).toContainText('لا يوجد سعر');
  await expect(page.getByRole('button', { name: 'تسجيل طرد مستلم', exact: true })).toBeDisabled();
  await expect(page.getByLabel('اسم المستلم')).toHaveValue('مستلم رحلة المتصفح');
  await capture(page, 'missing-tariff-390');
  await page.getByLabel('المحافظة', { exact: true }).selectOption(runtime.seed.cairo);
  await page.getByLabel('رقم الهاتف').fill('123');
  await expect(page.getByRole('alert')).toContainText('راجع رقم الهاتف');
  await page.getByLabel('رقم الهاتف').fill('01012345678');
  await page.getByLabel('رابط الموقع (اختياري)').fill('javascript:alert(1)');
  await expect(page.getByRole('alert')).toContainText('HTTP');
  expect(await control('/statistics')).toEqual(before);
  await page.getByLabel('رابط الموقع (اختياري)').fill('https://maps.example.test/entered-only');
  await register(page);
});
test('duplicate brand reference has a deliberate independent-order warning distinct from retry recovery', async ({
  page,
}) => {
  await fill(page, { reference: 'BROWSER-DUP' });
  const first = await register(page);
  await fill(page, { reference: 'BROWSER-DUP' });
  await review(page);
  await page.getByRole('button', { name: 'تأكيد تسجيل الطرد', exact: true }).click();
  await expect(
    page.getByText('مرجع البراند مكرر. هذا ليس استردادًا لمحاولة تسجيل سابقة.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'تسجيل طرد مستلم', exact: true })).toBeDisabled();
  await page.getByLabel('هذا طلب مستقل رغم تكرار المرجع').check();
  await capture(page, 'duplicate-reference-warning');
  const second = await register(page);
  expect(first).not.toBe(second);
});
test('dropped committed confirmation response survives reload and recovers original reference exactly once', async ({
  page,
}) => {
  await fill(page, { reference: 'LOST-CONFIRM' });
  const before = await control('/statistics');
  let committed = '';
  await page.route('**/api/v1/shipments', async (route) => {
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    committed = (await response.json()).reference;
    await route.abort('failed');
  });
  await review(page);
  await page.getByRole('button', { name: 'تأكيد تسجيل الطرد', exact: true }).click();
  await expect(page.getByRole('button', { name: 'استرد نتيجة الحفظ' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'استرد نتيجة الحفظ' }).click();
  await expect(page).toHaveURL(new RegExp('/shipments/' + committed + '$'));
  const after = await control('/statistics');
  expect(after.shipments - before.shipments).toBe(1);
  expect(after.receipts - before.receipts).toBe(1);
});
test('lost preparation response recovers from the waiting-only queue after reload', async ({
  page,
}) => {
  await fill(page, { packed: true, reference: 'LOST-PREP' });
  const ref = await register(page);
  await page.goto(
    `/preparation?branches=${runtime.inventorySeed.branchA}&preparation=awaiting_preparation&search=${ref}`,
  );
  await page.route('**/api/v1/shipments/*/preparation/complete', async (route) => {
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    await route.abort('failed');
  });
  await page.getByRole('button', { name: 'إكمال التجهيز' }).click();
  await page.getByRole('button', { name: 'تم التجهيز بالفعل' }).click();
  await expect(page.getByRole('button', { name: 'استرد نتيجة الحفظ' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'استرد نتيجة الحفظ' }).click();
  await expect(page.getByRole('button', { name: 'استرد نتيجة الحفظ' })).toHaveCount(0);
  await expect(page.getByText('لا توجد طرود بهذه الفلاتر. راجع الفرع والفلاتر.')).toBeVisible();
});
test('mobile advanced combined filters, reset, detail/back and assigned-branch denial', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/inventory?view=parcels&branches=${runtime.inventorySeed.branchA}`);
  await page.getByRole('button', { name: /فلاتر متقدمة/ }).click();
  await page.getByLabel('البراند', { exact: true }).selectOption(runtime.seed.brand);
  await page.getByLabel('الخدمة', { exact: true }).selectOption('company_packed');
  await page.getByRole('button', { name: 'تطبيق الفلاتر' }).click();
  await expect(page.locator('.parcel-card').first()).toBeVisible();
  await noOverflow(page);
  await capture(page, 'parcel-filters-390');
  await page.locator('.parcel-card a').first().click();
  await page.goBack();
  await expect(page).toHaveURL(/service=company_packed/);
  await page.getByRole('button', { name: 'مسح الفلاتر' }).click();
  await expect(page).not.toHaveURL(/service=/);
  await context.clearCookies();
  await page.goto('/api/test/intake-staff-login');
  await page.goto('/shipments/new');
  await expect(page.getByLabel('فرع الاستلام')).toHaveValue('الفرع أ');
  const denied = await page.evaluate(
    async ({ company, branch }) => {
      const r = await fetch(`/api/v1/preparation?companyId=${company}&branches=${branch}`);
      return r.status;
    },
    { company: runtime.companyId, branch: runtime.branchB },
  );
  expect(denied).toBe(403);
});
test('320/768/1440 layouts preserve long Arabic content, keyboard focus and responsive timeline', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await fill(page, { long: true });
  await noOverflow(page);
  await capture(page, 'intake-long-320');
  const ref = await register(page);
  await noOverflow(page);
  await capture(page, 'detail-long-320');
  for (const width of [768, 1440]) {
    await page.setViewportSize({ width, height: 1050 });
    await page.goto('/shipments/' + ref);
    await expect(page.getByRole('heading', { name: 'طرد ' + ref, exact: true })).toBeFocused();
    await noOverflow(page);
    await capture(page, 'detail-long-' + width);
    await page.goto('/shipments/new');
    await expect(page.getByRole('heading', { name: 'تسجيل طرد مستلم' })).toBeVisible();
    await noOverflow(page);
    await capture(page, 'intake-' + width);
  }
});
test('tariff edits preserve old detail; correction preview/commit reviews service and cancellation retains parcel', async ({
  page,
}) => {
  await fill(page, { reference: 'CORRECTION' });
  const ref = await register(page);
  await control('/change-tariff');
  await page.reload();
  await expect(page.locator('.intake-money').first()).toContainText('300.00');
  await page.getByText('إجراءات قبل التسليم ونتيجة آخر طلب', { exact: true }).click();
  await page.getByRole('link', { name: 'تصحيح قبل التسليم' }).click();
  await page.getByLabel('الخدمة', { exact: true }).selectOption('company_packed');
  await page.getByLabel('سبب التصحيح').fill('الخدمة على البوليصة سجلت خطأ');
  await page.getByRole('button', { name: 'معاينة التصحيح' }).click();
  await expect(page.locator('.correction-preview')).toContainText('305.00');
  await capture(page, 'correction-preview-1440');
  await page.getByRole('button', { name: 'تأكيد التصحيح', exact: true }).click();
  await expect(page).toHaveURL(new RegExp('/shipments/' + ref + '$'));
  await expect(page.getByText('بانتظار التجهيز', { exact: true })).toBeVisible();
  await page.getByText('إجراءات قبل التسليم ونتيجة آخر طلب', { exact: true }).click();
  await page.getByRole('button', { name: 'إلغاء الطلب', exact: true }).click();
  await page.getByLabel('سبب الإلغاء').fill('طلب البراند الإلغاء قبل التسليم');
  await page.getByRole('button', { name: 'تأكيد الإلغاء', exact: true }).click();
  await expect(page.getByText('طلب ملغى · الطرد ما زال بعهدة الفرع')).toBeVisible();
  await capture(page, 'cancelled-held-1440');
  await page.goto(
    `/inventory?view=parcels&branches=${runtime.inventorySeed.branchA}&search=${ref}`,
  );
  await expect(page.locator('.parcel-card')).toContainText('ملغى · العهدة محفوظة');
  await writeFile(
    'docs/verification/P06/browser-trial-references.json',
    JSON.stringify({ correctionReference: ref, seed: runtime.shipmentSeed }, null, 2),
  );
});
