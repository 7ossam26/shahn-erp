# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: inventory.spec.ts >> current inventory, advanced filter/back state and long labels at 320px
- Location: tests\p05\inventory.spec.ts:116:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('لا توجد طرود بهذه الفلاتر. راجع الفرع والفلاتر.')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('لا توجد طرود بهذه الفلاتر. راجع الفرع والفلاتر.') with timeout 15000ms
  - waiting for getByText('لا توجد طرود بهذه الفلاتر. راجع الفرع والفلاتر.')

```

```yaml
- link "انتقل للمحتوى":
  - /url: "#main-content"
- banner:
  - link "شحن":
    - /url: /
    - strong: شحن
  - text: شركة التجربة
- main:
  - button "العودة للرئيسية"
  - paragraph: المخزون
  - heading "الطرود في العهدة" [level=1]
  - paragraph: طرود مستلمة فعلًا؛ الإلغاء التجاري لا ينقل العهدة.
  - link "المنتجات":
    - /url: /inventory
  - button "الطرود" [pressed]
  - text: الفرع
  - combobox "الفرع":
    - option "اختر الفرع"
    - option "الفرع أ" [selected]
    - option "الفرع ب"
  - text: حالة التجهيز
  - combobox "حالة التجهيز":
    - option "كل الحالات" [selected]
    - option "بانتظار التجهيز"
    - option "تم التجهيز"
    - option "لا يحتاج تجهيزًا"
  - text: العهدة
  - combobox "العهدة":
    - option "في الفرع" [selected]
    - option "خارج الفرع"
  - button "فلاتر متقدمة (2)"
  - text: بحث برقم الطرد أو بيانات المستلم
  - textbox "بحث برقم الطرد أو بيانات المستلم": Blue
  - text: "بحث: Blueفلتر: unavailable"
  - button "مسح الفلاتر"
  - alert: راجع الحقول والحدود الموضحة. لم يُسجل أي استلام.
  - group: الحساب والجلسة
