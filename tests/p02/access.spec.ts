import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { totp, type TestIssuerUser } from '../../scripts/lib/keycloak.mjs';
interface Runtime {
  issuer: string;
  users: Record<string, TestIssuerUser>;
  company: string;
  a: string;
  b: string;
  staffRole: string;
  adminRole: string;
  controlSecret: string;
}
let runtime: Runtime;
test.beforeAll(async () => {
  runtime = JSON.parse(await readFile('tests/.p02-runtime.json', 'utf8'));
  await mkdir('docs/verification/P02/screenshots', { recursive: true });
});
async function control(page: Page, path: string) {
  const r = await page.request.post('http://127.0.0.1:4292' + path, {
    headers: { Authorization: `Bearer ${runtime.controlSecret}` },
  });
  expect(r.ok()).toBe(true);
  return r.json();
}
async function issuerLogin(page: Page, user: TestIssuerUser, checkMfa = false) {
  await page.locator('#username').fill(user.username);
  await page.locator('#password').fill(user.password);
  await page.locator('#kc-login').click();
  await expect(page.locator('#otp')).toBeVisible();
  if (checkMfa) {
    await page
      .locator('#otp')
      .fill(String((Number(totp(user.otp)) + 1) % 1000000).padStart(6, '0'));
    await page.locator('#kc-login').click();
    await expect(page.getByText('Invalid authenticator code.')).toBeVisible();
    expect((await page.context().cookies()).some((c) => c.name === 'erp_session')).toBe(false);
  }
  // The real issuer rejects reuse of a successfully consumed OTP in the same time step.
  // Keep only consumed time steps across Playwright worker restarts; never persist a code/secret.
  const steps: Record<string, number> = JSON.parse(
    await readFile('tests/.p02-otp-steps.json', 'utf8').catch(() => '{}'),
  );
  if (steps[user.id] === Math.floor(Date.now() / 30000))
    await new Promise((resolve) => setTimeout(resolve, 30050 - (Date.now() % 30000)));
  steps[user.id] = Math.floor(Date.now() / 30000);
  await writeFile('tests/.p02-otp-steps.json', JSON.stringify(steps));
  await page.locator('#otp').fill(totp(user.otp));
  await page.locator('#kc-login').click();
}
async function login(page: Page, key = 'admin') {
  const user = runtime.users[key]!;
  await page.goto(key === 'support' ? '/support/login' : '/login');
  if (key !== 'support') await page.getByLabel('كود الشركة').fill('trial');
  await page
    .getByLabel('اسم المستخدم', { exact: true })
    .fill(key === 'support' ? 'support' : user.username.replace('trial.', ''));
  await page.getByRole('button', { name: 'متابعة تسجيل الدخول' }).click();
  await issuerLogin(page, user, key === 'support');
  await expect(page).toHaveURL(key === 'support' ? /\/support$/ : /5291\/$/);
}
async function request(page: Page, path: string, body?: Record<string, unknown>) {
  // Browser fetch preserves loopback Secure-cookie semantics; APIRequestContext does not send those cookies over HTTP.
  const result = await page.evaluate(
    async ({ path, body }) => {
      const session = body ? await (await fetch('/api/v1/access/session')).json() : null;
      const response = await fetch(path, {
        ...(body
          ? {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': session.csrfToken },
              body: JSON.stringify(body),
            }
          : {}),
      });
      return { status: response.status, body: await response.json() };
    },
    { path, body },
  );
  return { status: () => result.status, json: async () => result.body };
}
async function command(page: Page, body: Record<string, unknown>) {
  return request(page, '/api/v1/access/commands', {
    schemaVersion: 1,
    commandId: randomUUID(),
    companyId: runtime.company,
    ...body,
  });
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
}
async function captureResponsive(page: Page, name: string) {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1050 : 844 });
    await noOverflow(page);
    await page.screenshot({
      path: `docs/verification/P02/screenshots/${name}-${width}.png`,
      fullPage: true,
    });
  }
}
test('real Keycloak PKCE login: secure opaque cookie, granted implemented cards, desktop/mobile/keyboard', async ({
  page,
}) => {
  await page.goto('/login');
  await captureResponsive(page, 'login');
  await page.getByLabel('كود الشركة').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('اسم المستخدم', { exact: true })).toBeFocused();
  await login(page);
  await expect(page.getByRole('link', { name: /إدارة المستخدمين/ })).toBeVisible();
  const cookies = await page.context().cookies();
  const session = cookies.find((c) => c.name === 'erp_session');
  expect(session).toMatchObject({ httpOnly: true, secure: true, sameSite: 'Lax' });
  expect(await page.evaluate(() => document.cookie)).not.toContain('erp_session');
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  await expect(page.getByRole('link', { name: /تسجيل الشحنات/ })).toHaveCount(0);
  for (const width of [390, 1440, 320, 768]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1050 : 844 });
    await noOverflow(page);
    await page.screenshot({
      path: `docs/verification/P02/screenshots/home-${width}.png`,
      fullPage: true,
    });
  }
  await page.keyboard.press('Control+Home');
  await page.keyboard.press('Tab');
  await page.goto('/administration/users');
  await expect(page.getByRole('heading', { name: 'المستخدمون', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'إضافة مستخدم', exact: true }).click();
  await page
    .getByLabel('الاسم', { exact: true })
    .fill('اسم عربي طويل لمراجعة عرض النموذج وحفظ بيانات المستخدم دون قطع');
  for (const width of [390, 1440, 320, 768]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1050 : 844 });
    await noOverflow(page);
    await page.screenshot({
      path: `docs/verification/P02/screenshots/users-${width}.png`,
      fullPage: true,
    });
  }
});
test('two open sessions: revoke inherited grant, add branch B, old direct request denies and context refetch updates', async ({
  browser,
}) => {
  test.setTimeout(120000);
  const staffContext = await browser.newContext(),
    adminContext = await browser.newContext();
  const staff = await staffContext.newPage(),
    admin = await adminContext.newPage();
  try {
    await login(staff, 'staffA');
    await login(admin);
    expect((await request(staff, '/api/v1/access/scope/inventory')).status()).toBe(200);
    const list = await (await request(admin, '/api/v1/access/users')).json(),
      user = list.items.find((u: { username: string }) => u.username === 'staff-a');
    await expect(staff.getByRole('link', { name: /الأدوار والصلاحيات/ })).toBeVisible();
    const r = await command(admin, {
      type: 'user.update',
      entityId: user.id,
      expectedVersion: user.version,
      name: user.name,
      roleId: user.roleId,
      branchIds: [runtime.a, runtime.b],
      exceptions: { inventory: 'deny', 'access.roles': 'deny' },
      active: true,
    });
    expect(r.status()).toBe(200);
    await control(admin, '/worker');
    expect((await request(staff, '/api/v1/access/scope/inventory')).status()).toBe(403);
    await staff.reload();
    await expect(staff.getByRole('combobox', { name: 'سياق الفرع' })).toHaveCount(1);
    expect(
      await staff.getByRole('combobox', { name: 'سياق الفرع' }).locator('option').count(),
    ).toBe(2);
    await staff.goto('/administration/roles');
    await expect(staff.getByRole('alert')).toContainText('لا تسمح صلاحياتك');
    await staff.screenshot({
      path: 'docs/verification/P02/screenshots/direct-denial.png',
      fullPage: true,
    });
    // A real profile synchronization must preserve issuer-owned enrollment/contact fields.
    // Missing email/lastName would divert Keycloak to Update Account Information here.
    expect((await request(staff, '/api/v1/access/logout', {})).status()).toBe(200);
    await login(staff, 'staffA');
    await expect(staff.getByRole('combobox', { name: 'سياق الفرع' }).locator('option')).toHaveCount(
      2,
    );
  } finally {
    await staffContext.close();
    await adminContext.close();
  }
});
test('actual issuer unavailable leaves one pending user; restored issuer binds one subject', async ({
  page,
}) => {
  test.setTimeout(120000);
  await login(page);
  await control(page, '/issuer/stop');
  try {
    const r = await command(page, {
      type: 'user.create',
      username: 'offline-user',
      name: 'مستخدم أثناء الانقطاع',
      roleId: runtime.staffRole,
      branchIds: [runtime.a],
      exceptions: {},
      active: true,
    });
    expect((await r.json()).state).toBe('pending');
    await control(page, '/worker');
    await page.goto('/administration/users');
    await expect(page.getByText('تجهيز الهوية معلق', { exact: true }).first()).toBeVisible();
    await page.screenshot({
      path: 'docs/verification/P02/screenshots/pending-issuer.png',
      fullPage: true,
    });
  } finally {
    await control(page, '/issuer/start');
  }
  await control(page, '/leases/expire');
  await control(page, '/worker');
  const proof = await control(page, '/proof');
  expect(proof.users.find((u: { username: string }) => u.username === 'offline-user').state).toBe(
    'ready',
  );
  expect(
    proof.remote.filter((u: { username: string }) => u.username === 'trial.offline-user'),
  ).toHaveLength(1);
});
test('kill worker after real remote creation before local acknowledgement; restart reconciles one native/remote identity', async ({
  page,
}) => {
  await login(page);
  const r = await command(page, {
    type: 'user.create',
    username: 'lost-result',
    name: 'استرداد نتيجة مجهولة',
    roleId: runtime.staffRole,
    branchIds: [runtime.a],
    exceptions: {},
    active: true,
  });
  const pending = await r.json();
  expect(pending.state).toBe('pending');
  await control(page, '/worker/crash');
  const before = await control(page, '/proof');
  expect(
    before.remote.filter((u: { username: string }) => u.username === 'trial.lost-result'),
  ).toHaveLength(1);
  expect(
    before.users.find((u: { username: string }) => u.username === 'lost-result').subject,
  ).toBeNull();
  await control(page, '/leases/expire');
  await control(page, '/worker');
  const after = await control(page, '/proof');
  const users = after.users.filter((u: { username: string }) => u.username === 'lost-result');
  expect(users).toHaveLength(1);
  expect(users[0].state).toBe('ready');
  expect(
    after.remote.filter((u: { username: string }) => u.username === 'trial.lost-result'),
  ).toEqual([{ id: users[0].subject, username: 'trial.lost-result' }]);
  await writeFile(
    'docs/verification/P02/interruption-proof.json',
    JSON.stringify(
      {
        technique:
          'SIGKILL child worker on IPC signal after Keycloak reconcile returns, before local acknowledgement transaction; expire owned fixture lease and launch a fresh worker',
        before,
        after,
      },
      null,
      2,
    ),
  );
});
test('support login requires actual OTP; explicit session visible audit attribution and expiry rejects next mutation', async ({
  page,
}) => {
  await login(page, 'support');
  await page.getByLabel('الشركة', { exact: true }).selectOption(runtime.company);
  await page.getByLabel('سبب الدعم').fill('مراجعة إعداد فرع الشركة في التجربة');
  await page.route('**/api/v1/access/commands', async (route) => {
    const original = route.request();
    const result = await route.fetch({ headers: await original.allHeaders() });
    expect(result.status()).toBe(200);
    await route.abort('connectionreset');
  });
  await page.getByRole('button', { name: 'بدء جلسة لمدة ساعة' }).click();
  await expect(page.getByRole('button', { name: 'فحص نتيجة الطلب' })).toBeVisible();
  await page.unroute('**/api/v1/access/commands');
  await expect(page.getByText('جلسة دعم فني نشطة')).toBeVisible();
  await page.getByRole('button', { name: 'فحص نتيجة الطلب' }).first().click();
  await expect(page.getByRole('button', { name: 'فحص نتيجة الطلب' })).toHaveCount(0);
  await page.getByLabel('اسم الفرع الجديد').fill('فرع الدعم الفعلي');
  await page.getByRole('button', { name: 'إضافة الفرع', exact: true }).click();
  await expect(page.getByText('فرع الدعم الفعلي', { exact: true })).toBeVisible();
  await page.getByText('سجل إدارة الوصول', { exact: true }).click();
  await expect(
    page.getByText('الدعم الفني · Technical Support', { exact: true }).first(),
  ).toBeVisible();
  await captureResponsive(page, 'support');
  await control(page, '/support/expire');
  expect(
    (await command(page, { type: 'branch.create', name: 'غير مسموح بعد الانتهاء' })).status(),
  ).toBe(403);
  const proof = await control(page, '/proof');
  expect(
    proof.audit.some(
      (a: { actor_label: string; support_session_id: string }) =>
        a.actor_label === 'Technical Support' && a.support_session_id,
    ),
  ).toBe(true);
});
test('state tampering, nonce mismatch and callback replay fail without issuing an ERP session', async ({
  browser,
}) => {
  test.setTimeout(150000);
  for (const mode of ['state', 'nonce', 'replay']) {
    const context: BrowserContext = await browser.newContext();
    const page = await context.newPage();
    try {
      await page.goto('/login');
      await page.getByLabel('كود الشركة').fill('trial');
      await page.getByLabel('اسم المستخدم', { exact: true }).fill('admin');
      await page.getByRole('button', { name: 'متابعة تسجيل الدخول' }).click();
      await expect(page.locator('#username')).toBeVisible();
      if (mode === 'nonce') await control(page, '/oidc/nonce');
      if (mode === 'state') {
        const tampered = new URL(page.url());
        tampered.searchParams.set('state', randomUUID());
        await page.goto(tampered.href);
      }
      let callback = '';
      page.on('request', (request) => {
        if (new URL(request.url()).pathname === '/api/v1/access/callback') callback = request.url();
      });
      await issuerLogin(page, runtime.users.admin!);
      if (mode === 'replay') {
        await expect(page).toHaveURL(/5291\/$/);
        expect(callback).not.toBe('');
        await context.clearCookies({ name: 'erp_session' });
        await page.goto(callback);
      }
      await expect(page).toHaveURL(/login\?error=login_failed/);
      expect((await context.cookies()).some((c) => c.name === 'erp_session')).toBe(false);
    } finally {
      await context.close();
    }
  }
});
test('role editor writes real server grants; expired form session retains unsaved input in memory', async ({
  page,
}) => {
  test.setTimeout(120000);
  await login(page);
  await page.goto('/administration/roles');
  await page.getByRole('button', { name: 'إضافة دور', exact: true }).click();
  await page.getByLabel('اسم الدور').fill('نموذج أُغلق دون إرسال');
  await page.getByRole('button', { name: 'إغلاق النموذج' }).click();
  expect(
    (await (await request(page, '/api/v1/access/roles')).json()).items.some(
      (r: { name: string }) => r.name === 'نموذج أُغلق دون إرسال',
    ),
  ).toBe(false);
  await page.getByRole('button', { name: 'إضافة دور', exact: true }).click();
  await page.getByLabel('اسم الدور').fill('دور تجربة بلا عنوان وظيفي ثابت');
  await page.getByLabel('تتبع الشحنات', { exact: false }).check();
  await page.getByRole('button', { name: 'حفظ الدور', exact: true }).click();
  await expect(page.getByText('تم الحفظ', { exact: true })).toBeVisible();
  await captureResponsive(page, 'roles');
  await page.goto('/administration/users');
  await page.getByRole('button', { name: 'إضافة مستخدم', exact: true }).click();
  await page.getByLabel('الاسم', { exact: true }).fill('بيانات محفوظة في الذاكرة');
  await control(page, '/sessions/expire-admin');
  await page.getByLabel('اسم المستخدم', { exact: true }).fill('retained-form');
  await page.getByLabel('الدور', { exact: true }).selectOption(runtime.staffRole);
  await page.getByLabel('الفرع أ', { exact: true }).check();
  await page.getByRole('button', { name: 'مراجعة المستخدم' }).click();
  await page.getByRole('button', { name: 'تأكيد حفظ المستخدم' }).click();
  await expect(page.getByRole('alert')).toContainText('انتهت الجلسة');
  await expect(page.getByLabel('الاسم', { exact: true })).toHaveValue('بيانات محفوظة في الذاكرة');
  await page.getByRole('button', { name: 'تم الدخول — تحديث' }).click();
  await expect(page.getByLabel('الاسم', { exact: true })).toHaveValue('بيانات محفوظة في الذاكرة');
  await page.screenshot({
    path: 'docs/verification/P02/screenshots/reauth-retained.png',
    fullPage: true,
  });
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'إعادة تسجيل الدخول مع إبقاء النموذج' }).click();
  const popup = await popupPromise;
  await popup.getByLabel('كود الشركة').fill('trial');
  await popup.getByLabel('اسم المستخدم', { exact: true }).fill('admin');
  await popup.getByRole('button', { name: 'متابعة تسجيل الدخول' }).click();
  await issuerLogin(popup, runtime.users.admin!);
  await expect(popup).toHaveURL(/auth-complete$/);
  await popup.close();
  await page.getByRole('button', { name: 'تم الدخول — تحديث' }).click();
  await expect(page.getByLabel('الاسم', { exact: true })).toHaveValue('بيانات محفوظة في الذاكرة');
  await page.getByRole('button', { name: 'تأكيد حفظ المستخدم' }).click();
  await expect(page.getByText('حُفظ المستخدم — تجهيز الهوية معلق', { exact: true })).toBeVisible();
});
test('lost command response retains only a recovery identity across reload and never creates a second user', async ({
  page,
}) => {
  test.setTimeout(120000);
  await login(page);
  await page.goto('/administration/users/new');
  await page.getByLabel('الاسم', { exact: true }).fill('نتيجة مفقودة قابلة للاسترداد');
  await page.getByLabel('اسم المستخدم', { exact: true }).fill('lost-response');
  await page.getByLabel('الدور', { exact: true }).selectOption(runtime.staffRole);
  await page.getByLabel('الفرع أ', { exact: true }).check();
  let commandId = '';
  await page.route('**/api/v1/access/commands', async (route) => {
    const original = route.request();
    commandId = original.postDataJSON().commandId;
    // Send the actual mutation including the browser's Secure cookie, then discard its real response.
    const response = await route.fetch({ headers: await original.allHeaders() });
    expect(response.status()).toBe(200);
    await route.abort('connectionreset');
  });
  await page.getByRole('button', { name: 'مراجعة المستخدم' }).click();
  await page.getByRole('button', { name: 'تأكيد حفظ المستخدم' }).click();
  await expect(page.getByRole('alert')).toContainText('لم تصل نتيجة الطلب');
  expect(await page.evaluate(() => Object.values(sessionStorage))).toEqual([commandId]);
  await page.unroute('**/api/v1/access/commands');
  await page.reload();
  await expect(page.getByRole('button', { name: 'فحص نتيجة الطلب' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'مراجعة المستخدم' })).toBeDisabled();
  await page.getByRole('button', { name: 'فحص نتيجة الطلب' }).click();
  await expect(page.getByText('حُفظ المستخدم — تجهيز الهوية معلق', { exact: true })).toBeVisible();
  const users = await (await request(page, '/api/v1/access/users?search=نتيجة')).json();
  expect(
    users.items.filter((u: { username: string }) => u.username === 'lost-response'),
  ).toHaveLength(1);
  expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual([]);
  await captureResponsive(page, 'recovered-command');
});
test('ERP logout and explicit shared identity logout use separate real flows without browser tokens', async ({
  page,
}) => {
  test.setTimeout(150000);
  await login(page);
  await page.getByText('الحساب والجلسة', { exact: true }).click();
  await page.getByRole('button', { name: 'خروج من ERP', exact: true }).click();
  await expect(page).toHaveURL(/5291\/login$/);
  expect((await request(page, '/api/v1/access/context')).status()).toBe(401);
  expect((await page.context().cookies()).some((c) => c.name === 'erp_session')).toBe(false);
  await login(page);
  await page.getByText('الحساب والجلسة', { exact: true }).click();
  await page.getByRole('button', { name: 'خروج من الهوية المشتركة', exact: true }).click();
  await expect(page).toHaveURL(/\/protocol\/openid-connect\/logout/);
  expect(new URL(page.url()).searchParams.has('id_token_hint')).toBe(false);
  expect((await page.context().cookies()).some((c) => c.name === 'erp_session')).toBe(false);
  await page.locator('#kc-logout').click();
  await expect(page).toHaveURL(/5291\/login$/);
  expect((await request(page, '/api/v1/access/context')).status()).toBe(401);
});
test('support reauthentication preserves a branch draft and requires a fresh explicit company session', async ({
  page,
}) => {
  test.setTimeout(150000);
  await login(page, 'support');
  await page.getByLabel('الشركة', { exact: true }).selectOption(runtime.company);
  await page.getByLabel('سبب الدعم').fill('تجربة حفظ مسودة الفرع خلال إعادة المصادقة');
  await page.getByRole('button', { name: 'بدء جلسة لمدة ساعة' }).click();
  await expect(page.getByText('جلسة دعم فني نشطة')).toBeVisible();
  await page.getByRole('button', { name: 'الفرع أ', exact: true }).click();
  await page.getByLabel('اسم الفرع', { exact: true }).fill('مسودة فرع محفوظة بعد إعادة الدخول');
  expect((await request(page, '/api/v1/access/logout', {})).status()).toBe(200);
  await page.getByRole('button', { name: 'حفظ الفرع', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('انتهت الجلسة');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'إعادة تسجيل الدخول مع إبقاء النموذج' }).click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(/support\/login\?return=/);
  await popup.getByLabel('اسم المستخدم', { exact: true }).fill('support');
  await popup.getByRole('button', { name: 'متابعة تسجيل الدخول' }).click();
  await issuerLogin(popup, runtime.users.support!);
  await expect(popup).toHaveURL(/auth-complete$/);
  await popup.close();
  await page.getByRole('button', { name: 'تم الدخول — تحديث' }).click();
  await expect(page.getByLabel('اسم الفرع', { exact: true })).toHaveValue(
    'مسودة فرع محفوظة بعد إعادة الدخول',
  );
  expect(
    (
      await command(page, { type: 'branch.create', name: 'cannot bypass new support scope' })
    ).status(),
  ).toBe(403);
  await page.getByLabel('الشركة', { exact: true }).selectOption(runtime.company);
  await page.getByLabel('سبب الدعم').fill('استئناف جلسة الدعم بعد إعادة التحقق بخطوتين');
  await page.getByRole('button', { name: 'بدء جلسة لمدة ساعة' }).click();
  await expect.poll(async () => (await request(page, '/api/v1/access/context')).status()).toBe(200);
  await expect(page.getByLabel('اسم الفرع', { exact: true })).toHaveValue(
    'مسودة فرع محفوظة بعد إعادة الدخول',
  );
  await captureResponsive(page, 'support-reauth-retained');
  await page.getByRole('button', { name: 'حفظ الفرع', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'مسودة فرع محفوظة بعد إعادة الدخول', exact: true }),
  ).toBeVisible();
});
