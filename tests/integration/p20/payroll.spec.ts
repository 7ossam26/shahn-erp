import { readFileSync, writeFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
type Runtime = {
  secret: string;
  company: string;
  branch: string;
  cash: string;
  bank: string;
  month: string;
  today: string;
  salary: string;
  zero: string;
  stale: string;
  long: string;
  sourceCompany: string;
  sourceEmployee: string;
  sourceCash: string;
};
const runtime = () => JSON.parse(readFileSync('tests/.p20-runtime.json', 'utf8')) as Runtime;
const control = async (r: Runtime, path: string) => {
  const response = await fetch('http://127.0.0.1:4402' + path, {
    headers: { 'x-test-secret': r.secret },
  });
  if (!response.ok) throw Error(await response.text());
  return response.json();
};
const capture = async (page: Page, name: string, widths = [390, 1440]) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: width === 1440 ? 1050 : 844 });
    await page.screenshot({
      path: `docs/verification/P20/screenshots/${name}-${width}.png`,
      fullPage: true,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.setViewportSize({ width: 1440, height: 1050 });
};
test('actual advance, ordinary deduction, full net, dropped response recovery, immutable payment and long histories', async ({
  page,
}) => {
  const r = runtime();
  await page.goto('/api/test/p20-login');
  await expect(page.getByRole('heading', { name: /سلمى/ })).toBeVisible();
  await capture(page, 'month-unpaid', [320, 390, 768, 1440]);
  await page.getByRole('link', { name: 'صرف سلفة', exact: true }).click();
  await page.getByLabel('المبلغ بالجنيه').fill('١٠٠٠');
  await page.getByLabel('الحساب الممول').selectOption(r.cash);
  await page.getByRole('button', { name: 'تأكيد صرف سلفة فعلية', exact: true }).click();
  await expect(page.getByRole('link', { name: 'إضافة أو خصم', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'إضافة أو خصم', exact: true }).click();
  await page.getByLabel('نوع الإضافة أو الخصم').selectOption('earning_deduction');
  await page.getByLabel('المبلغ بالجنيه').fill('٢٠٠');
  await page.getByLabel('السبب', { exact: true }).fill('خصم يدوي عن أول شهر جزئي دون تغيير الراتب');
  await page.getByRole('button', { name: 'تأكيد إضافة أو خصم للموظف' }).click();
  await expect(page.getByRole('link', { name: 'دفع الصافي بالكامل', exact: true })).toBeVisible();
  await capture(page, 'net-4800-cost-5800');
  await page.getByRole('link', { name: 'دفع الصافي بالكامل', exact: true }).click();
  await expect(page.getByLabel('المبلغ بالجنيه')).toHaveCount(0);
  await page.getByLabel('الحساب الممول').selectOption(r.cash);
  await page.getByRole('button', { name: 'معاينة الدفع الكامل' }).click();
  await expect(page.getByRole('heading', { name: 'تأكيد دفع الصافي الكامل' })).toBeVisible();
  await capture(page, 'payout-preview');
  let lost = false;
  await page.route('**/months/*/payout', async (route) => {
    if (route.request().method() === 'POST' && !lost) {
      lost = true;
      await route.fetch();
      await route.abort('failed');
    } else await route.continue();
  });
  await page.getByRole('button', { name: 'تأكيد دفع الصافي بالكامل', exact: true }).click();
  await expect(page.getByRole('button', { name: 'تحقق من نتيجة الطلب' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'تأكيد دفع الصافي بالكامل', exact: true }),
  ).toBeDisabled();
  await capture(page, 'unknown-response', [390]);
  await page.reload();
  await page.getByRole('button', { name: 'تحقق من نتيجة الطلب' }).click();
  await expect(page.getByRole('link', { name: 'عرض تفاصيل الدفع والإقفال' })).toBeVisible();
  await page.getByRole('link', { name: 'عرض تفاصيل الدفع والإقفال' }).click();
  await capture(page, 'payment');
  await page.goto(`/employees/${r.long}/months/${r.month}`);
  await expect(page.getByRole('heading', { name: 'مصادر الاستحقاقات' })).toBeVisible();
  await capture(page, 'long-history', [390, 1440]);
  const reconciled = await control(r, '/reconcile');
  expect(reconciled).toMatchObject({ payments: '1', advances: '1', movements: '2', invalid: '0' });
  writeFileSync(
    'docs/verification/P20/browser-reconciliation.json',
    JSON.stringify(reconciled, null, 2),
  );
});
test('actual immutable visit basis and late work review approved into a future period', async ({
  page,
}) => {
  const r = runtime();
  await page.goto('/api/test/p20-source-login');
  await expect(page.getByRole('heading', { name: 'مندوب التجربة' })).toBeVisible();
  await page.getByText('المصدر والفرع التاريخي', { exact: true }).last().click();
  await expect(page.getByText('الشحن الأساسي', { exact: false })).toBeVisible();
  await capture(page, 'commission-source');
  await page.getByRole('link', { name: 'دفع الصافي بالكامل', exact: true }).click();
  await page.getByLabel('الحساب الممول').selectOption(r.sourceCash);
  await page.getByRole('button', { name: 'معاينة الدفع الكامل' }).click();
  await page.getByRole('button', { name: 'تأكيد دفع الصافي بالكامل', exact: true }).click();
  await expect(page.getByRole('link', { name: 'عرض تفاصيل الدفع والإقفال' })).toBeVisible();
  const old = await page.request.get(
      `/api/v1/employees/${r.sourceEmployee}/months/${r.month}?companyId=${r.sourceCompany}`,
    ),
    before = await old.json();
  const late = await control(r, '/late-source');
  await page.reload();
  await page.getByRole('link', { name: 'مراجعة واعتماد تسوية مرتبطة' }).click();
  const next = new Date(Date.UTC(Number(r.month.slice(0, 4)), Number(r.month.slice(5, 7)), 1))
    .toISOString()
    .slice(0, 7);
  await page.getByLabel('شهر الاسترداد أو التسوية').fill(next);
  await page
    .getByLabel('السبب', { exact: true })
    .fill('اعتماد عمولة العمل الأصلي بالشروط المحفوظة');
  await capture(page, 'late-source-review');
  await page.getByRole('button', { name: 'تأكيد اعتماد مصدر عمل قديم' }).click();
  await expect(page.getByRole('heading', { name: 'مندوب التجربة' })).toBeVisible();
  await expect(page.getByRole('strong').filter({ hasText: 'تصحيح استحقاق مرتبط' })).toBeVisible();
  const result = await page.request.get(
      `/api/v1/employees/${r.sourceEmployee}/months/${r.month}?companyId=${r.sourceCompany}`,
    ),
    after = await result.json();
  expect(after.payment).toEqual(before.payment);
  expect(after.calculation).toEqual(before.calculation);
  writeFileSync(
    'docs/verification/P20/browser-late-source.json',
    JSON.stringify(
      { late, originalPayment: after.payment, review: after.reviews, settlementMonth: next },
      null,
      2,
    ),
  );
  await capture(page, 'late-source-adjustment');
});
test('zero close, carried original balance and stale full payout preview', async ({ page }) => {
  const r = runtime();
  await page.goto('/api/test/p20-login');
  await page.goto(`/employees/${r.zero}/advances/new?month=${r.month}`);
  await page.getByLabel('المبلغ بالجنيه').fill('3500');
  await page.getByLabel('الحساب الممول').selectOption(r.cash);
  await page.getByRole('button', { name: 'تأكيد صرف سلفة فعلية', exact: true }).click();
  await expect(page.getByRole('link', { name: 'إقفال صافي صفر', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'إقفال صافي صفر', exact: true }).click();
  await expect(page.getByLabel('الحساب الممول')).toHaveCount(0);
  await capture(page, 'zero-close');
  await page.getByRole('button', { name: 'تأكيد إقفال صافي صفر', exact: true }).click();
  await expect(page.getByRole('link', { name: 'عرض تفاصيل الدفع والإقفال' })).toBeVisible();
  const next = new Date(Date.UTC(Number(r.month.slice(0, 4)), Number(r.month.slice(5, 7)), 1))
    .toISOString()
    .slice(0, 7);
  await page.goto(`/employees/${r.zero}/months/${next}`);
  await expect(page.getByText('الصافي الكامل للدفع')).toBeVisible();
  await capture(page, 'carry-500-next-net-2500');
  await page.goto(`/employees/${r.stale}/months/${r.month}/payout`);
  await page.getByLabel('الحساب الممول').selectOption(r.cash);
  await page.getByRole('button', { name: 'معاينة الدفع الكامل' }).click();
  await expect(page.getByRole('heading', { name: 'تأكيد دفع الصافي الكامل' })).toBeVisible();
  await control(r, '/adjust?employee=' + r.stale);
  await page.getByRole('button', { name: 'تأكيد دفع الصافي بالكامل', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('تغير الحساب');
  await expect(page.getByRole('alert')).toBeFocused();
  await capture(page, 'stale-preview');
});