- contentinfo: شحن · إدارة الوصول جلسة خاصة بالشركة
```

# Test source

```ts
  39  |     path: 'docs/verification/P05/screenshots/' + name + '.png',
  40  |     fullPage,
  41  |   });
  42  | };
  43  | test('registry module entry, explicit multi-branch choice, and A-only denied browser request', async ({
  44  |   page,
  45  |   context,
  46  | }) => {
  47  |   await page.goto('/');
  48  |   await page.getByRole('link', { name: /المخزون/ }).click();
  49  |   await expect(page.getByText('اختر فرعًا لعرض المخزون الحالي.')).toBeVisible();
  50  |   await page.getByLabel('الفرع', { exact: true }).selectOption(runtime.inventorySeed.branchA);
  51  |   await expect(page.locator('.stock-row').first()).toBeVisible();
  52  |   await context.clearCookies();
  53  |   await page.goto('/api/test/inventory-staff-login');
  54  |   await page.getByRole('link', { name: /المخزون/ }).click();
  55  |   await expect(page.locator('.stock-row').first()).toBeVisible();
  56  |   await expect(page.getByLabel('الفرع', { exact: true })).toHaveValue('الفرع أ');
  57  |   const denied = await page.evaluate(
  58  |     async ({ companyId, branchB }) => {
  59  |       const response = await fetch(
  60  |         `/api/v1/inventory/products?companyId=${companyId}&branches=${branchB}`,
  61  |       );
  62  |       return { status: response.status, body: await response.text() };
  63  |     },
  64  |     { companyId: runtime.companyId, branchB: runtime.branchB },
  65  |   );
  66  |   expect(denied.status).toBe(403);
  67  |   expect(denied.body).not.toContain('الفرع ب');
  68  |   await page.goto(`/inventory?branches=${runtime.branchB}`);
  69  |   await expect(page).not.toHaveURL(new RegExp(runtime.branchB));
  70  |   await expect(page.locator('.inventory-page')).not.toContainText('الفرع ب');
  71  | });
  72  | test('phone product setup starts at zero and multi-line receipt creates immutable history', async ({
  73  |   page,
  74  | }) => {
  75  |   await page.setViewportSize({ width: 390, height: 844 });
  76  |   await page.goto(`/brands/${runtime.seed.brand}/products`);
  77  |   await page.getByLabel('اسم المنتج', { exact: true }).fill('منتج رحلة الهاتف');
  78  |   await page.getByLabel('اسم المتغير 1', { exact: true }).fill('أزرق الهاتف');
  79  |   await page.getByRole('button', { name: 'إضافة متغير', exact: true }).click();
  80  |   await page.getByLabel('اسم المتغير 2', { exact: true }).fill('أحمر الهاتف');
  81  |   await page.getByRole('button', { name: 'تعريف المنتج', exact: true }).click();
  82  |   await expect(page.getByRole('heading', { name: 'تم حفظ المنتج' })).toBeVisible();
  83  |   await page.goto(
  84  |     `/inventory?branches=${runtime.inventorySeed.branchA}&search=${encodeURIComponent('منتج رحلة الهاتف')}`,
  85  |   );
  86  |   await expect(page.locator('.stock-row')).toHaveCount(2);
  87  |   for (const row of await page.locator('.stock-row').all())
  88  |     await expect(row.locator('dd')).toHaveText(['٠', '٠', '٠', '٠', '٠', '٠']);
  89  |   await page.getByRole('link', { name: 'تسجيل استلام مخزون', exact: true }).click();
  90  |   await page
  91  |     .getByLabel('فرع الاستلام', { exact: true })
  92  |     .selectOption(runtime.inventorySeed.branchA);
  93  |   await page.getByLabel('البراند', { exact: true }).selectOption(runtime.seed.brand);
  94  |   await page
  95  |     .getByLabel('المتغير 1', { exact: true })
  96  |     .selectOption({ label: 'منتج رحلة الهاتف · أزرق الهاتف · ' });
  97  |   await page.getByLabel('الكمية 1', { exact: true }).fill('١٠');
  98  |   await page.getByRole('button', { name: 'إضافة سطر', exact: true }).click();
  99  |   await page
  100 |     .getByLabel('المتغير 2', { exact: true })
  101 |     .selectOption({ label: 'منتج رحلة الهاتف · أزرق الهاتف · ' });
  102 |   await page.getByLabel('الكمية 2', { exact: true }).fill('٢');
  103 |   await page.getByLabel('الحالة 2', { exact: true }).selectOption('damaged');
  104 |   await page.getByRole('button', { name: 'مراجعة الاستلام', exact: true }).click();
  105 |   await expect(page.getByLabel('مراجعة الاستلام')).toContainText('الفرع أ');
  106 |   await noOverflow(page);
  107 |   await capture(page, 'receipt-confirm-390');
  108 |   await page.getByRole('button', { name: 'تأكيد الاستلام الفعلي', exact: true }).click();
  109 |   await expect(page.getByRole('heading', { name: /استلام مخزون [0-9]/ })).toBeVisible();
  110 |   await expect(page.locator('.stock-row')).toHaveCount(2);
  111 |   await page.getByRole('link', { name: 'عرض تاريخ المتغير' }).first().click();
  112 |   await expect(page.locator('.stock-balances dd')).toHaveText(['١٢', '١٠', '٠', '١٠', '٢', '٠']);
  113 |   await capture(page, 'received-history-390');
  114 | });
  115 | for (const width of [320, 390, 768, 1440])
  116 |   test(`current inventory, advanced filter/back state and long labels at ${width}px`, async ({
  117 |     page,
  118 |   }) => {
  119 |     await page.setViewportSize({ width, height: width === 1440 ? 1050 : 844 });
  120 |     await page.goto(
  121 |       `/inventory?branches=${runtime.inventorySeed.branchA}&search=Blue&categories=unavailable`,
  122 |     );
  123 |     await expect(page.locator('.stock-row')).toHaveCount(1);
  124 |     await expect(page.locator('.stock-balances dd')).toHaveText(['١٢', '١٠', '٠', '١٠', '٢', '٠']);
  125 |     await page.getByRole('button', { name: /فلاتر متقدمة/ }).click();
  126 |     await expect(page.getByLabel('غير متاح', { exact: true })).toBeChecked();
  127 |     await noOverflow(page);
  128 |     await capture(page, `filters-${width}`, width > 768);
  129 |     await page.getByRole('button', { name: 'تطبيق الفلاتر', exact: true }).click();
  130 |     await expect(page.getByLabel('الفلاتر النشطة')).toContainText('فئات');
  131 |     await capture(page, `inventory-${width}`);
  132 |     await page.locator('.stock-row h2 a').click();
  133 |     await expect(page.getByRole('heading', { name: /Blue/ })).toBeVisible();
  134 |     await expect(page.locator('h1')).toBeFocused();
  135 |     await page.getByRole('link', { name: 'العودة بنفس الفلاتر' }).click();
  136 |     await expect(page.getByLabel('بحث', { exact: true })).toHaveValue('Blue');
  137 |     await expect(page).toHaveURL(/categories=unavailable/);
  138 |     await page.getByRole('button', { name: 'الطرود', exact: true }).click();
> 139 |     await expect(page.getByText('لا توجد طرود بهذه الفلاتر. راجع الفرع والفلاتر.')).toBeVisible();
      |                                                                                     ^ Error: expect(locator).toBeVisible() failed
  140 |     await page.getByLabel('موقع العهدة').selectOption('external');
  141 |     await expect(page.locator('.stock-empty')).toContainText('لا يضيف مخزونًا');
  142 |     await noOverflow(page);
  143 |   });
  144 | test('negative quantity retains input and connection failure differs from no results', async ({
  145 |   page,
  146 | }) => {
  147 |   await page.goto('/inventory/receipts/new');
  148 |   await page
  149 |     .getByLabel('فرع الاستلام', { exact: true })
  150 |     .selectOption(runtime.inventorySeed.branchA);
  151 |   await page.getByLabel('البراند', { exact: true }).selectOption(runtime.seed.brand);
  152 |   await page.getByLabel('المتغير 1', { exact: true }).selectOption(runtime.inventorySeed.blue);
  153 |   await page.getByLabel('الكمية 1', { exact: true }).fill('-1');
  154 |   await page.getByRole('button', { name: 'مراجعة الاستلام', exact: true }).click();
  155 |   await expect(page.getByRole('alert')).toContainText('كمية صحيحة موجبة');
  156 |   await expect(page.getByRole('alert')).toBeFocused();
  157 |   await expect(page.getByLabel('الكمية 1')).toHaveValue('-1');
  158 |   await page.route('**/api/v1/inventory/products?**', (route) => route.abort());
  159 |   await page.goto(`/inventory?branches=${runtime.inventorySeed.branchA}`);
  160 |   await expect(page.getByRole('alert')).toContainText('تعذر الاتصال');
  161 |   await expect(page.getByText('لا توجد نتائج بهذه الفلاتر.', { exact: false })).toHaveCount(0);
  162 |   await capture(page, 'loading-failure-1440');
  163 | });
  164 | test('lost response after real commit persists original identity across reload and recovers once', async ({
  165 |   page,
  166 | }) => {
  167 |   const before = await page.request.get(
  168 |     `/api/v1/inventory/products?companyId=${runtime.companyId}&branches=${runtime.inventorySeed.branchA}&variantId=${runtime.inventorySeed.red}`,
  169 |   );
  170 |   const initial = (await before.json()).items[0].soundOnHand;
  171 |   await page.goto('/inventory/receipts/new');
  172 |   await page.getByLabel('فرع الاستلام').selectOption(runtime.inventorySeed.branchA);
  173 |   await page.getByLabel('البراند', { exact: true }).selectOption(runtime.seed.brand);
  174 |   await page.getByLabel('المتغير 1').selectOption(runtime.inventorySeed.red);
  175 |   await page.getByLabel('الكمية 1').fill('4');
  176 |   await page.getByRole('button', { name: 'مراجعة الاستلام', exact: true }).click();
  177 |   let identity = '';
  178 |   await page.route(
  179 |     '**/api/v1/inventory/receipts',
  180 |     async (route) => {
  181 |       identity = route.request().postDataJSON().commandId;
  182 |       const result = await route.fetch();
  183 |       expect(result.status()).toBe(200);
  184 |       await route.abort();
  185 |     },
  186 |     { times: 1 },
  187 |   );
  188 |   await page.getByRole('button', { name: 'تأكيد الاستلام الفعلي', exact: true }).click();
  189 |   await expect(page.getByRole('button', { name: 'استرد نتيجة الحفظ' })).toBeVisible();
  190 |   await page.reload();
  191 |   await expect(page.getByRole('button', { name: 'استرد نتيجة الحفظ' })).toBeVisible();
  192 |   await expect(page.locator('.commercial-recovery')).toContainText(identity);
  193 |   await capture(page, 'receipt-unknown');
  194 |   await page.getByRole('button', { name: 'استرد نتيجة الحفظ' }).click();
  195 |   await expect(page.getByRole('heading', { name: /استلام مخزون [0-9]/ })).toBeVisible();
  196 |   const after = await page.request.get(
  197 |     `/api/v1/inventory/products?companyId=${runtime.companyId}&branches=${runtime.inventorySeed.branchA}&variantId=${runtime.inventorySeed.red}`,
  198 |   );
  199 |   expect((await after.json()).items[0].soundOnHand).toBe(initial + 4);
  200 | });
  201 | test('offline confirmation waits for connection without sending a command', async ({
  202 |   page,
  203 |   context,
  204 | }) => {
  205 |   await page.goto('/inventory/receipts/new');
  206 |   await page.getByLabel('فرع الاستلام').selectOption(runtime.inventorySeed.branchA);
  207 |   await page.getByLabel('البراند', { exact: true }).selectOption(runtime.seed.brand);
  208 |   await page.getByLabel('المتغير 1').selectOption(runtime.inventorySeed.red);
  209 |   await page.getByLabel('الكمية 1').fill('1');
  210 |   await page.getByRole('button', { name: 'مراجعة الاستلام', exact: true }).click();
  211 |   await context.setOffline(true);
  212 |   await page.getByRole('button', { name: 'تأكيد الاستلام الفعلي', exact: true }).click();
  213 |   await expect(page.getByRole('alert')).toContainText('تعذر الاتصال');
  214 |   await expect(page.getByRole('button', { name: 'استرد نتيجة الحفظ' })).toHaveCount(0);
  215 |   await context.setOffline(false);
  216 | });
  217 | test('stale product edit retains draft and requires explicit review of current revision', async ({
  218 |   page,
  219 | }) => {
  220 |   const fields = {
  221 |     name: 'منتج اختبار النسخة',
  222 |     active: true,
  223 |     variants: [{ name: 'افتراضي', options: '', active: true }],
  224 |   };
  225 |   const created = await page.request.post(`/api/v1/brands/${runtime.seed.brand}/products`, {
  226 |     headers: { origin: 'http://127.0.0.1:5297', 'x-csrf-token': runtime.csrfToken },
  227 |     data: {
  228 |       companyId: runtime.companyId,
  229 |       commandId: randomUUID(),
  230 |       schemaVersion: 1,
  231 |       type: 'product.create',
  232 |       brandId: runtime.seed.brand,
  233 |       fields,
  234 |     },
  235 |   });
  236 |   expect(created.status()).toBe(200);
  237 |   const id = (await created.json()).entityId;
  238 |   await page.goto('/products/' + id + '/edit');
  239 |   await page.getByLabel('اسم المنتج', { exact: true }).fill('تعديلي المحتفظ به');
```