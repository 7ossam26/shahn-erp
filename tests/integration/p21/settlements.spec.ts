import { readFileSync, writeFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
interface Runtime {
  secret: string;
  companyId: string;
  branchA: string;
  cash: string;
  brand: string;
  category: string;
  blue: string;
  openingCash: string;
  openingGreen: string;
  openingEmployee: string;
}
type Counts = {
  cases: number;
  resolutions: number;
  held: string;
  cash: string;
  openingCash: string;
  movements: number;
  openingMovements: number;
  batches: number;
  openingLines: number;
  operatingEffects: number;
  blue: number;
  green: number;
};
const runtime = () => JSON.parse(readFileSync('tests/.p21-runtime.json', 'utf8')) as Runtime;
const control = async <T = unknown>(r: Runtime, path: string): Promise<T> => {
  const res = await fetch('http://127.0.0.1:4422' + path, {
    headers: { 'x-test-secret': r.secret },
  });
  if (!res.ok) throw new Error('control ' + path + ' ' + res.status + ' ' + (await res.text()));
  return (await res.json()) as T;
};
const counts = (r: Runtime) => control<Counts>(r, '/counts');
const evidence: Record<string, unknown> = {};
const sizes: Record<number, number> = { 320: 720, 390: 844, 768: 1024, 1440: 1050 };
/** Full-page captures at each width; every width must fit without horizontal page scroll. */
const capture = async (page: Page, name: string, widths = [390, 1440]) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: sizes[width] ?? 900 });
    await page.screenshot({
      path: `docs/verification/P21/screenshots/${name}-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${name} at ${width}px has no horizontal scroll`,
    ).toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 1050 });
};
const login = async (page: Page, who: string) => {
  await page.goto('/api/test/p21-login/' + who);
  await expect(page).toHaveURL(/\/settlements$/);
};
/** Drop the confirmation response after the server committed it: the browser sees no answer. */
async function dropNext(page: Page, pattern: string) {
  let dropped!: () => void;
  const done = new Promise<void>((resolve) => (dropped = resolve));
  await page.route(pattern, async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    await route.fetch();
    await route.abort('failed');
    dropped();
  });
  return async () => {
    await done;
    await page.unroute(pattern);
  };
}
async function confirm(page: Page, reason: string) {
  await page.getByLabel('سبب التسوية (مطلوب)').fill(reason);
  await page.getByRole('button', { name: 'تأكيد التسوية' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'تأكيد نهائي' }).click();
}

