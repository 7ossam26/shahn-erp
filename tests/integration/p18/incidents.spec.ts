import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
interface Runtime {
  secret: string;
  companyId: string;
  branchA: string;
  brandId: string;
  cairo: string;
  employeeId: string;
  protectedMonth: string;
  full: string;
  partial: string;
}
const runtime = () => JSON.parse(readFileSync('tests/.p18-runtime.json', 'utf8')) as Runtime;
const counts = async (r: Runtime) =>
  (await (
    await fetch('http://127.0.0.1:4382/counts', { headers: { 'x-test-secret': r.secret } })
  ).json()) as {
    effects: number;
    lots: number;
    obligations: number;
    confirmations: number;
    cash: number;
  };
const capture = async (page: Page, name: string, widths = [390, 1440]) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: width === 1440 ? 1050 : 844 });
    await page.screenshot({
      path: `docs/verification/P18/screenshots/${name}-${width}.png`,
      fullPage: true,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.setViewportSize({ width: 1440, height: 1050 });
};
const longReason = 'فحص فعلي للقطعة المتأثرة مع وصف طويل للسبب والحالة الظاهرة '.repeat(8);
async function report(page: Page, r: Runtime, shipmentId: string, quantity: string) {
  await page.goto('/incidents/new?shipmentId=' + shipmentId + '&brandId=' + r.brandId);
  // Type only after the session shell and the actual custody candidates have loaded.
  await page.getByLabel(/^الكمية المتأثرة/).fill(quantity);
  await page.getByLabel('الحالة والسبب').fill(longReason);
  await page.getByLabel('الدليل أو مرجعه').fill('صورة الفحص رقم ١٢');
  await page.getByLabel('ملاحظات').fill('ملاحظة طويلة عن الفحص والحيازة '.repeat(10));
}
test('real API/DB incident: report holds without money, protected period, lost confirm recovered once, eligible credit and company-funded replacement', async ({
  page,
}) => {
  const r = runtime();
  await page.goto('/api/test/p18-login/admin');
  const start = await counts(r);
  // Partial damage: one of two pieces, long Arabic reasons, no financial effect, then dismissal.
  await report(page, r, r.partial, '١');
  await expect(page.getByText('مطالب به 0')).toBeVisible();
  await capture(page, 'report-partial', [320, 390, 768, 1440]);
  await page.getByRole('button', { name: 'تسجيل البلاغ دون تعويض' }).click();
  await expect(page).toHaveURL(/\/incidents\/[0-9a-f-]{36}$/);
  await expect(page.getByText('بلاغ بانتظار المراجعة').first()).toBeVisible();
  await expect(page.getByText(/المتأثر 1 قطعة/)).toBeVisible();
  expect(await counts(r)).toEqual(start);
  await capture(page, 'reported-partial');
  await page.goto('/incidents/new?shipmentId=' + r.partial + '&brandId=' + r.brandId);
  await expect(page.getByText('مطالب به 1')).toBeVisible();
  await page.goBack();
  await page.getByLabel('سبب رفض البلاغ').fill('لم يثبت التلف بعد الفحص الثاني '.repeat(6));
  await page.getByRole('button', { name: 'رفض البلاغ دون حركة مالية' }).click();
  await expect(page.getByText(/سبب الرفض:/)).toBeVisible();
  expect(await counts(r)).toEqual(start);
  // Complete damage 400 with a 200/200 split.
  await report(page, r, r.full, '2');
  await page.getByRole('button', { name: 'تسجيل البلاغ دون تعويض' }).click();
  await expect(page).toHaveURL(/\/incidents\/[0-9a-f-]{36}$/);
  const incidentUrl = page.url();
  expect(await counts(r)).toEqual(start);
  await page.getByLabel('قيمة البضاعة المتأثرة (ج.م)').fill('٤٠٠');
  await page.getByLabel('التعويض المتفق عليه (ج.م)').fill('400');
  await page.getByLabel('حصة الشركة (ج.م)').fill('199');
  await page.getByLabel('حصة الموظف (ج.م)').fill('200');
  await expect(page.getByText('يجب أن يساوي مجموع الحصتين مبلغ التعويض.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'معاينة آثار التأكيد' })).toBeDisabled();
  await page.getByLabel('حصة الشركة (ج.م)').fill('200');
  await page.getByLabel('الموظف المسؤول').selectOption(r.employeeId);
  await page.getByLabel('أساس القيمة واتفاق المسؤولية').fill(longReason);
  await page.getByRole('button', { name: 'معاينة آثار التأكيد' }).click();
  const review = page.getByRole('region', { name: 'آثار تأكيد التعويض' });
  await expect(review.getByRole('alert')).toContainText('الفترة محمية');
  await expect(review.getByRole('button', { name: 'تأكيد التعويض والمسؤولية' })).toBeDisabled();
  await capture(page, 'protected-period');
  await review.getByRole('button', { name: /استخدام الفترة المسموحة/ }).click();
  await expect(page.getByLabel('فترة الالتزام')).not.toHaveValue(r.protectedMonth);
  await page.getByRole('button', { name: 'معاينة آثار التأكيد' }).click();
  await expect(review.getByText('400.00 ج.م').first()).toBeVisible();
  await expect(review.getByText('0 ج.م', { exact: true })).toBeVisible();
  await expect(review.getByRole('alert')).toHaveCount(0);
  await capture(page, 'confirmation-review', [320, 390, 768, 1440]);
  expect(await counts(r)).toEqual(start);
  // Commit, then drop the response: the same command is recovered, never resubmitted as new.
  let dropped!: () => void;
  const responseDropped = new Promise<void>((resolve) => (dropped = resolve));
  await page.route('**/api/v1/incidents/*/confirm', async (route) => {
    await route.fetch();
    await route.abort('failed');
    dropped();
  });
  await review.getByRole('button', { name: 'تأكيد التعويض والمسؤولية' }).click();
  await responseDropped;
  await page.unroute('**/api/v1/incidents/*/confirm');
  await expect(page.getByRole('button', { name: 'التحقق من النتيجة' })).toBeEnabled();
  // The server committed once; the page shows unknown status instead of success or a resubmit.
  expect((await counts(r)).confirmations).toBe(start.confirmations + 1);
  await capture(page, 'unknown-result', [390]);
  await page.getByRole('button', { name: 'التحقق من النتيجة' }).click();
  await expect(page.getByRole('heading', { name: 'الآثار المؤكدة' })).toBeVisible();
  await expect(
    page.getByText(/تعويض 400\.00 ج\.م · حصة الشركة 200\.00 · حصة الموظف 200\.00/),
  ).toBeVisible();
  expect(await counts(r)).toEqual({
    effects: start.effects + 4,
    lots: start.lots + 1,
    obligations: start.obligations + 1,
    confirmations: start.confirmations + 1,
    cash: start.cash,
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'الآثار المؤكدة' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'تأكيد التعويض والمسؤولية' })).toHaveCount(0);
  await capture(page, 'confirmed');
  // Eligible brand credit through P17, independent of payroll recovery.
  await page.getByRole('link', { name: 'رصيد البراند والتعويض المؤهل' }).click();
  await expect(page.getByText('تعويض مؤكد').first()).toBeVisible();
  await page.goto(incidentUrl);
  // Ordinary new replacement intake with company-funded shipping.
  await page.getByRole('link', { name: 'تسجيل شحنة بديلة جديدة' }).click();
  await expect(page.getByText('شحنة بديلة مرتبطة بواقعة مؤكدة')).toBeVisible();
  const payer = page.getByLabel('تمويل شحن البديل');
  expect(
    await payer.locator('option').evaluateAll((o) => o.map((x) => (x as HTMLOptionElement).value)),
  ).toEqual(['recipient', 'brand', 'company']);
  await page.getByLabel('فرع الاستلام').selectOption(r.branchA);
  await page.getByLabel('اسم المستلم').fill('مستلم الشحنة البديلة');
  await page.getByLabel('رقم الهاتف').fill('٠١٠ (١٢٣٤) ٥٦٧٨');
  await page.getByLabel('المحافظة', { exact: true }).selectOption(r.cairo);
  await page.getByLabel('العنوان المكتوب').fill('القاهرة — شارع البديل — منزل ٤');
  await page.getByLabel('وصف القطعة 1').fill('قطعة بديلة باستلام فعلي جديد');
  await page.getByLabel('المستحق للقطعة 1 (ج.م)').fill('250');
  await page.getByLabel('السماح بالفحص').selectOption('true');
  await payer.selectOption('company');
  await page
    .getByLabel('اتفاق الشحنة البديلة')
    .fill('الشركة تتحمل شحن البديل بموجب التعويض المؤكد');
  await page.getByRole('button', { name: 'تسجيل طرد مستلم', exact: true }).click();
  await page.getByLabel('استلمت الطرد أو بضاعته بالفعل في هذا الفرع').check();
  const money = page.locator('.intake-money').last();
  await expect(money.locator('div', { hasText: 'إعفاء شحن تتحمله الشركة' })).toContainText('50.00');
  await expect(money.locator('div', { hasText: 'شحن مستحق على المستلم' })).toContainText('0.00');
  await expect(money.locator('div', { hasText: 'شحن يموله البراند' })).toContainText('0.00');
  await expect(money.locator('div', { hasText: 'إجمالي المستلم' })).toContainText('250.00');
  await capture(page, 'replacement-review', [320, 390, 768, 1440]);
  // Full-page stitching hides the fixed mobile dialog; capture the review dialog itself.
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page
      .getByRole('dialog')
      .screenshot({ path: `docs/verification/P18/screenshots/replacement-dialog-${width}.png` });
  }
  await page.setViewportSize({ width: 1440, height: 1050 });
  const beforeReplacement = await counts(r);
  await page.getByRole('button', { name: 'تأكيد تسجيل الطرد', exact: true }).click();
  await expect(page).toHaveURL(/\/shipments\/\d+$/);
  await expect(page.getByRole('link', { name: 'البلاغ المرتبط بالشحنة البديلة' })).toBeVisible();
  // Creation earns no fee, waiver or commission; those wait for an eligible visit.
  expect((await counts(r)).effects).toBe(beforeReplacement.effects);
  await capture(page, 'replacement-detail');
  await page.goto(incidentUrl);
  await expect(page.getByRole('link', { name: /الشحنة البديلة .* تتحمله الشركة/ })).toBeVisible();
});
