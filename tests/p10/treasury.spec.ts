import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
test.describe.configure({ mode: 'serial' });
let runtime: {
    companyId: string;
    branchA: string;
    branchB: string;
    branchC: string;
    sourceId: string;
    destinationId: string;
    categoryId: string;
    secret: string;
  },
  sentPath: string;
test.beforeAll(async () => {
  runtime = JSON.parse(await readFile('tests/.p10-runtime.json', 'utf8'));
});
const control = async (path: string) =>
  (await fetch('http://127.0.0.1:4316' + path, { headers: { 'x-test-secret': runtime.secret } }))
    .json()
    .catch(() => null);
async function login(page: Page, who = 'sender') {
  await page.goto('/api/test/p10-login/' + who);
  await expect(
    page.getByRole('heading', {
      name: who === 'receiver' ? 'استلام الأموال' : 'إرسال الأموال',
      exact: true,
    }),
  ).toBeVisible();
}
async function fillSend(page: Page, money = '٣٠٠') {
  await page.goto('/treasury/transfers/new');
  await page.getByLabel('فرع المصدر', { exact: true }).selectOption(runtime.branchA);
  await page.getByLabel('فرع الوجهة', { exact: true }).selectOption(runtime.branchB);
  await page.getByLabel('حساب المصدر', { exact: true }).selectOption(runtime.sourceId);
  await page.getByLabel('حساب الوجهة', { exact: true }).selectOption(runtime.destinationId);
  await page.getByLabel('المبلغ بالجنيه', { exact: true }).fill(money);
  await page.getByLabel('وقت الإرسال الفعلي — القاهرة', { exact: true }).fill('2026-09-01T13:00');
}
test('sender assigned C sends300 A→B; pending persists after reload, conservation and responsive reviewed screens', async ({
  page,
}) => {
  await login(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await fillSend(page);
  await expect(page.getByText('الرصيد المتاح بالمصدر:')).toContainText('1000.00');
  await page.getByRole('button', { name: 'مراجعة الإرسال', exact: true }).click();
  await expect(page.getByRole('region', { name: 'مراجعة الإرسال' })).toContainText(
    'رصيد الوجهة لا يزيد',
  );
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1050 : 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `docs/verification/P10/screenshots/send-${width}.png`,
      fullPage: true,
    });
  }
  await page.getByRole('button', { name: 'تأكيد الإرسال الفعلي', exact: true }).click();
  await expect(page.getByRole('region', { name: 'تفاصيل التحويل' })).toContainText(
    'قيد النقل — لم يُستلم',
  );
  sentPath = new URL(page.url()).pathname;
  expect(await control('/statistics')).toEqual({
    source: '70000',
    destination: '0',
    transit: '30000',
    profitFacts: 0,
    receipts: 0,
  });
  await page.reload();
  await expect(page.getByRole('region', { name: 'تفاصيل التحويل' })).toContainText('300.00');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'docs/verification/P10/screenshots/pending-390.png',
    fullPage: true,
  });
  expect(await page.getByRole('button', { name: 'أؤكد وصول المبلغ كاملًا فعليًا' }).count()).toBe(
    0,
  );
  const denied = await page.evaluate(async (company) => {
    const r = await fetch('/api/v1/treasury/receipts?companyId=' + company);
    return r.status;
  }, runtime.companyId);
  expect(denied).toBe(403);
  await page.goto(sentPath.replace('/transfers/', '/receipts/'));
  await expect(page.getByRole('alert')).toContainText('صلاحياتك الحالية');
});
test('receiver assigned C sees full fixed300; dropped committed response reloads/recover once with exact timeline', async ({
  page,
}) => {
  await login(page, 'receiver');
  await page.goto(sentPath.replace('/transfers/', '/receipts/'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel('وقت الاستلام الفعلي — القاهرة', { exact: true }).fill('2026-09-01T14:00');
  expect(await page.getByLabel('المبلغ بالجنيه', { exact: true }).count()).toBe(0);
  expect(await page.getByRole('button', { name: /رفض|رد المال|جزئي/ }).count()).toBe(0);
  await page.getByRole('button', { name: 'مراجعة الاستلام الكامل', exact: true }).click();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1050 : 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `docs/verification/P10/screenshots/receipt-${width}.png`,
      fullPage: true,
    });
  }
  await page.route('**/api/v1/treasury/commands', async (route) => {
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    await route.abort('failed');
  });
  await page.getByRole('button', { name: 'أؤكد وصول المبلغ كاملًا فعليًا', exact: true }).click();
  await expect(page.getByRole('button', { name: 'استرد نتيجة الحفظ' })).toBeVisible();
  await page.unroute('**/api/v1/treasury/commands');
  await page.reload();
  await page.getByRole('button', { name: 'استرد نتيجة الحفظ' }).click();
  await expect(page.getByRole('region', { name: 'تفاصيل التحويل' })).toContainText(
    'تم الاستلام بالكامل',
  );
  expect(await control('/statistics')).toEqual({
    source: '70000',
    destination: '30000',
    transit: '0',
    profitFacts: 0,
    receipts: 1,
  });
  await expect(
    page.getByRole('region', { name: 'تاريخ التحويل' }).getByRole('listitem'),
  ).toHaveCount(2);
  await page.screenshot({
    path: 'docs/verification/P10/screenshots/received-1440.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'docs/verification/P10/screenshots/received-390.png',
    fullPage: true,
  });
  const duplicate = await page.evaluate(
    async ({ companyId, id }) => {
      const s = await (await fetch('/api/v1/access/session')).json();
      const r = await fetch('/api/v1/treasury/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': s.csrfToken },
        body: JSON.stringify({
          schemaVersion: 1,
          companyId,
          commandId: crypto.randomUUID(),
          type: 'treasury.receive',
          transferId: id,
          expectedVersion: 1,
          actualReceivedAt: '2026-09-01T11:00:00Z',
          confirmFullReceipt: true,
        }),
      });
      return { status: r.status, body: await r.json() };
    },
    { companyId: runtime.companyId, id: sentPath.split('/').at(-1)! },
  );
  expect(duplicate).toMatchObject({ status: 200, body: { outcome: 'already_received' } });
  expect((await control('/statistics')).receipts).toBe(1);
});
test('insufficient800 retains inputs, focuses rejection; stale destination needs refresh and re-review', async ({
  page,
}) => {
  await login(page);
  await fillSend(page, '800');
  await page.getByRole('button', { name: 'مراجعة الإرسال', exact: true }).click();
  await page.getByRole('button', { name: 'تأكيد الإرسال الفعلي', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('الرصيد المتاح لا يكفي');
  await expect(page.getByRole('alert')).toBeFocused();
  await page.getByRole('button', { name: 'تعديل المدخلات' }).click();
  await expect(page.getByLabel('المبلغ بالجنيه', { exact: true })).toHaveValue('800');
  await page.getByLabel('المبلغ بالجنيه', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'مراجعة الإرسال', exact: true }).click();
  await control('/bump-destination');
  await page.getByRole('button', { name: 'تأكيد الإرسال الفعلي', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('تغيّرت النسخة');
  await page.getByRole('button', { name: 'تحديث الحسابات والمراجعة' }).click();
  await expect(page.getByLabel('المبلغ بالجنيه', { exact: true })).toHaveValue('1');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'docs/verification/P10/screenshots/stale-390.png',
    fullPage: true,
  });
});
test('pending and received filters combine, Arabic reference search, detail/back retention and reset on mobile', async ({
  page,
}) => {
  await login(page, 'receiver');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByText('فلاتر التحويلات', { exact: true }).click();
  await page.getByLabel('حالة التحويل', { exact: true }).selectOption('received');
  await page.getByLabel('الفرع المرسل', { exact: true }).selectOption(runtime.branchA);
  await page.getByLabel('الفرع المستلم', { exact: true }).selectOption(runtime.branchB);
  await page.getByLabel('أساس التاريخ', { exact: true }).selectOption('received');
  await page.getByLabel('من تاريخ', { exact: true }).fill('2026-09-01');
  await page.getByLabel('إلى تاريخ', { exact: true }).fill('2026-09-01');
  const filtered = page.url();
  await page.locator('.finance-row').first().click();
  await page.getByRole('link', { name: 'العودة للقائمة' }).click();
  expect(page.url()).toBe(filtered);
  await page.getByText('فلاتر التحويلات', { exact: true }).click();
  await page.getByLabel('بحث بالمرجع أو اسم الحساب', { exact: true }).fill('٩٩٩٩٩٩٩٩');
  await expect(page.getByText('لا توجد تحويلات بهذه الفلاتر', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'مسح الفلاتر' }).click();
  await expect(page.getByLabel('حالة التحويل', { exact: true })).toHaveValue('sent');
  expect(new URL(page.url()).search).toBe('');
  await page.screenshot({
    path: 'docs/verification/P10/screenshots/filters-390.png',
    fullPage: true,
  });
});
test('connection loss before commit preserves original intent; unknown lookup replays same command and same person can receive', async ({
  page,
}) => {
  await login(page, 'both');
  await fillSend(page, '1');
  await page.route('**/api/v1/treasury/commands', (route) => route.abort('failed'));
  await page.getByRole('button', { name: 'مراجعة الإرسال', exact: true }).click();
  await page.getByRole('button', { name: 'تأكيد الإرسال الفعلي', exact: true }).click();
  await expect(page.getByRole('button', { name: 'استرد نتيجة الحفظ' })).toBeVisible();
  await page.unroute('**/api/v1/treasury/commands');
  await page.reload();
  await page.getByRole('button', { name: 'استرد نتيجة الحفظ' }).click();
  await expect(page.getByRole('region', { name: 'تفاصيل التحويل' })).toBeVisible();
  await page.getByRole('link', { name: 'فتح شاشة الاستلام' }).click();
  await page.getByLabel('وقت الاستلام الفعلي — القاهرة', { exact: true }).fill('2026-09-01T14:00');
  await page.getByRole('button', { name: 'مراجعة الاستلام الكامل', exact: true }).click();
  await page.getByRole('button', { name: 'أؤكد وصول المبلغ كاملًا فعليًا', exact: true }).click();
  await expect(page.getByRole('region', { name: 'تفاصيل التحويل' })).toContainText(
    'تم الاستلام بالكامل',
  );
  expect(await control('/statistics')).toEqual({
    source: '69900',
    destination: '30100',
    transit: '0',
    profitFacts: 0,
    receipts: 2,
  });
});
test('receiver expense in unassigned B and general account history stay denied; closed partial API creates no effects', async ({
  page,
}) => {
  await login(page, 'receiver');
  const before = await control('/statistics');
  const statuses = await page.evaluate(
    async (x) => {
      const s = await (await fetch('/api/v1/access/session')).json(),
        headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': s.csrfToken };
      const partial = await fetch('/api/v1/treasury/commands', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          schemaVersion: 1,
          companyId: x.companyId,
          commandId: crypto.randomUUID(),
          type: 'treasury.receive',
          transferId: x.transferId,
          expectedVersion: 1,
          actualReceivedAt: '2026-09-01T11:00:00Z',
          confirmFullReceipt: true,
          amountMinor: '29900',
        }),
      });
      const expense = await fetch('/api/v1/finance/commands', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          schemaVersion: 1,
          companyId: x.companyId,
          commandId: crypto.randomUUID(),
          type: 'expense.create',
          fields: {
            accountId: x.destinationId,
            branchId: x.branchB,
            amountMinor: '100',
            currency: 'EGP',
            method: 'cash',
            actualDate: '2026-09-01',
            categoryId: x.categoryId,
            description: 'Unassigned B expense',
          },
        }),
      });
      const history = await fetch(
        '/api/v1/finance/accounts/' + x.destinationId + '/movements?companyId=' + x.companyId,
      );
      return [partial.status, expense.status, history.status];
    },
    { ...runtime, transferId: sentPath.split('/').at(-1)! },
  );
  expect(statuses).toEqual([400, 403, 403]);
  expect(await control('/statistics')).toEqual(before);
  await page.goto('/treasury/transfers/new');
  await expect(page.getByRole('alert')).toContainText('صلاحياتك الحالية');
});