test('settlement journey: product delta, stale review, cash hold and typed expense, lost response, blocked, already resolved and denied', async ({
  page,
}) => {
  const r = runtime();
  evidence['fixtures'] = Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'secret'));
  const start = await counts(r);
  expect(start).toMatchObject({ cases: 0, blue: 12, cash: '100000', held: '0' });
  await login(page, 'admin');
  await expect(page.getByRole('heading', { name: 'التسويات والتصحيحات' })).toBeVisible();
  await expect(page.getByText('لم تُسجل تسويات بعد.')).toBeVisible();
  await capture(page, 'list-empty');
  await page.getByRole('link', { name: 'بدء تسوية جديدة' }).click();
  const targets = page.getByRole('list', { name: 'اختر هدف التسوية' });
  await expect(targets.getByRole('link')).toHaveCount(7);
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await capture(page, 'targets', [320, 390, 768, 1440]);

  // 1) A01 at the browser: 12 recorded, 10 found; one signed −2 movement after a stale review.
  await targets.getByRole('link', { name: /كمية منتج/ }).click();
  await page.getByLabel('المنتج والصنف').selectOption(r.blue);
  await page.getByLabel('الكمية الفعلية').fill('10');
  await page.getByRole('button', { name: 'مراجعة الأثر' }).click();
  const preview = page.locator('.settlement-preview');
  await expect(preview.getByRole('row', { name: /الكمية السليمة/ })).toContainText('١٢');
  await expect(preview.getByRole('row', { name: /الكمية السليمة/ })).toContainText('١٠');
  await expect(page.getByRole('button', { name: 'تأكيد التسوية' })).toBeDisabled();
  await capture(page, 'product-preview', [320, 390, 768, 1440]);
  // Another user's genuine receipt lands after review: nothing is recorded, the new effect shows.
  await control(r, '/receive?quantity=1');
  await confirm(page, 'جرد يدوي خارج النظام: الموجود الفعلي 10');
  await expect(page.getByText(/تغيرت البيانات بعد مراجعتك/)).toBeVisible();
  await expect(preview.getByRole('row', { name: /الكمية السليمة/ })).toContainText('١٣');
  expect((await counts(r)).cases).toBe(0);
  await capture(page, 'stale-review', [390]);
  await page.getByRole('button', { name: 'تأكيد التسوية' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'تأكيد نهائي' }).click();
  await expect(page.getByText(/تم تأكيد ملاحظة كمية فعلية برقم حالة/)).toBeVisible();
  const afterProduct = await counts(r);
  expect(afterProduct).toMatchObject({ cases: 1, resolutions: 1, blue: 10 });
  await capture(page, 'product-case');
  evidence['productCase'] = page.url();

  // 2) A03 cash 1000 observed 900: the response is lost after commit and recovered once.
  await page.goto('/settlements/new?target=account');
  await page.getByLabel('الحساب').selectOption(r.cash);
  await page.getByLabel('الرصيد الفعلي الملاحظ (ج.م)').fill('900');
  await page.getByRole('button', { name: 'مراجعة الأثر' }).click();
  await expect(preview.getByRole('row', { name: /رصيد الدفتر/ })).toContainText('1000.00');
  await expect(preview.getByRole('row', { name: /حجز العجز/ })).toContainText('100.00');
  await capture(page, 'account-preview', [390, 1440]);
  const recovered = await dropNext(page, '**/api/v1/settlements/commands');
  await confirm(page, 'عد الخزنة الفعلي 900 مقابل دفتر 1000');
  await recovered();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('alert')).toContainText('لم تصل النتيجة');
  await expect(dialog.getByRole('button', { name: 'تأكيد نهائي' })).toBeDisabled();
  expect(await counts(r)).toMatchObject({ cases: 2, held: '10000', cash: '100000' });
  await capture(page, 'unknown-result', [390]);
  await dialog.getByRole('button', { name: 'التحقق من النتيجة' }).click();
  await expect(page.getByText(/تم تأكيد ملاحظة رصيد فعلي برقم حالة/)).toBeVisible();
  expect(await counts(r)).toMatchObject({ cases: 2, resolutions: 2, held: '10000' });
  const accountCase = page.url();
  await expect(page.getByText('حجز العجز النشط')).toBeVisible();
  await capture(page, 'account-case-open', [390, 1440]);

  // 3) Blocked: a second observation of the same account while one is open.
  await page.goto('/settlements/new?target=account');
  await page.getByLabel('الحساب').selectOption(r.cash);
  await page.getByLabel('الرصيد الفعلي الملاحظ (ج.م)').fill('850');
  await page.getByRole('button', { name: 'مراجعة الأثر' }).click();
  await expect(preview.getByRole('alert')).toContainText('يوجد فرق مفتوح لهذا الحساب');
  await page.getByLabel('سبب التسوية (مطلوب)').fill('محاولة ثانية');
  await expect(page.getByRole('button', { name: 'تأكيد التسوية' })).toBeDisabled();
  await capture(page, 'blocked', [390]);

  // 4) The missed expense 100 replaces the hold: book 900, hold 0, available 900 (never 800).
  await page.goto(accountCase);
  await page.getByRole('link', { name: 'تسوية الفرق' }).click();
  await page.getByLabel('المبلغ (ج.م)').fill('100');
  await page.getByLabel('فئة المصروف').selectOption(r.category);
  await page.getByLabel('وصف المصروف').fill('أجرة نقل دفعت ولم تسجل');
  await page.getByRole('button', { name: 'مراجعة الأثر' }).click();
  await expect(preview.getByRole('row', { name: /المتاح للصرف/ })).toContainText('900.00');
  await capture(page, 'account-resolution-preview', [390, 1440]);
  await confirm(page, 'إيصال أجرة النقل وُجد بعد العد');
  await expect(page.getByText(/تم تأكيد تسوية فرق حساب برقم حالة/)).toBeVisible();
  const afterExpense = await counts(r);
  expect(afterExpense).toMatchObject({ cash: '90000', held: '0', resolutions: 3 });
  expect(afterExpense.movements).toBe(afterProduct.movements + 1);
  await capture(page, 'account-case-resolved', [390, 1440]);

  // 5) Already resolved: a second resolution of the same case is impossible.
  const caseId = new URL(accountCase).pathname.split('/').at(-1)!;
  await page.goto('/settlements/new?target=account&caseId=' + caseId);
  await page.getByLabel('نوع التسوية').selectOption('company_loss');
  await page.getByLabel('المبلغ (ج.م)').fill('10');
  await page.getByRole('button', { name: 'مراجعة الأثر' }).click();
  await expect(preview.getByRole('alert')).toContainText('سُويت بالفعل');
  await page.getByLabel('سبب التسوية (مطلوب)').fill('تكرار');
  await expect(page.getByRole('button', { name: 'تأكيد التسوية' })).toBeDisabled();
  expect(await counts(r)).toEqual(afterExpense);
  await capture(page, 'already-resolved', [390]);

  // 6) Case list with filters on mobile.
  await page.goto('/settlements?state=resolved');
  await expect(page.locator('.settlement-cards li')).toHaveCount(2);
  await capture(page, 'list', [320, 390, 768, 1440]);

  // 7) Denied: the branch assignment is revoked after the form loaded; nothing is recorded.
  await login(page, 'scoped');
  await page.goto('/settlements/new?target=product');
  await page.getByLabel('المنتج والصنف').selectOption(r.blue);
  await page.getByLabel('الكمية الفعلية').fill('9');
  await control(r, '/branch?branch=A&assign=false');
  await page.getByRole('button', { name: 'مراجعة الأثر' }).click();
  await expect(page.getByRole('alert').first()).toContainText(
    /خارج صلاحياتك|غير متاح ضمن صلاحياتك/,
  );
  expect(await counts(r)).toEqual(afterExpense);
  await capture(page, 'denied-scope', [390]);
  await control(r, '/branch?branch=A&assign=true');
  // A user without the settlements screen cannot read cases.
  await page.goto('/api/test/p21-login/staffA');
  await expect(page.getByText('حجز العجز النشط')).toHaveCount(0);
  await expect(page.locator('.settlement-cards li')).toHaveCount(0);
  await capture(page, 'denied-screen', [390]);
  evidence['settlementCounts'] = await counts(r);
});

