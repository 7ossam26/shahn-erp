import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
interface Runtime {
  secret: string;
  companyId: string;
  branchA: string;
  branchB: string;
  partial: { brandId: string; agreementId: string };
  advance: { brandId: string; agreementId: string };
  leap: { brandId: string; agreementId: string };
}
type Counts = {
  periods: number;
  receipts: number;
  allocations: number;
  refunds: number;
  movements: number;
  walletEffects: number;
  aCash: string;
  bCash: string;
  bank: string;
};
const runtime = () => JSON.parse(readFileSync('tests/.p19-runtime.json', 'utf8')) as Runtime;
const control = async <T = unknown>(r: Runtime, path: string): Promise<T> => {
  const res = await fetch('http://127.0.0.1:4392' + path, {
    headers: { 'x-test-secret': r.secret },
  });
  if (!res.ok) throw new Error('control ' + path + ' ' + res.status + ' ' + (await res.text()));
  return (await res.json()) as T;
};
const counts = (r: Runtime) => control<Counts>(r, '/counts');
const capture = async (page: Page, name: string, widths = [390, 1440]) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: width === 1440 ? 1050 : 844 });
    await page.screenshot({
      path: `docs/verification/P19/screenshots/${name}-${width}.png`,
      fullPage: true,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.setViewportSize({ width: 1440, height: 1050 });
};
const login = async (page: Page, who: string) => {
  await page.goto('/api/test/p19-login/' + who);
  await expect(page.getByRole('heading', { name: 'اشتراكات التخزين' })).toBeVisible();
};
async function openAgreement(page: Page, name: RegExp) {
  await page.getByRole('link', { name }).click();
  await expect(page.getByRole('link', { name: 'تسجيل تحصيل', exact: true })).toBeVisible();
}
async function fillMoney(
  page: Page,
  account: string,
  amount: string,
  date: string,
  method?: string,
) {
  if (method) await page.getByLabel('طريقة الدفع').selectOption(method);
  await page.getByLabel('الحساب', { exact: true }).selectOption({ label: account });
  await page.getByLabel('المبلغ بالجنيه').fill(amount);
  await page.getByLabel(/^تاريخ (الاستلام|الصرف) الفعلي$/).fill(date);
}
test('storage journey: advance, partial, start-of-period allocation, stale review, lost response, denied scope, stop and refund', async ({
  page,
}) => {
  const r = runtime();
  const start = await counts(r);
  // 1) DOM-22: advance 500 before the service starts — credit 500, revenue 0, no period.
  await control(r, '/clock?today=2027-01-10');
  await login(page, 'storA');
  await openAgreement(page, /براند الدفع المقدم للتخزين/);
  await expect(page.getByText('لم تبدأ أي فترة بعد').first()).toBeVisible();
  await page.getByRole('link', { name: 'تسجيل تحصيل', exact: true }).click();
  await expect(page.getByLabel('اتفاق التخزين')).toHaveValue(r.advance.agreementId);
  await fillMoney(page, 'بنك الشركة التجريبي', '٥٠٠', '2027-01-10', 'instapay');
  await page.getByLabel('مرجع التحويل — اختياري').fill('IP-ADV-500');
  await page.getByRole('button', { name: 'مراجعة التوزيع' }).click();
  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByText('لا توجد فترات مستحقة الآن؛ يبقى المبلغ كاملًا رصيدًا مقدمًا.'),
  ).toBeVisible();
  await expect(dialog.getByText('500.00 ج.م').first()).toBeVisible();
  const confirm = dialog.getByRole('button', { name: 'تأكيد التحصيل الفعلي' });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel('استلمت الشركة هذا المبلغ فعليًا').check();
  await capture(page, 'advance-review', [320, 390, 1440]);
  await confirm.click();
  await expect(page.getByText(/تم تسجيل الإيصال رقم/)).toBeVisible();
  const credit = page.getByRole('region', { name: 'رصيد التخزين المقدم' });
  await expect(credit.getByText('500.00 ج.م').first()).toBeVisible();
  await expect(page.getByText('لم تبدأ أي فترة بعد').first()).toBeVisible();
  const afterAdvance = await counts(r);
  expect(afterAdvance).toMatchObject({
    receipts: start.receipts + 1,
    movements: start.movements + 1,
    periods: 0,
  });
  // 2) DOM-21: January 20 period at branch A; partial 100 received into branch B cash.
  await control(r, '/clock?today=2027-01-20');
  await control(r, '/renew');
  await login(page, 'storB');
  await expect(page.getByRole('link', { name: /براند التخزين الجزئي/ })).toContainText('310.00');
  await openAgreement(page, /براند التخزين الجزئي/);
  const period = page
    .getByRole('region', { name: 'فترات الاشتراك' })
    .getByRole('listitem')
    .filter({ hasText: '٢٠ يناير ٢٠٢٧ – ١٩ فبراير ٢٠٢٧' });
  await expect(period).toContainText('غير مدفوعة');
  await expect(period).toContainText('إيراد يناير ٢٠٢٧ كاملًا');
  await capture(page, 'detail-unpaid', [320, 390, 768, 1440]);
  await page.getByRole('link', { name: 'تسجيل تحصيل', exact: true }).click();
  await fillMoney(page, 'خزنة الفرع ب', '100', '2027-01-20');
  await page.getByRole('button', { name: 'مراجعة التوزيع' }).click();
  await expect(dialog.getByRole('listitem')).toContainText('يُخصص 100.00 ج.م');
  await expect(dialog.getByRole('listitem')).toContainText('ويصبح 210.00 ج.م');
  await dialog.getByLabel('استلمت الشركة هذا المبلغ فعليًا').check();
  await capture(page, 'partial-review', [320, 390, 1440]);
  await dialog.getByRole('button', { name: 'تأكيد التحصيل الفعلي' }).click();
  await expect(page.getByText(/المتبقي المستحق 210\.00 ج\.م/)).toBeVisible();
  await expect(period).toContainText('مدفوعة جزئيًا');
  await expect(period).toContainText('210.00 ج.م');
  const afterPartial = await counts(r);
  expect(BigInt(afterPartial.bCash) - BigInt(afterAdvance.bCash)).toBe(10000n);
  expect(afterPartial.aCash).toBe(afterAdvance.aCash);
  expect(afterPartial.walletEffects).toBe(start.walletEffects);
  await capture(page, 'detail-partial');
  // 3) DOM-22 continued: at February 1 the renewal applies 310 of credit with no new cash.
  await control(r, '/clock?today=2027-02-01');
  await control(r, '/renew');
  await page.goto('/storage/' + r.advance.agreementId);
  const febPeriod = page
    .getByRole('region', { name: 'فترات الاشتراك' })
    .getByRole('listitem')
    .filter({ hasText: '١ فبراير ٢٠٢٧ – ٢٨ فبراير ٢٠٢٧' });
  await expect(febPeriod).toContainText('مدفوعة');
  await expect(febPeriod).toContainText('عند بداية الفترة');
  await expect(febPeriod).toContainText('إيراد فبراير ٢٠٢٧ كاملًا');
  await expect(credit.getByText('190.00 ج.م').first()).toBeVisible();
  expect((await counts(r)).movements).toBe(afterPartial.movements);
  await capture(page, 'detail-advance-allocated');
  // 4) Stale review: another user's receipt changes the allocation; a new review is required.
  await page.goto('/storage/payments/new?agreementId=' + r.partial.agreementId);
  await fillMoney(page, 'خزنة الفرع ب', '50', '2027-02-01');
  await page.getByRole('button', { name: 'مراجعة التوزيع' }).click();
  await expect(dialog.getByRole('listitem')).toContainText('ويصبح 160.00 ج.م');
  await dialog.getByLabel('استلمت الشركة هذا المبلغ فعليًا').check();
  await control(r, '/external-payment?brand=' + r.partial.brandId + '&amount=1000');
  const beforeStale = await counts(r);
  await dialog.getByRole('button', { name: 'تأكيد التحصيل الفعلي' }).click();
  await expect(dialog.getByRole('alert').first()).toContainText(
    'تغيّر رصيد التخزين أو الفترات المستحقة',
  );
  await expect(dialog.getByRole('listitem')).toContainText('ويصبح 150.00 ج.م');
  expect((await counts(r)).receipts).toBe(beforeStale.receipts);
  await capture(page, 'stale-review', [390, 1440]);
  await dialog.getByLabel('استلمت الشركة هذا المبلغ فعليًا').check();
  await dialog.getByRole('button', { name: 'تأكيد التحصيل الفعلي' }).click();
  await expect(page.getByText(/المتبقي المستحق 150\.00 ج\.م/)).toBeVisible();
  // 5) Lost response: the committed receipt is recovered with the same command, never repeated.
  await page.goto('/storage/payments/new?agreementId=' + r.partial.agreementId);
  await fillMoney(page, 'خزنة الفرع ب', '20', '2027-02-01');
  await page.getByRole('button', { name: 'مراجعة التوزيع' }).click();
  await dialog.getByLabel('استلمت الشركة هذا المبلغ فعليًا').check();
  let dropped!: () => void;
  const responseDropped = new Promise<void>((resolve) => (dropped = resolve));
  await page.route('**/api/v1/storage/payments', async (route) => {
    await route.fetch();
    await route.abort('failed');
    dropped();
  });
  const beforeLost = await counts(r);
  await dialog.getByRole('button', { name: 'تأكيد التحصيل الفعلي' }).click();
  await responseDropped;
  await page.unroute('**/api/v1/storage/payments');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'التحقق من النتيجة' })).toBeVisible();
  expect((await counts(r)).receipts).toBe(beforeLost.receipts + 1);
  await capture(page, 'unknown-result', [390]);
  await page.getByRole('button', { name: 'التحقق من النتيجة' }).click();
  await expect(page.getByText(/تم تسجيل الإيصال رقم/)).toBeVisible();
  expect(await counts(r)).toEqual({
    ...beforeLost,
    receipts: beforeLost.receipts + 1,
    allocations: beforeLost.allocations + 1,
    movements: beforeLost.movements + 1,
    bCash: (BigInt(beforeLost.bCash) + 2000n).toString(),
  });
  // 6) Denied account authority after the form loaded: nothing is recorded.
  await login(page, 'storAB');
  await page.goto('/storage/payments/new?agreementId=' + r.partial.agreementId);
  await page.getByLabel('فرع الاستلام').selectOption({ label: 'الفرع ب' });
  await fillMoney(page, 'خزنة الفرع ب', '10', '2027-02-01');
  await control(r, '/branch?user=storAB&branch=B&assign=false');
  const beforeDenied = await counts(r);
  await page.getByRole('button', { name: 'مراجعة التوزيع' }).click();
  await expect(page.getByRole('alert').first()).toContainText('خارج صلاحياتك');
  expect(await counts(r)).toEqual(beforeDenied);
  await capture(page, 'denied-scope', [390]);
  await control(r, '/branch?user=storAB&branch=B&assign=true');
  // 7) Stop the advance agreement after its current period; credit and history survive.
  await login(page, 'storA');
  await page.goto('/storage/' + r.advance.agreementId);
  await page.getByText('إجراءات أخرى').click();
  await page.getByRole('link', { name: 'إيقاف التجديد بعد الفترة الحالية' }).click();
  await expect(page.getByText('٢٨ فبراير ٢٠٢٧').first()).toBeVisible();
  const stop = page.getByRole('button', { name: 'إيقاف التجديد' });
  await expect(stop).toBeDisabled();
  await page.getByLabel('أفهم أن الإيقاف ليس استردادًا وأن المتأخرات والرصيد يبقيان').check();
  await capture(page, 'stop', [390, 1440]);
  await stop.click();
  await expect(page.getByText(/تم إيقاف التجديد/)).toBeVisible();
  await expect(credit.getByText('190.00 ج.م').first()).toBeVisible();
  // 8) Refund 50 of unallocated credit; the dropped response is recovered with one cash-out.
  await page.getByText('إجراءات أخرى').click();
  await page.getByRole('link', { name: 'استرداد رصيد تخزين غير مخصص' }).click();
  await fillMoney(page, 'خزنة الفرع أ', '50', '2027-02-01');
  await page
    .getByLabel('سبب الاسترداد')
    .fill('طلب البراند استرداد جزء من الرصيد المقدم بعد إيقاف التجديد '.repeat(3));
  await page.getByRole('button', { name: 'مراجعة الاسترداد' }).click();
  await expect(dialog.getByText(/إيصال رقم/)).toBeVisible();
  await dialog.getByLabel('صُرف هذا المبلغ فعليًا من الحساب المختار').check();
  await capture(page, 'refund-review', [390, 1440]);
  let refundDropped!: () => void;
  const refundLost = new Promise<void>((resolve) => (refundDropped = resolve));
  await page.route('**/api/v1/storage/credit-refunds', async (route) => {
    await route.fetch();
    await route.abort('failed');
    refundDropped();
  });
  const beforeRefund = await counts(r);
  await dialog.getByRole('button', { name: 'تأكيد الصرف الفعلي' }).click();
  await refundLost;
  await page.unroute('**/api/v1/storage/credit-refunds');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'التحقق من النتيجة' }).click();
  await expect(page.getByText(/تم تسجيل استرداد رقم/)).toBeVisible();
  const afterRefund = await counts(r);
  expect(afterRefund.refunds).toBe(beforeRefund.refunds + 1);
  expect(BigInt(beforeRefund.aCash) - BigInt(afterRefund.aCash)).toBe(5000n);
  await expect(credit.getByText('140.00 ج.م').first()).toBeVisible();
  // 9) Allocated money is not refundable here: the review blocks and nothing changes.
  await page.goto('/storage/' + r.advance.agreementId + '/refund');
  await fillMoney(page, 'خزنة الفرع أ', '200', '2027-02-01');
  await page.getByLabel('سبب الاسترداد').fill('محاولة استرداد مبلغ مخصص لفترة');
  await page.getByRole('button', { name: 'مراجعة الاسترداد' }).click();
  await expect(dialog.getByRole('alert').first()).toContainText('مخصص لفترات تخزين مستحقة');
  await dialog.getByLabel('صُرف هذا المبلغ فعليًا من الحساب المختار').check();
  await expect(dialog.getByRole('button', { name: 'تأكيد الصرف الفعلي' })).toBeDisabled();
  expect(await counts(r)).toEqual(afterRefund);
  // 10) The worker never renews after the stop boundary.
  await control(r, '/clock?today=2027-03-05');
  await control(r, '/renew');
  await page.goto('/storage/' + r.advance.agreementId);
  await expect(
    page
      .getByRole('region', { name: 'فترات الاشتراك' })
      .getByRole('listitem')
      .filter({ hasText: '١ مارس ٢٠٢٧' }),
  ).toHaveCount(0);
  const reconciliation = await control<
    { unallocatedMinor: string; receiptsMinor: string; movementReceiptsMinor: string }[]
  >(r, '/reconcile');
  for (const row of reconciliation) {
    expect(row.movementReceiptsMinor).toBe(row.receiptsMinor);
    expect(BigInt(row.unallocatedMinor) >= 0n).toBe(true);
  }
});
test('filters keep their query on back navigation, phone filters use a dialog, and unauthorized users see no storage money', async ({
  page,
}) => {
  await login(page, 'storB');
  await page.getByText('فلاتر متقدمة').click();
  await page.getByLabel('المتأخرات').selectOption('true');
  await expect(page).toHaveURL(/overdue=true/);
  await expect(page.getByRole('link', { name: /براند التخزين الجزئي/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /براند الدفع المقدم/ })).toHaveCount(0);
  await capture(page, 'list-filtered', [320, 390, 768, 1440]);
  await page.getByRole('link', { name: /براند التخزين الجزئي/ }).click();
  await page.getByRole('link', { name: 'العودة للقائمة' }).click();
  await expect(page).toHaveURL(/overdue=true/);
  await expect(page.getByRole('link', { name: /براند الدفع المقدم/ })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'فلاتر متقدمة (1)' }).click();
  await expect(page.getByRole('dialog')).toContainText('تطبق الفلاتر على العرض فقط');
  await page.getByRole('dialog').getByRole('button', { name: 'مسح الفلاتر' }).click();
  await expect(page).not.toHaveURL(/overdue=true/);
  await expect(page.getByRole('link', { name: /براند الدفع المقدم/ })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto('/api/test/p19-login/staffA');
  await expect(page.getByRole('alert').first()).toContainText('خارج صلاحياتك');
  await expect(page.getByText('310.00 ج.م')).toHaveCount(0);
});
