import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import ExcelJS from 'exceljs';
test('A01/A04/A05 desktop/phone real snapshot, full XLSX/PDF, filters/back, late refresh and load/empty states', async ({
  page,
  request,
}) => {
  const f = JSON.parse(await readFile('tests/.p23-runtime.json', 'utf8'));
  await page.goto('/api/test/p23-login');
  await expect(page.getByRole('heading', { name: 'التقارير', exact: true })).toBeVisible();
  await expect(page.getByText('REP-15 · يعتمد على المرحلة P24؛ لم ينفذ بعد.')).toBeVisible();
  await page.getByRole('link', { name: /سجل الشحنات/ }).click();
  await page.getByLabel('بحث', { exact: true }).fill('P23-REGISTER-');
  await page.getByRole('button', { name: 'تطبيق الفلاتر' }).click();
  await expect(page.locator('.report-context').first()).toContainText('27 صف');
  await expect(page.locator('.report-rows article')).toHaveCount(25);
  const snapshot = new URL(page.url()).searchParams.get('snapshot');
  expect(snapshot).toBeTruthy();
  await page.getByRole('button', { name: 'التالي', exact: true }).click();
  await expect(page.locator('.report-rows article')).toHaveCount(2);
  await expect(page.getByLabel('بحث', { exact: true })).toHaveValue('P23-REGISTER-');
  await page.getByRole('link', { name: 'تفاصيل ومصادر' }).first().click();
  await expect(page.getByRole('heading', { name: 'تفاصيل صف التقرير' })).toBeVisible();
  await page.getByRole('link', { name: 'عودة إلى التقرير والفلاتر' }).click();
  await expect(page.locator('.report-rows article')).toHaveCount(2);
  expect(new URL(page.url()).searchParams.get('snapshot')).toBe(snapshot);
  await page.getByRole('button', { name: 'تصدير XLSX' }).click();
  await expect(page.getByRole('link', { name: 'تنزيل XLSX' })).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'تنزيل XLSX' }).click(),
  ]);
  await download.saveAs('docs/verification/P23/browser-27.xlsx');
  const book = new ExcelJS.Workbook();
  await book.xlsx.readFile('docs/verification/P23/browser-27.xlsx');
  expect(book.getWorksheet('المصادر')!.rowCount).toBe(28);
  expect(String(book.getWorksheet('التقرير')!.getCell('A5').value)).toContain(snapshot!);
  await page.getByRole('button', { name: 'طباعة / PDF' }).click();
  await expect(page.getByRole('link', { name: 'تنزيل PDF' })).toBeVisible();
  const [pdf] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'تنزيل PDF' }).click(),
  ]);
  await pdf.saveAs('docs/verification/P23/browser-27.pdf');
  expect((await readFile('docs/verification/P23/browser-27.pdf')).subarray(0, 5).toString()).toBe(
    '%PDF-',
  );
  for (const width of [1440, 390, 320, 768]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1050 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: `docs/verification/P23/screenshots/register-${width}.png`,
      fullPage: true,
    });
  }
  await page.goto('/reports/REP-14');
  await page.getByLabel('من تاريخ').fill(f.today);
  await page.getByLabel('إلى تاريخ').fill(f.today);
  await page.getByText(/فلاتر متقدمة/).click();
  await page.getByLabel('الفروع', { exact: true }).selectOption([f.a]);
  await page.getByRole('button', { name: 'تطبيق الفلاتر' }).click();
  await expect(page.getByLabel('إجماليات اللقطة')).toContainText('200.00');
  const expenseSnapshot = new URL(page.url()).searchParams.get('snapshot');
  await page.getByRole('link', { name: 'تفاصيل ومصادر' }).click();
  await expect(page.locator('.report-detail')).toContainText('200.00');
  await page.getByRole('link', { name: 'عودة إلى التقرير والفلاتر' }).click();
  await expect(page.getByLabel('من تاريخ')).toHaveValue(f.today);
  await page.getByRole('button', { name: 'تصدير XLSX' }).click();
  await expect(page.getByRole('link', { name: 'تنزيل XLSX' })).toBeVisible();
  const [expense] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'تنزيل XLSX' }).click(),
  ]);
  await expense.saveAs('docs/verification/P23/browser-expense.xlsx');
  const eb = new ExcelJS.Workbook();
  await eb.xlsx.readFile('docs/verification/P23/browser-expense.xlsx');
  expect(eb.getWorksheet('التقرير')!.getCell('E8').value).toBe(
    "'=SUM(A1:A2) مصروف P23 طويل لا ينفذ معادلة",
  );
  expect(eb.getWorksheet('التقرير')!.getCell('F8').value).toBe('200.00');
  await page.getByRole('button', { name: 'طباعة / PDF' }).click();
  await expect(page.getByRole('link', { name: 'تنزيل PDF' })).toBeVisible();
  const [epdf] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'تنزيل PDF' }).click(),
  ]);
  await epdf.saveAs('docs/verification/P23/browser-expense.pdf');
  await page.screenshot({
    path: 'docs/verification/P23/screenshots/expense-390.png',
    fullPage: true,
  });
  expect(
    (
      await request.get('http://127.0.0.1:4426/late', { headers: { 'x-test-secret': f.secret } })
    ).ok(),
  ).toBe(true);
  await page.reload();
  await expect(page.getByLabel('إجماليات اللقطة')).toContainText('200.00');
  await page.getByRole('button', { name: 'تحديث وإنشاء لقطة جديدة' }).click();
  await expect(page.getByLabel('إجماليات اللقطة')).toContainText('210.00');
  await page.getByLabel('بحث', { exact: true }).fill('P23 no result');
  await page.getByRole('button', { name: 'تطبيق الفلاتر' }).click();
  await expect(page.getByText('لا توجد بيانات لهذه الفلاتر', { exact: true })).toBeVisible();
  await page.route('**/api/v1/reports/snapshots', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'REQUEST_FAILED' }),
    }),
  );
  await page.getByRole('button', { name: 'تحديث وإنشاء لقطة جديدة' }).click();
  await expect(page.getByText('تعذر تحميل التقرير', { exact: true })).toBeVisible();
  await expect(page.getByLabel('بحث', { exact: true })).toHaveValue('P23 no result');
  await page.screenshot({
    path: 'docs/verification/P23/screenshots/load-error.png',
    fullPage: true,
  });
  await page.unroute('**/api/v1/reports/snapshots');
  await page.getByRole('button', { name: 'إعادة المحاولة', exact: true }).click();
  await expect(page.getByText('لا توجد بيانات لهذه الفلاتر', { exact: true })).toBeVisible();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
  await page.goto('/brand-payouts?report=REP-09');
  await expect(page.getByRole('heading', { name: 'المستحق المؤهل وجدول الصرف' })).toBeVisible();
  await page.goto('/brand-payouts?report=REP-10');
  await expect(page.getByRole('heading', { name: 'تاريخ صرف البراند' })).toBeVisible();
  for (const id of ['REP-05', 'REP-07', 'REP-08', 'REP-12', 'REP-18']) {
    await page.goto('/reports/' + id);
    await expect(page.locator('.report-context').first()).toBeVisible();
    await expect(page.getByText('تعذر تحميل التقرير', { exact: true })).toHaveCount(0);
    await page.screenshot({ path: `docs/verification/P23/screenshots/${id}.png`, fullPage: true });
  }
  await writeFile(
    'docs/verification/P23/browser-snapshots.json',
    JSON.stringify(
      {
        shipmentSnapshot: snapshot,
        expenseSnapshot,
        rows: 27,
        expenseMinor: '20000',
        widths: [1440, 390, 320, 768],
      },
      null,
      2,
    ),
  );
});
test('A02/A03/A07 real API forged filters/exports/downloads and revocation; tracking does not authorize reports', async ({
  page,
}) => {
  const f = JSON.parse(await readFile('tests/.p23-runtime.json', 'utf8'));
  await page.goto('/api/test/p23-login?actor=a');
  await page.goto('/reports/REP-14');
  await expect(page.locator('.report-context').first()).toBeVisible();
  const snapshotId = new URL(page.url()).searchParams.get('snapshot');
  const cookies = async () =>
    'erp_session=' + (await page.context().cookies()).find((c) => c.name === 'erp_session')!.value;
  const session = await (
    await page.request.get('/api/v1/access/session', { headers: { Cookie: await cookies() } })
  ).json();
  const post = async (body: unknown) =>
    page.request.post('/api/v1/reports/snapshots', {
      headers: {
        Cookie: await cookies(),
        Origin: 'http://127.0.0.1:5423',
        'X-CSRF-Token': session.csrfToken,
      },
      data: body,
    });
  const forged = await post({
    schemaVersion: 1,
    commandId: crypto.randomUUID(),
    companyId: f.companyId,
    type: 'report.snapshot',
    reportId: 'REP-01',
    filters: { branchIds: [f.b] },
    sort: 'dateAsc',
  });
  expect(forged.status()).toBe(403);
  expect((await forged.json()).code).toBe('FORBIDDEN_SCOPE');
  await page.getByRole('button', { name: 'تصدير XLSX' }).click();
  await expect(page.getByRole('link', { name: 'تنزيل XLSX' })).toBeVisible();
  const url = await page.getByRole('link', { name: 'تنزيل XLSX' }).getAttribute('href');
  expect((await page.request.get(url!, { headers: { Cookie: await cookies() } })).ok()).toBe(true);
  expect(
    (
      await page.request.get('http://127.0.0.1:4426/revoke', {
        headers: { 'x-test-secret': f.secret },
      })
    ).ok(),
  ).toBe(true);
  const denied = await page.request.get(url!, { headers: { Cookie: await cookies() } });
  expect([401, 403]).toContain(denied.status());
  expect((await denied.json()).code).not.toBe('REQUEST_FAILED');
  await page.reload();
  await expect(page.getByRole('link', { name: 'تنزيل XLSX' })).toHaveCount(0);
  await page.goto('/api/test/p23-login?actor=tracking');
  expect([401, 403]).toContain(
    (
      await page.request.get('/api/v1/reports/catalog?companyId=' + f.companyId, {
        headers: { Cookie: await cookies() },
      })
    ).status(),
  );
  expect([401, 403, 404]).toContain(
    (
      await page.request.get(`/api/v1/reports/snapshots/${snapshotId}?companyId=${f.companyId}`, {
        headers: { Cookie: await cookies() },
      })
    ).status(),
  );
  expect([401, 403]).toContain(
    (await page.request.get(url!, { headers: { Cookie: await cookies() } })).status(),
  );
});
