import { test, expect, type Page } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import ExcelJS from 'exceljs';
import type { ReportPage, ProfitSummary } from '@shahn/contracts';

type Runtime = {
  secret: string;
  companyId: string;
  a: string;
  b: string;
  from: string;
  to: string;
  initialSnapshotId: string;
  initialProfitMinor: string;
};
const fixture = async (): Promise<Runtime> =>
  JSON.parse(await readFile('tests/.p24-runtime.json', 'utf8'));
const sessionCookie = async (page: Page) =>
  (await page.context().cookies()).map((c) => `${c.name}=${c.value}`).join('; ');
const get = async (page: Page, path: string) =>
  page.request.get(path, { headers: { Cookie: await sessionCookie(page) } });
async function control(page: Page, f: Runtime, path: string) {
  const r = await page.request.get('http://127.0.0.1:4428' + path, {
    headers: { 'x-test-secret': f.secret },
  });
  expect(r.ok(), await r.text()).toBe(true);
}
async function openProfit(
  page: Page,
  f: Runtime,
  actor = 'admin',
  filters: object = { from: f.from, to: f.to, dateBasis: 'effective' },
) {
  await page.goto('/api/test/p24-login?actor=' + actor);
  await page.goto('/reports/REP-15?filters=' + encodeURIComponent(JSON.stringify(filters)));
  await expect(page.locator('.report-context').first()).toBeVisible();
  await expect.poll(() => new URL(page.url()).searchParams.get('snapshot')).toBeTruthy();
}
async function snapshot(page: Page, f: Runtime) {
  const id = new URL(page.url()).searchParams.get('snapshot')!;
  const r = await get(page, `/api/v1/reports/snapshots/${id}?companyId=${f.companyId}&limit=100`);
  expect(r.ok(), `snapshot read ${r.status()}: ${await r.text()}`).toBe(true);
  return (await r.json()) as ReportPage;
}
async function download(page: Page, format: 'xlsx' | 'pdf', path: string) {
  await page
    .getByRole('button', { name: format === 'xlsx' ? 'تصدير XLSX' : 'طباعة / PDF', exact: true })
    .click();
  const link = page.getByRole('link', { name: 'تنزيل ' + format.toUpperCase(), exact: true });
  await expect(link).toBeVisible();
  const [file] = await Promise.all([page.waitForEvent('download'), link.click()]);
  await file.saveAs(path);
}

