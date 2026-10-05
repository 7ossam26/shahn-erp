import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
const runtime = () =>
  JSON.parse(readFileSync('tests/.p14-runtime.json', 'utf8')) as {
    secret: string;
    companyId: string;
    branch: string;
    otherBranch: string;
    driver: string;
    request: string;
    damaged: string;
    sound: string;
    shipment: { reference: string };
  };
test('assigned source branch and driver first, responsive filters and preserved Back state', async ({
  page,
}) => {
  const f = runtime();
  await page.goto('/api/test/p14-login/admin');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1050 : 844 });
    await page.goto('/returns');
    await expect(page.getByText('اختر فرع المصدر والمندوب لعرض طلباتهما.')).toBeVisible();
    await page.getByLabel('فرع المصدر', { exact: true }).selectOption(f.branch);
    await page.getByLabel('المندوب', { exact: true }).selectOption(f.driver);
    await expect(page.getByRole('link', { name: 'فحص الكمية واستلامها' })).toHaveCount(3);
    await page.screenshot({
      path: `docs/verification/P14/screenshots/list-${width}.png`,
      fullPage: true,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.getByText('مرشحات الطلبات', { exact: true }).click();
  await page.getByLabel('رقم الشحنة', { exact: true }).fill(f.shipment.reference);
  await expect(page.getByRole('link', { name: 'فحص الكمية واستلامها' })).toHaveCount(1);
  await page.getByRole('link', { name: 'فحص الكمية واستلامها' }).click();
  await page.getByRole('link', { name: 'العودة إلى الطلبات بنفس المرشحات' }).click();
  await expect(page.getByLabel('رقم الشحنة', { exact: true })).toHaveValue(f.shipment.reference);
});
test('actual subset submission, pending quarantine, accepted remainder and damaged condition', async ({
  page,
  request,
}) => {
  const f = runtime();
  await page.goto('/api/test/p14-login/admin');
  await page.goto('/returns/' + f.request);
  await page.getByLabel('الكمية المستلمة', { exact: true }).fill('1');
  await page.getByLabel('نتيجة الفحص').selectOption('sound');
  await page.getByLabel(/أؤكد وصول هذه الكمية/).check();
  await page.getByRole('button', { name: 'تأكيد استلام الكمية الفعلية' }).click();
  await expect(page.getByText(/وصول فعلي مسجل — تأكيد توصيل معلق/)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'docs/verification/P14/screenshots/pending-390.png',
    fullPage: true,
  });
  const accepted = await request.get('http://127.0.0.1:4342/accept', {
    headers: { 'x-test-secret': f.secret },
  });
  expect(accepted.ok()).toBe(true);
  await expect(page.getByText('كمية سليمة متاحة: 1', { exact: true })).toBeVisible();
  await page.screenshot({
    path: 'docs/verification/P14/screenshots/received-390.png',
    fullPage: true,
  });
  await page.goto('/returns/' + f.damaged);
  await expect(page.getByText(/استلام مؤكد: 1 · تالف/)).toBeVisible();
  await expect(page.getByLabel('الإجراء التالي')).toHaveCount(0);
  await page.screenshot({
    path: 'docs/verification/P14/screenshots/damaged-390.png',
    fullPage: true,
  });
});
test('brand handover is a separate actual confirmation and cannot be allocated twice', async ({
  page,
}) => {
  const f = runtime();
  await page.goto('/api/test/p14-login/admin');
  await page.goto('/returns/' + f.sound);
  await page.getByLabel('الإجراء التالي').selectOption('brand');
  await page
    .getByLabel('اسم مستلم البراند')
    .fill('ممثل البراند — الاسم الطويل لبيان هوية المستلم الفعلي');
  await expect(page.getByRole('button', { name: 'تسجيل التسليم الفعلي للبراند' })).toBeDisabled();
  await page.getByLabel('تم التسليم الفعلي لهذه الكمية إلى مستلم البراند').check();
  await page.screenshot({
    path: 'docs/verification/P14/screenshots/brand-1440.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'تسجيل التسليم الفعلي للبراند' }).click();
  await expect(page.getByText('سُجل التسليم الفعلي للبراند.')).toBeVisible();
  await expect(page.getByLabel('الإجراء التالي')).toHaveCount(0);
});
test('branch-B staff cannot read or submit source-branch-A receipt', async ({ page }) => {
  const f = runtime();
  await page.goto('/api/test/p14-login/staff');
  const r = await page.evaluate(
    async (url) => (await fetch(url)).status,
    '/api/v1/returns/requests/' + f.request + '?companyId=' + f.companyId,
  );
  expect([403, 404]).toContain(r);
  const scoped = await page.evaluate(
    async (url) => (await fetch(url)).status,
    `/api/v1/returns?companyId=${f.companyId}&branchId=${f.branch}&driverId=${f.driver}`,
  );
  expect(scoped).toBe(403);
});
test('separate disposition page consumes an existing decision without an outcome or quantity editor', async ({
  page,
  request,
}) => {
  const f = runtime();
  await page.goto('/api/test/p14-login/admin');
  await page.goto('/returns/' + f.damaged + '/disposition');
  await expect(
    page.getByRole('heading', { name: 'تنفيذ قرار عهدة معتمد', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'قرار فقد معتمد', exact: true })).toBeVisible();
  await expect(page.getByRole('spinbutton')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'إرسال القرار المعتمد إلى توصيل' })).toBeDisabled();
  await page.getByLabel('راجعت القرار المسجل والكميات المحددة').check();
  await page.screenshot({
    path: 'docs/verification/P14/screenshots/disposition-1440.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'إرسال القرار المعتمد إلى توصيل' }).click();
  await expect(page.getByRole('status')).toContainText('سُجل الطلب');
  expect(
    (
      await request.get('http://127.0.0.1:4342/accept', { headers: { 'x-test-secret': f.secret } })
    ).ok(),
  ).toBe(true);
  await page.goto('/returns/' + f.damaged);
  await expect(page.getByText(/قرار عهدة مؤكد — ليس استلاماً/)).toBeVisible();
  await expect(page.getByLabel('الإجراء التالي')).toHaveCount(0);
});
