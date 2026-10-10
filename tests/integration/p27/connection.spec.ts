import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const ids = () =>
  JSON.parse(readFileSync('tests/.p27-runtime.json', 'utf8')) as {
    companyId: string;
    packagePath: string;
  };
test('ordinary integration grants do not expose secret setup or permit backend import', async ({
  page,
}) => {
  await page.goto('/api/test/p27-login/admin');
  await expect(page.getByRole('heading', { name: 'حالة الربط', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ربط تطبيق توصيل', exact: true })).toHaveCount(0);
  const r = await page.evaluate(async (companyId) => {
    const x = await fetch('/api/v1/integration/connection/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId }),
    });
    return { status: x.status, body: await x.json() };
  }, ids().companyId);
  expect(r.status).toBe(403);
  expect(r.body.code).toBe('CONNECTION_SETUP_AUTHORITY_REQUIRED');
});
test('fresh installation imports once, recovers lost verification/confirmation with opaque identities and shows truthful readiness at four widths', async ({
  page,
}) => {
  await page.goto('/api/test/p27-login/support');
  await expect(page.getByRole('heading', { name: 'ربط تطبيق توصيل', exact: true })).toBeVisible();
  await page.getByLabel('عنوان تطبيق توصيل HTTPS').fill('https://routing.example/');
  await page.getByLabel('الحزمة الخاصة من مسؤول توصيل').setInputFiles(ids().packagePath);
  await page.route('**/api/v1/integration/connection/verify', async (route) => {
    await route.fetch();
    await route.abort('failed');
  });
  await page.getByRole('button', { name: 'استيراد وفحص الاتصال', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.reload();
  await page.unroute('**/api/v1/integration/connection/verify');
  const secrets = JSON.parse(readFileSync(ids().packagePath, 'utf8')) as {
    credential: { bearer: string };
    signingKeys: { secret: string }[];
  };
  const storage = await page.evaluate(() =>
    JSON.stringify({ session: { ...sessionStorage }, local: { ...localStorage } }),
  );
  expect(storage).not.toContain(secrets.credential.bearer);
  expect(storage).not.toContain(secrets.signingKeys[0]!.secret);
  await page.getByRole('button', { name: 'استرداد الفحص بنفس الهوية' }).click();
  await expect(page.getByRole('button', { name: 'تأكيد الاتصال', exact: true })).toBeVisible();
  for (const width of [1440, 390, 320, 768]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `docs/verification/P27/screenshots/verified-${width}.png`,
      fullPage: true,
    });
  }
  await page.route('**/api/v1/integration/connection/confirm', async (route) => {
    await route.fetch();
    await route.abort('failed');
  });
  await page.getByRole('button', { name: 'تأكيد الاتصال', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.reload();
  await page.unroute('**/api/v1/integration/connection/confirm');
  await page.getByRole('button', { name: 'استرداد نتيجة التأكيد' }).click();
  await expect(page.getByText('بانتظار أول حدث مطبق', { exact: true })).toBeVisible();
  expect(await page.locator('body').innerText()).not.toContain(secrets.credential.bearer);
  expect(await page.locator('body').innerText()).not.toContain(secrets.signingKeys[0]!.secret);
  await expect(page.getByRole('button', { name: 'استرداد نتيجة التأكيد' })).toHaveCount(0);
  await page.screenshot({
    path: 'docs/verification/P27/screenshots/connected-768.png',
    fullPage: true,
  });
});
