import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const ids = () =>
  JSON.parse(readFileSync('tests/.p27-runtime.json', 'utf8')) as {
    companyId: string;
    packagePath: string;
    revokedPackagePath: string;
    expiredPackagePath: string;
    rotatedPackagePath: string;
  };
test('failed credential verification remains recoverable after reload and permits a reviewed corrected package with a new identity', async ({
  page,
}) => {
  await page.goto('/api/test/p27-login/support');
  await page.getByLabel('عنوان تطبيق توصيل HTTPS').fill('https://routing.example/');
  await page.getByLabel('الحزمة الخاصة من مسؤول توصيل').setInputFiles(ids().revokedPackagePath);
  await page.getByRole('button', { name: 'استيراد وفحص الاتصال', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  const storageKey = 'shahn-connection-intent:' + ids().companyId;
  const old = await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)!), storageKey);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'بدء استيراد جديد بعد المراجعة', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'بدء استيراد جديد بعد المراجعة', exact: true }).click();
  await page.getByLabel('عنوان تطبيق توصيل HTTPS').fill('https://routing.example/');
  await page.getByLabel('الحزمة الخاصة من مسؤول توصيل').setInputFiles(ids().packagePath);
  await page.getByRole('button', { name: 'استيراد وفحص الاتصال', exact: true }).click();
  await expect(page.getByRole('button', { name: 'تأكيد الاتصال', exact: true })).toBeVisible();
  const next = await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)!), storageKey);
  expect(next.importId).not.toBe(old.importId);
  const prior = await page.evaluate(
    async ({ companyId, importId }) =>
      (
        await fetch(
          '/api/v1/integration/connection/status?companyId=' + companyId + '&importId=' + importId,
        )
      ).json(),
    { companyId: ids().companyId, importId: old.importId },
  );
  expect(prior.state).toBe('imported-awaiting-verification');
  // Leave the original fresh-installation journey with no unconfirmed browser intent.
  await page.evaluate((key) => sessionStorage.removeItem(key), storageKey);
});
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
      path: `docs/verification/P27/audit-2026-10-11/screenshots/verified-${width}.png`,
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
  await expect(
    page.getByRole('button', { name: 'بدء استيراد جديد بعد المراجعة', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'استيراد وفحص الاتصال', exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'استرداد الفحص بنفس الهوية', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'استرداد نتيجة التأكيد' }).click();
  await expect(page.getByText('بانتظار أول حدث مطبق', { exact: true })).toBeVisible();
  expect(await page.locator('body').innerText()).not.toContain(secrets.credential.bearer);
  expect(await page.locator('body').innerText()).not.toContain(secrets.signingKeys[0]!.secret);
  await expect(page.getByRole('button', { name: 'استرداد نتيجة التأكيد' })).toHaveCount(0);
  await page.screenshot({
    path: 'docs/verification/P27/audit-2026-10-11/screenshots/connected-768.png',
    fullPage: true,
  });
});
test('expired package import can be reviewed and replaced by a signing and service credential rotation without losing the prior configured state', async ({
  page,
}) => {
  await page.goto('/api/test/p27-login/support');
  await page.getByLabel('عنوان تطبيق توصيل HTTPS').fill('https://routing.example/');
  await page.getByLabel('الحزمة الخاصة من مسؤول توصيل').setInputFiles(ids().expiredPackagePath);
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/connection/import') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'استيراد وفحص الاتصال', exact: true }).click();
  expect((await (await response).json()).code).toBe('PRIVATE_PACKAGE_VALIDATION_FAILED');
  await expect(page.getByRole('alert')).toContainText('انتهت صلاحيتها');
  await page.reload();
  await expect(page.getByText('نسخة إعداد الاتصال: 1', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'بدء استيراد جديد بعد المراجعة', exact: true }).click();
  await page.getByLabel('عنوان تطبيق توصيل HTTPS').fill('https://routing.example/');
  await page.getByLabel('الحزمة الخاصة من مسؤول توصيل').setInputFiles(ids().rotatedPackagePath);
  await page.getByRole('button', { name: 'استيراد وفحص الاتصال', exact: true }).click();
  await page.getByRole('button', { name: 'تأكيد الاتصال', exact: true }).click();
  await expect(page.getByText('نسخة إعداد الاتصال: 2', { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByText('نسخة إعداد الاتصال: 2', { exact: false })).toBeVisible();
  const secrets = JSON.parse(readFileSync(ids().rotatedPackagePath, 'utf8')) as {
    credential: { bearer: string };
    signingKeys: { secret: string }[];
  };
  const stored = await page.evaluate(() =>
    JSON.stringify({ session: { ...sessionStorage }, local: { ...localStorage } }),
  );
  for (const value of [secrets.credential.bearer, ...secrets.signingKeys.map((k) => k.secret)])
    expect(stored).not.toContain(value);
});