test('A01/A05 actual6200 frozen category/back, late refresh, Arabic phone/desktop, XLSX/PDF and empty filters', async ({
  page,
}) => {
  const f = await fixture();
  expect(f.initialProfitMinor).toBe('620000');
  await openProfit(page, f);
  await expect(page.getByLabel('ملخص الربح التشغيلي')).toContainText('6200.00');
  await expect(page.getByLabel('المال الفعلي والالتزامات')).toBeVisible();
  await expect(page.locator('.report-rows article')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'التالي', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('الفلاتر المطبقة')).toContainText('فترة الاستحقاق التشغيلي');
  await expect(page.getByLabel('الفلاتر المطبقة')).not.toContainText('dateBasis');
  await page.getByText('كيف يُحسب الربح والفترة؟', { exact: true }).click();
  await expect(page.getByText(/التكلفة غير المدفوعة التي لم تُدخل/)).toBeVisible();
  await expect(page.getByLabel('أساس التاريخ')).toHaveValue('effective');
  const before = await snapshot(page, f),
    snapshotId = before.snapshot.id;
  await page.getByRole('link', { name: /تعريفة الشحن والتغليف.*عرض التفاصيل/ }).click();
  await expect(
    page.getByRole('heading', { name: 'تعريفة الشحن والتغليف', exact: true }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.get('snapshot')).toBe(snapshotId);
  await expect(page.locator('.report-rows article')).toHaveCount(1);
  await page.getByRole('link', { name: 'تفاصيل ومصادر', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'تفاصيل صف التقرير' })).toBeVisible();
  await expect(page.getByText(/هوية الأثر:/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'فتح سجل المصدر المصرح به' })).toBeVisible();
  await page.getByRole('link', { name: 'فتح سجل المصدر المصرح به' }).click();
  await expect(page).toHaveURL(/\/tracking\/[a-f0-9-]+/);
  await expect(page.getByRole('heading', { name: /^شحنة [0-9]+$/ })).toBeVisible();
  await page.getByRole('link', { name: 'تفاصيل الشحنة والإجراء المتاح', exact: true }).click();
  await expect(page).toHaveURL(/\/shipments\/[0-9]+/);
  await expect(page.getByText('P24-A01-SHIPPING', { exact: false }).first()).toBeVisible();
  await page.goBack();
  await page.goBack();
  await page.getByRole('link', { name: 'عودة إلى التقرير والفلاتر' }).click();
  await expect(
    page.getByRole('heading', { name: 'تعريفة الشحن والتغليف', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'عودة إلى ملخص الربح والفلاتر' }).click();
  await page.getByRole('link', { name: /المصروفات المدفوعة.*عرض التفاصيل/ }).click();
  await page.getByRole('link', { name: 'تفاصيل ومصادر', exact: true }).click();
  await page.getByRole('link', { name: 'فتح سجل المصدر المصرح به' }).click();
  await expect(page).toHaveURL(/\/expenses\/[a-f0-9-]+/);
  await expect(page.getByText('P24 مصروف مدفوع موثق', { exact: false }).first()).toBeVisible();
  await page.goBack();
  await page.getByRole('link', { name: 'عودة إلى التقرير والفلاتر' }).click();
  await page.getByRole('link', { name: 'عودة إلى ملخص الربح والفلاتر' }).click();
  await expect(page.getByLabel('ملخص الربح التشغيلي')).toContainText('6200.00');
  await expect(page.getByLabel('من تاريخ')).toHaveValue(f.from);
  await page.getByRole('link', { name: /رسوم التخزين المستحقة.*عرض التفاصيل/ }).click();
  await page.getByRole('link', { name: 'تفاصيل ومصادر', exact: true }).click();
  await page.getByRole('link', { name: 'فتح سجل المصدر المصرح به' }).click();
  await expect(page).toHaveURL(/\/storage\/[a-f0-9-]+/);
  await expect(page.getByRole('heading', { name: /P24 اشتراك تخزين/ })).toBeVisible();
  await page.goBack();
  await page.getByRole('link', { name: 'عودة إلى التقرير والفلاتر' }).click();
  await page.getByRole('link', { name: 'عودة إلى ملخص الربح والفلاتر' }).click();
  for (const width of [1440, 390, 320, 768]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1050 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: `docs/verification/P24/screenshots/profit-${width}.png`,
      fullPage: true,
    });
  }
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
  await download(page, 'xlsx', 'docs/verification/P24/browser-profit.xlsx');
  const book = new ExcelJS.Workbook();
  await book.xlsx.readFile('docs/verification/P24/browser-profit.xlsx');
  expect(book.getWorksheet('المصادر')!.rowCount).toBe(before.snapshot.totalRows + 1);
  const values = book
    .getWorksheet('التقرير')!
    .getRows(1, book.getWorksheet('التقرير')!.rowCount)!
    .map((r) => JSON.stringify(r.values))
    .join('\n');
  expect(values).toContain('6200.00');
  expect(values).toContain(snapshotId);
  await download(page, 'pdf', 'docs/verification/P24/browser-profit.pdf');
  expect(
    (await readFile('docs/verification/P24/browser-profit.pdf')).subarray(0, 5).toString(),
  ).toBe('%PDF-');
  await control(page, f, '/late');
  await page.reload();
  await expect(page.getByLabel('ملخص الربح التشغيلي')).toContainText('6200.00');
  await page.getByRole('button', { name: 'تحديث وإنشاء لقطة جديدة', exact: true }).click();
  await expect(page.getByLabel('ملخص الربح التشغيلي')).toContainText('6190.00');
  const after = await snapshot(page, f);
  expect(after.snapshot.id).not.toBe(snapshotId);
  const old = await get(page, `/api/v1/reports/snapshots/${snapshotId}?companyId=${f.companyId}`);
  expect(((await old.json()).snapshot.context.profit as ProfitSummary).profitMinor).toBe('620000');
  await page.getByLabel('إلى تاريخ').fill(f.from);
  await page.getByRole('button', { name: 'تطبيق الفلاتر', exact: true }).click();
  await expect(page.getByLabel('ملخص الربح التشغيلي')).toContainText('قيد مسجل بعد فترة الاستحقاق');
  await page.screenshot({
    path: 'docs/verification/P24/screenshots/later-entry-768.png',
    fullPage: true,
  });
  await page.getByLabel('من تاريخ').fill('2099-01-01');
  await page.getByLabel('إلى تاريخ').fill('2099-01-31');
  await page.getByRole('button', { name: 'تطبيق الفلاتر', exact: true }).click();
  await expect(page.getByText('لا توجد بيانات لهذه الفلاتر', { exact: true })).toBeVisible();
  await expect(page.getByLabel('من تاريخ')).toHaveValue('2099-01-01');
  await page.screenshot({
    path: 'docs/verification/P24/screenshots/empty-768.png',
    fullPage: true,
  });
  await writeFile(
    'docs/verification/P24/browser-snapshots.json',
    JSON.stringify(
      { before, after, widths: [1440, 390, 320, 768], emptyPeriod: ['2099-01-01', '2099-01-31'] },
      null,
      2,
    ),
  );
});

