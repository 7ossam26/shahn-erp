# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: shipments.spec.ts >> 320/768/1440 layouts preserve long Arabic content, keyboard focus and responsive timeline
- Location: tests\p06\shipments.spec.ts:261:1

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator:  getByRole('heading', { name: 'طرد 10013', exact: true })
Expected: focused
Received: inactive
Timeout:  15000ms

Call log:
  - Expect "toBeFocused" getByRole('heading', { name: 'طرد 10013', exact: true }) with timeout 15000ms
  - waiting for getByRole('heading', { name: 'طرد 10013', exact: true })
    32 × locator resolved to <h1 tabindex="-1">طرد 10013</h1>
       - unexpected value "inactive"

```

```yaml
- heading "طرد 10013" [level=1]
```

# Test source

```ts
  174 |   const first = await register(page);
  175 |   await fill(page, { reference: 'BROWSER-DUP' });
  176 |   await review(page);
  177 |   await page.getByRole('button', { name: 'تأكيد تسجيل الطرد', exact: true }).click();
  178 |   await expect(
  179 |     page.getByText('مرجع البراند مكرر. هذا ليس استردادًا لمحاولة تسجيل سابقة.'),
  180 |   ).toBeVisible();
  181 |   await expect(page.getByRole('button', { name: 'تسجيل طرد مستلم', exact: true })).toBeDisabled();
  182 |   await page.getByLabel('هذا طلب مستقل رغم تكرار المرجع').check();
  183 |   await capture(page, 'duplicate-reference-warning');
  184 |   const second = await register(page);
  185 |   expect(first).not.toBe(second);
  186 | });
  187 | test('dropped committed confirmation response survives reload and recovers original reference exactly once', async ({
  188 |   page,
  189 | }) => {
  190 |   await fill(page, { reference: 'LOST-CONFIRM' });
  191 |   const before = await control('/statistics');
  192 |   let committed = '';
  193 |   await page.route('**/api/v1/shipments', async (route) => {
  194 |     const response = await route.fetch();
  195 |     expect(response.status()).toBe(200);
  196 |     committed = (await response.json()).reference;
  197 |     await route.abort('failed');
  198 |   });
  199 |   await review(page);
  200 |   await page.getByRole('button', { name: 'تأكيد تسجيل الطرد', exact: true }).click();
  201 |   await expect(page.getByRole('button', { name: 'استرد نتيجة الحفظ' })).toBeVisible();
  202 |   await page.reload();
  203 |   await page.getByRole('button', { name: 'استرد نتيجة الحفظ' }).click();
  204 |   await expect(page).toHaveURL(new RegExp('/shipments/' + committed + '$'));
  205 |   const after = await control('/statistics');
  206 |   expect(after.shipments - before.shipments).toBe(1);
  207 |   expect(after.receipts - before.receipts).toBe(1);
  208 | });
  209 | test('lost preparation response recovers from the waiting-only queue after reload', async ({
  210 |   page,
  211 | }) => {
  212 |   await fill(page, { packed: true, reference: 'LOST-PREP' });
  213 |   const ref = await register(page);
  214 |   await page.goto(
  215 |     `/preparation?branches=${runtime.inventorySeed.branchA}&preparation=awaiting_preparation&search=${ref}`,
  216 |   );
  217 |   await page.route('**/api/v1/shipments/*/preparation/complete', async (route) => {
  218 |     const response = await route.fetch();
  219 |     expect(response.status()).toBe(200);
  220 |     await route.abort('failed');
  221 |   });
  222 |   await page.getByRole('button', { name: 'إكمال التجهيز' }).click();
  223 |   await page.getByRole('button', { name: 'تم التجهيز بالفعل' }).click();
  224 |   await expect(page.getByRole('button', { name: 'استرد نتيجة الحفظ' })).toBeVisible();
  225 |   await page.reload();
  226 |   await page.getByRole('button', { name: 'استرد نتيجة الحفظ' }).click();
  227 |   await expect(page.getByRole('button', { name: 'استرد نتيجة الحفظ' })).toHaveCount(0);
  228 |   await expect(page.getByText('لا توجد طرود بهذه الفلاتر. راجع الفرع والفلاتر.')).toBeVisible();
  229 | });
  230 | test('mobile advanced combined filters, reset, detail/back and assigned-branch denial', async ({
  231 |   page,
  232 |   context,
  233 | }) => {
  234 |   await page.setViewportSize({ width: 390, height: 844 });
  235 |   await page.goto(`/inventory?view=parcels&branches=${runtime.inventorySeed.branchA}`);
  236 |   await page.getByRole('button', { name: /فلاتر متقدمة/ }).click();
  237 |   await page.getByLabel('البراند', { exact: true }).selectOption(runtime.seed.brand);
  238 |   await page.getByLabel('الخدمة', { exact: true }).selectOption('company_packed');
  239 |   await page.getByRole('button', { name: 'تطبيق الفلاتر' }).click();
  240 |   await expect(page.locator('.parcel-card').first()).toBeVisible();
  241 |   await noOverflow(page);
  242 |   await capture(page, 'parcel-filters-390');
  243 |   await page.locator('.parcel-card a').first().click();
  244 |   await page.goBack();
  245 |   await expect(page).toHaveURL(/service=company_packed/);
  246 |   await page.getByRole('button', { name: 'مسح الفلاتر' }).click();
  247 |   await expect(page).not.toHaveURL(/service=/);
  248 |   await context.clearCookies();
  249 |   await page.goto('/api/test/intake-staff-login');
  250 |   await page.goto('/shipments/new');
  251 |   await expect(page.getByLabel('فرع الاستلام')).toHaveValue('الفرع أ');
  252 |   const denied = await page.evaluate(
  253 |     async ({ company, branch }) => {
  254 |       const r = await fetch(`/api/v1/preparation?companyId=${company}&branches=${branch}`);
  255 |       return r.status;
  256 |     },
  257 |     { company: runtime.companyId, branch: runtime.branchB },
  258 |   );
  259 |   expect(denied).toBe(403);
  260 | });
  261 | test('320/768/1440 layouts preserve long Arabic content, keyboard focus and responsive timeline', async ({
  262 |   page,
  263 | }) => {
  264 |   await page.setViewportSize({ width: 320, height: 844 });
  265 |   await fill(page, { long: true });
  266 |   await noOverflow(page);
  267 |   await capture(page, 'intake-long-320');
  268 |   const ref = await register(page);
  269 |   await noOverflow(page);
  270 |   await capture(page, 'detail-long-320');
  271 |   for (const width of [768, 1440]) {
  272 |     await page.setViewportSize({ width, height: 1050 });
  273 |     await page.goto('/shipments/' + ref);
> 274 |     await expect(page.getByRole('heading', { name: 'طرد ' + ref, exact: true })).toBeFocused();
      |                                                                                  ^ Error: expect(locator).toBeFocused() failed
  275 |     await noOverflow(page);
  276 |     await capture(page, 'detail-long-' + width);
  277 |     await page.goto('/shipments/new');
  278 |     await expect(page.getByRole('heading', { name: 'تسجيل طرد مستلم' })).toBeVisible();
  279 |     await noOverflow(page);
  280 |     await capture(page, 'intake-' + width);
  281 |   }
  282 | });
  283 | test('tariff edits preserve old detail; correction preview/commit reviews service and cancellation retains parcel', async ({
  284 |   page,
  285 | }) => {
  286 |   await fill(page, { reference: 'CORRECTION' });
  287 |   const ref = await register(page);
  288 |   await control('/change-tariff');
  289 |   await page.reload();
  290 |   await expect(page.locator('.intake-money').first()).toContainText('300.00');
  291 |   await page.getByText('إجراءات قبل التسليم ونتيجة آخر طلب', { exact: true }).click();
  292 |   await page.getByRole('link', { name: 'تصحيح قبل التسليم' }).click();
  293 |   await page.getByLabel('الخدمة', { exact: true }).selectOption('company_packed');
  294 |   await page.getByLabel('سبب التصحيح').fill('الخدمة على البوليصة سجلت خطأ');
  295 |   await page.getByRole('button', { name: 'معاينة التصحيح' }).click();
  296 |   await expect(page.locator('.correction-preview')).toContainText('305.00');
  297 |   await capture(page, 'correction-preview-1440');
  298 |   await page.getByRole('button', { name: 'تأكيد التصحيح', exact: true }).click();
  299 |   await expect(page).toHaveURL(new RegExp('/shipments/' + ref + '$'));
  300 |   await expect(page.getByText('بانتظار التجهيز', { exact: true })).toBeVisible();
  301 |   await page.getByText('إجراءات قبل التسليم ونتيجة آخر طلب', { exact: true }).click();
  302 |   await page.getByRole('button', { name: 'إلغاء الطلب', exact: true }).click();
  303 |   await page.getByLabel('سبب الإلغاء').fill('طلب البراند الإلغاء قبل التسليم');
  304 |   await page.getByRole('button', { name: 'تأكيد الإلغاء', exact: true }).click();
  305 |   await expect(page.getByText('طلب ملغى · الطرد ما زال بعهدة الفرع')).toBeVisible();
  306 |   await capture(page, 'cancelled-held-1440');
  307 |   await page.goto(
  308 |     `/inventory?view=parcels&branches=${runtime.inventorySeed.branchA}&search=${ref}`,
  309 |   );
  310 |   await expect(page.locator('.parcel-card')).toContainText('ملغى · العهدة محفوظة');
  311 |   await writeFile(
  312 |     'docs/verification/P06/browser-trial-references.json',
  313 |     JSON.stringify({ correctionReference: ref, seed: runtime.shipmentSeed }, null, 2),
  314 |   );
  315 | });
  316 |
```