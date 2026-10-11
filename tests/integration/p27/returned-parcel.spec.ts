import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
test('mobile and desktop parcel action reviews all commercial contents and submits one full allocation group', async ({
  page,
  request,
}) => {
  const f = JSON.parse(readFileSync('tests/.returned-parcel-runtime.json', 'utf8')) as {
    secret: string;
    company: string;
    branch: string;
    request: string;
  };
  await page.goto('/api/test/parcel-login');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1050 : 844 });
    await page.goto('/returns/' + f.request);
    const form = page.locator('section.return-form').first();
    await form.getByLabel('الإجراء التالي').selectOption('redispatch');
    await form.getByLabel('فرع الدورة الجديدة').selectOption(f.branch);
    await expect(form.getByText('إعادة إرسال الطرد كاملاً بجميع محتوياته')).toBeVisible();
    await expect(
      form.getByRole('list', { name: 'محتويات الطرد لإعادة الإرسال' }).getByRole('listitem'),
    ).toHaveCount(2);
    await expect(form.getByRole('spinbutton')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `../integration-audit-2026-10-11/returns-screenshots/whole-parcel-${width}.png`,
      fullPage: true,
    });
  }
  const sent = page.waitForRequest(
    (r) => r.url().endsWith('/api/v1/returns/commands') && r.method() === 'POST',
  );
  // Lose the response after the real ERP command commits; recovery must retain
  // the complete parcel payload and the original identity across a reload.
  let responseLost!: () => void;
  const lost = new Promise<void>((resolve) => {
    responseLost = resolve;
  });
  await page.route('**/api/v1/returns/commands', async (route) => {
    await route.fetch();
    await route.abort('failed');
    responseLost();
  });
  await page
    .locator('section.return-form')
    .first()
    .getByRole('button', { name: 'حجز الكمية وإعداد دورة جديدة' })
    .click();
  const payload = (await sent).postDataJSON();
  expect(payload.allocations.map((a: { quantity: number }) => a.quantity).sort()).toEqual([1, 2]);
  expect(
    new Set(payload.allocations.map((a: { receiptLineId: string }) => a.receiptLineId)).size,
  ).toBe(2);
  await lost;
  await expect(
    page.getByText('يوجد طلب محفوظ لم تصل نتيجته. لا تُنشئ استلاماً آخر لنفس الكمية.'),
  ).toBeVisible();
  await page.unroute('**/api/v1/returns/commands');
  await page.reload();
  await page.getByRole('button', { name: 'تحقق من الطلب الأصلي' }).click();
  await expect(page.getByRole('status')).toContainText('حُجزت الكمية لدورة جديدة');
  expect(
    (
      await request.get('http://127.0.0.1:4352/redispatch', {
        headers: { 'x-test-secret': f.secret },
      })
    ).ok(),
  ).toBe(true);
  const facts = await (
    await request.get('http://127.0.0.1:4352/facts', { headers: { 'x-test-secret': f.secret } })
  ).json();
  expect(facts.snapshot.lines).toHaveLength(2);
  expect(facts.price.goodsDueMinor).toBe('50000');
  expect(facts.allocations).toEqual([{ quantity: 1 }, { quantity: 2 }]);
});