test('A06 actual denied branch scope, source detail/export boundaries and revoked report/download grant', async ({
  page,
}) => {
  const f = await fixture();
  await openProfit(page, f, 'summary');
  await expect(page.getByLabel('ملخص الربح التشغيلي')).toBeVisible();
  const summary = await snapshot(page, f);
  expect(summary.rows.every((r) => !r.economicEffect && r.sourceIds.length === 0)).toBe(true);
  await expect(page.locator('.report-rows article')).toHaveCount(0);
  await page.getByRole('link', { name: /الراتب المستحق.*عرض التفاصيل/ }).click();
  await expect(page.getByText('تعذر تحميل التقرير', { exact: true })).toBeVisible();
  await expect(
    page.getByText('هذه البيانات خارج صلاحياتك الحالية.', { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: 'docs/verification/P24/screenshots/source-denied.png',
    fullPage: true,
  });
  await openProfit(page, f, 'a');
  const authorized = await snapshot(page, f);
  const session = await (await get(page, '/api/v1/access/session')).json();
  const body = {
    schemaVersion: 1,
    commandId: crypto.randomUUID(),
    companyId: f.companyId,
    type: 'report.snapshot',
    reportId: 'REP-15',
    filters: { from: f.from, to: f.to, branchIds: [f.b] },
    sort: 'dateAsc',
  };
  const forged = await page.request.post('/api/v1/reports/snapshots', {
    data: body,
    headers: {
      Cookie: await sessionCookie(page),
      Origin: 'http://127.0.0.1:5424',
      'X-CSRF-Token': session.csrfToken,
    },
  });
  expect(forged.status()).toBe(403);
  expect((await forged.json()).code).toBe('FORBIDDEN_SCOPE');
  await page.getByRole('link', { name: /الراتب المستحق.*عرض التفاصيل/ }).click();
  await expect(page.locator('.report-rows article')).not.toHaveCount(0);
  const employeeRow = await page.locator('.report-rows article a').first().getAttribute('href');
  await page.getByRole('link', { name: 'عودة إلى ملخص الربح والفلاتر' }).click();
  await download(page, 'xlsx', 'docs/verification/P24/browser-authorized.xlsx');
  const fileUrl = await page
    .getByRole('link', { name: 'تنزيل XLSX', exact: true })
    .getAttribute('href');
  expect((await get(page, fileUrl!)).ok()).toBe(true);
  await control(page, f, '/revoke-source');
  await page.goto(employeeRow!);
  await expect(page.getByText('تعذر تحميل التفاصيل', { exact: true })).toBeVisible();
  expect((await get(page, fileUrl!)).status()).toBe(403);
  await control(page, f, '/restore-source');
  await control(page, f, '/revoke-reports');
  expect(
    (
      await get(
        page,
        `/api/v1/reports/snapshots/${authorized.snapshot.id}?companyId=${f.companyId}`,
      )
    ).status(),
  ).toBe(403);
  expect((await get(page, fileUrl!)).status()).toBe(403);
  await page.reload();
  await expect(page.getByText('تعذر تحميل التفاصيل', { exact: true })).toBeVisible();
  await control(page, f, '/restore-reports');
  await writeFile(
    'docs/verification/P24/browser-authorization.json',
    JSON.stringify(
      {
        summarySnapshotId: summary.snapshot.id,
        authorizedSnapshotId: authorized.snapshot.id,
        forgedScopeStatus: 403,
        revokedSourceAndDownloadStatus: 403,
        revokedReportAndDownloadStatus: 403,
      },
      null,
      2,
    ),
  );
});

test('A07 real projection fault/rebuild, incomplete sources, large exact values, long Arabic branch, paginated exports', async ({
  page,
}) => {
  const f = await fixture();
  await openProfit(page, f);
  await control(page, f, '/fault');
  await page.getByRole('button', { name: 'تحديث وإنشاء لقطة جديدة', exact: true }).click();
  await expect(page.getByLabel('مراجعة اتفاق المصادر')).toContainText('1.23');
  const fault = await snapshot(page, f);
  await expect(
    page.getByRole('link', { name: 'فتح مسار المراجعة المصرح به' }).first(),
  ).toBeVisible();
  await page.screenshot({
    path: 'docs/verification/P24/screenshots/reconciliation-fault.png',
    fullPage: true,
  });
  await control(page, f, '/rebuild');
  await page.getByRole('button', { name: 'تحديث وإنشاء لقطة جديدة', exact: true }).click();
  await expect(page.getByLabel('مراجعة اتفاق المصادر')).not.toContainText('1.23');
  const rebuilt = await snapshot(page, f);
  const rebuiltProfit = rebuilt.snapshot.context['profit'] as ProfitSummary;
  const expectedLargeMinor = BigInt(rebuiltProfit.profitMinor) - 9007199254740993n - 3000n;
  const expectedLargeAbs = expectedLargeMinor < 0n ? -expectedLargeMinor : expectedLargeMinor;
  const expectedLargeDisplay = `${expectedLargeAbs / 100n}.${String(expectedLargeAbs % 100n).padStart(2, '0')}`;
  const expectedExpenseSourceCount =
    rebuiltProfit.categories.find((c) => c.category === 'paid_expense')!.sourceCount + 31;
  await control(page, f, '/long-large');
  await page.getByRole('button', { name: 'تحديث وإنشاء لقطة جديدة', exact: true }).click();
  await expect(page.getByLabel('ملخص الربح التشغيلي')).toContainText(expectedLargeDisplay);
  await expect(page.getByLabel('ملخص الربح التشغيلي')).toContainText('فرع القاهرة التاريخي');
  const large = await snapshot(page, f);
  expect((large.snapshot.context['profit'] as ProfitSummary).profitMinor).toBe(
    expectedLargeMinor.toString(),
  );
  expect(
    (large.snapshot.context['profit'] as ProfitSummary).categories.find(
      (c) => c.category === 'paid_expense',
    )!.sourceCount,
  ).toBe(expectedExpenseSourceCount);
  expect(large.snapshot.totalRows).toBeGreaterThan(25);
  for (const width of [1440, 390, 320, 768]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1050 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: `docs/verification/P24/screenshots/long-large-${width}.png`,
      fullPage: true,
    });
  }
  await download(page, 'xlsx', 'docs/verification/P24/browser-long-large.xlsx');
  const book = new ExcelJS.Workbook();
  await book.xlsx.readFile('docs/verification/P24/browser-long-large.xlsx');
  expect(book.getWorksheet('المصادر')!.rowCount).toBe(large.snapshot.totalRows + 1);
  const sourceValues = book
    .getWorksheet('المصادر')!
    .getRows(1, book.getWorksheet('المصادر')!.rowCount)!
    .map((r) => JSON.stringify(r.values))
    .join('\n');
  expect(sourceValues).toContain('9007199254740993');
  await download(page, 'pdf', 'docs/verification/P24/browser-long-large.pdf');
  expect(
    (await readFile('docs/verification/P24/browser-long-large.pdf')).subarray(0, 5).toString(),
  ).toBe('%PDF-');
  await page.getByRole('link', { name: /المصروفات المدفوعة.*عرض التفاصيل/ }).click();
  await expect(page.locator('.report-rows article')).toHaveCount(25);
  await page.getByRole('button', { name: 'التالي', exact: true }).click();
  await expect(page.getByText('صفحة 2 من 2', { exact: true })).toBeVisible();
  await expect(page.locator('.report-rows article')).toHaveCount(expectedExpenseSourceCount - 25);
  await page.getByRole('link', { name: 'عودة إلى ملخص الربح والفلاتر' }).click();
  await expect(page.getByLabel('ملخص الربح التشغيلي')).toBeVisible();
  await expect(page.locator('.report-rows article')).toHaveCount(0);
  await control(page, f, '/gap');
  await page.getByRole('button', { name: 'تحديث وإنشاء لقطة جديدة', exact: true }).click();
  await expect(page.getByText(/البيانات غير مكتملة:/)).toBeVisible();
  await expect(page.getByLabel('ملخص الربح التشغيلي')).toContainText(
    'النتيجة المتاحة من المصادر المكتملة',
  );
  const preservedExpenses = (large.snapshot.context['profit'] as ProfitSummary).categories.find(
    (c) => c.category === 'paid_expense',
  )!;
  await expect(page.getByRole('link', { name: /المصروفات المدفوعة.*عرض التفاصيل/ })).toContainText(
    `${preservedExpenses.sourceCount} مصدر`,
  );
  await expect(page.getByLabel('ملخص الربح التشغيلي')).toContainText(expectedLargeDisplay);
  await expect(page.locator('.report-rows article')).toHaveCount(0);
  await page.screenshot({
    path: 'docs/verification/P24/screenshots/incomplete-768.png',
    fullPage: true,
  });
  const incomplete = await snapshot(page, f);
  const incompleteExpenses = (
    incomplete.snapshot.context['profit'] as ProfitSummary
  ).categories.find((c) => c.category === 'paid_expense')!;
  expect(incompleteExpenses).toEqual(preservedExpenses);
  await writeFile(
    'docs/verification/P24/browser-reconciliation-and-large.json',
    JSON.stringify(
      {
        fault,
        rebuilt,
        large,
        incomplete,
        expectedFaultDeltaMinor: '123',
        largeExpenseMinor: '9007199254740993',
        exportsPreserveAllRows: true,
      },
      null,
      2,
    ),
  );
});