test('opening journey: one typed batch, lost response recovered once, duplicate blocked, pending brand stays pending', async ({
  page,
}) => {
  const r = runtime();
  const before = await counts(r);
  await login(page, 'admin');
  await page.goto('/settings/opening-balances');
  await expect(page.getByRole('heading', { name: 'الأرصدة الافتتاحية' })).toBeVisible();
  await expect(page.getByText('لا توجد أرصدة افتتاحية')).toBeVisible();
  await capture(page, 'opening-empty', [390, 1440]);
  await page.getByRole('link', { name: 'تسجيل دفعة أرصدة افتتاحية' }).click();
  await page.getByLabel('وصف الدفعة').fill('أرصدة الشركة قبل التشغيل على النظام');
  await page.getByLabel('المستند أو المصدر (اختياري)').fill('دفتر الخزينة الورقي');
  const add = async (kind: string) => {
    await page.getByLabel('نوع البند التالي').selectOption(kind);
    await page.getByRole('button', { name: 'إضافة بند' }).click();
    return page.locator('.opening-line').last();
  };
  let line = await add('account_balance');
  await line.getByLabel('الحساب').selectOption(r.openingCash);
  await line.getByLabel('المبلغ (ج.م)').fill('500');
  line = await add('brand_eligible_credit');
  await line.getByLabel('البراند').selectOption(r.brand);
  await line.getByLabel('المبلغ (ج.م)').fill('200');
  line = await add('employee_obligation');
  await line.getByLabel('الموظف').selectOption(r.openingEmployee);
  await line.getByLabel('المبلغ (ج.م)').fill('100');
  line = await add('stock_sound');
  await line.getByLabel('البراند والصنف').selectOption(r.openingGreen);
  await line.getByLabel('الكمية').fill('3');
  await capture(page, 'opening-form', [390, 1440]);
  await page.getByRole('button', { name: 'مراجعة الدفعة' }).click();
  const review = page.locator('.settlement-preview');
  await expect(review.getByText(/لا تُنشئ أي إيراد أو مصروف تشغيل/)).toBeVisible();
  await expect(review.locator('.settlement-rows li')).toHaveCount(4);
  await capture(page, 'opening-preview', [320, 390, 768, 1440]);
  await page.getByRole('button', { name: 'تأكيد الدفعة' }).click();
  const recovered = await dropNext(page, '**/api/v1/settlements/opening/commands');
  await page.getByRole('dialog').getByRole('button', { name: 'تسجيل نهائي' }).click();
  await recovered();
  expect(await counts(r)).toMatchObject({ batches: 1, openingLines: 4 });
  await page.getByRole('dialog').getByRole('button', { name: 'التحقق من النتيجة' }).click();
  await expect(page.getByText(/سُجلت دفعة الأرصدة الافتتاحية رقم .* مرة واحدة/)).toBeVisible();
  const opened = await counts(r);
  expect(opened).toMatchObject({
    batches: 1,
    openingLines: 4,
    openingCash: '50000',
    green: 3,
    openingMovements: 1,
    operatingEffects: before.operatingEffects,
    cash: before.cash,
  });
  await expect(page.getByText(/قيد الرصيد:/)).toHaveCount(3);
  await expect(page.getByText(/حركة المخزون:/)).toHaveCount(1);
  await capture(page, 'opening-detail', [390, 1440]);
  evidence['openingBatch'] = page.url();

  // Duplicate: the same account cannot receive a second opening.
  await page.goto('/settings/opening-balances/new');
  await page.getByLabel('وصف الدفعة').fill('محاولة تكرار');
  line = await add('account_balance');
  await line.getByLabel('الحساب').selectOption(r.openingCash);
  await line.getByLabel('المبلغ (ج.م)').fill('500');
  await page.getByRole('button', { name: 'مراجعة الدفعة' }).click();
  await expect(review.getByRole('alert')).toContainText('مسجل سابقًا في الدفعة رقم');
  await expect(page.getByRole('button', { name: 'تأكيد الدفعة' })).toBeDisabled();
  await capture(page, 'opening-duplicate', [390]);
  expect(await counts(r)).toEqual(opened);

  // An unresolved brand amount entered separately stays pending (driver-held), not payout-ready.
  await page.goto('/settings/opening-balances/new');
  await page.getByLabel('وصف الدفعة').fill('مستحقات براند لدى المناديب غير محصلة');
  line = await add('brand_pending_driver_held');
  await line.getByLabel('البراند').selectOption(r.brand);
  await line.getByLabel('المبلغ (ج.م)').fill('50');
  await page.getByRole('button', { name: 'مراجعة الدفعة' }).click();
  await expect(review.locator('.settlement-rows li')).toContainText('معلق لدى المناديب');
  await page.getByRole('button', { name: 'تأكيد الدفعة' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'تسجيل نهائي' }).click();
  await expect(page.getByText(/سُجلت دفعة الأرصدة الافتتاحية رقم/)).toBeVisible();
  expect(await counts(r)).toMatchObject({ batches: 2, openingLines: 5 });
  await page.goto('/settings/opening-balances');
  await expect(page.locator('.settlement-cards li')).toHaveCount(2);
  await capture(page, 'opening-list', [390, 1440]);
  evidence['openingCounts'] = await counts(r);
  writeFileSync(
    'docs/verification/P21/browser-evidence.json',
    JSON.stringify(evidence, null, 2) + '\n',
  );
});
