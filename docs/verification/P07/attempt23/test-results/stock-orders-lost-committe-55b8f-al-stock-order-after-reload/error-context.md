# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: stock-orders.spec.ts >> lost committed confirmation response recovers original stock order after reload
- Location: tests\p07\stock-orders.spec.ts:159:1

# Error details

```
Error: route.abort: Route is already handled!
```

```
Error: page.reload: Test ended.
Call log:
  - waiting for navigation until "load"
    - navigated to "http://127.0.0.1:5309/preparation/orders/new"

```

# Test source

```ts
  75  |   const before = await control('/statistics');
  76  |   await fill(page);
  77  |   await noOverflow(page);
  78  |   await capture(page, 'stock-order-390');
  79  |   await submit(page);
  80  |   await expect(page).toHaveURL(/\/shipments\/\d+$/);
  81  |   const url = page.url(),
  82  |     ref = url.split('/').at(-1)!;
  83  |   await expect(page.getByRole('heading', { name: 'حجوزات ومكونات المخزون' })).toBeVisible();
  84  |   await expect(page.getByText('305.00', { exact: false }).first()).toBeVisible();
  85  |   await capture(page, 'stock-detail-390');
  86  |   const after = await control('/statistics');
  87  |   expect(after.shipments - before.shipments).toBe(1);
  88  |   expect(after.receipts).toBe(before.receipts);
  89  |   expect(after.journal).toBe(before.journal);
  90  |   await page.goto('/preparation?branches=' + runtime.stockSeed.branchA + '&search=' + ref);
  91  |   await expect(page.getByRole('link', { name: 'طرد ' + ref })).toBeVisible();
  92  |   await page.getByRole('button', { name: 'إكمال التجهيز', exact: true }).click();
  93  |   await page.getByRole('button', { name: 'تم التجهيز بالفعل', exact: true }).click();
  94  |   await expect(page.getByText('تم التجهيز', { exact: false }).first()).toBeVisible();
  95  |   await page.goto(url);
  96  |   await page.getByText('إجراءات قبل التسليم ونتيجة آخر طلب', { exact: true }).click();
  97  |   await page.getByRole('button', { name: 'إلغاء الطلب', exact: true }).click();
  98  |   await page.getByLabel('سبب الإلغاء').fill('إلغاء بعد التغليف والفحص الفعلي لاحقًا');
  99  |   await page.getByRole('button', { name: 'تأكيد الإلغاء', exact: true }).click();
  100 |   await expect(page.getByRole('heading', { name: 'تأكيد فك التغليف والفحص الفعلي' })).toBeVisible();
  101 |   await page.getByLabel(/^سليم — .*Blue/).fill('1');
  102 |   await page.getByLabel(/^تالف — .*Blue/).fill('1');
  103 |   await page
  104 |     .getByLabel('سبب ونتيجة الفحص الفعلي')
  105 |     .fill('فك التغليف فعليًا: وحدة سليمة ووحدة تالفة');
  106 |   await page.getByRole('button', { name: 'تأكيد الفحص الفعلي', exact: true }).click();
  107 |   await expect(page.getByText(/سليم مفحوص.*1.*تالف.*1/).first()).toBeVisible();
  108 |   await capture(page, 'unpack-390');
  109 |   await noOverflow(page);
  110 |   await page.goto(
  111 |     '/inventory/variants/' + runtime.stockSeed.blue + '?branchId=' + runtime.stockSeed.branchA,
  112 |   );
  113 |   await expect(page.getByRole('heading', { name: 'أين تلتزم الكميات' })).toBeVisible();
  114 |   await expect(page.getByRole('link', { name: 'طلب ' + ref }).first()).toBeVisible();
  115 | });
  116 | test('desktop/mobile shortage and missing tariff retain input; branch change revalidates selections', async ({
  117 |   page,
  118 | }) => {
  119 |   await fill(page);
  120 |   await page.getByLabel('الكمية 1', { exact: true }).fill('999');
  121 |   await expect(
  122 |     page.getByRole('alert').filter({ hasText: 'المخزون المتاح لا يكفي' }).first(),
  123 |   ).toBeVisible();
  124 |   await expect(page.getByRole('button', { name: 'مراجعة طلب المخزون' })).toBeDisabled();
  125 |   await capture(page, 'shortage-1440');
  126 |   await noOverflow(page);
  127 |   await page.getByLabel('الكمية 1', { exact: true }).fill('1');
  128 |   await page.getByLabel('المحافظة', { exact: true }).selectOption(runtime.seed.giza);
  129 |   await expect(page.getByRole('alert').filter({ hasText: 'لا يوجد سعر' }).first()).toBeVisible();
  130 |   await expect(page.getByLabel('اسم المستلم')).not.toHaveValue('');
  131 |   await page.getByLabel('المحافظة', { exact: true }).selectOption(runtime.seed.cairo);
  132 |   await page.getByLabel('فرع الاستلام').selectOption(runtime.branchB);
  133 |   await expect(
  134 |     page.getByRole('alert').filter({ hasText: 'المخزون المتاح لا يكفي' }).first(),
  135 |   ).toBeVisible();
  136 |   await expect(page.getByLabel('الصنف 1', { exact: true })).toHaveValue(runtime.stockSeed.blue);
  137 |   await page.setViewportSize({ width: 320, height: 844 });
  138 |   await noOverflow(page);
  139 |   await capture(page, 'branch-shortage-320');
  140 | });
  141 | test('blocked 5/7 order visible in queue/filter/detail without a preparation shortcut at320/768/1440', async ({
  142 |   page,
  143 | }) => {
  144 |   for (const width of [320, 768, 1440]) {
  145 |     await page.setViewportSize({ width, height: width === 1440 ? 1050 : 844 });
  146 |     await page.goto('/preparation?branches=' + runtime.stockSeed.branchA + '&preparation=blocked');
  147 |     await expect(
  148 |       page.getByRole('link', { name: 'طرد ' + runtime.stockSeed.blocked.reference }),
  149 |     ).toBeVisible();
  150 |     await expect(page.getByRole('button', { name: 'إكمال التجهيز', exact: true })).toHaveCount(0);
  151 |     await noOverflow(page);
  152 |     await capture(page, 'blocked-queue-' + width);
  153 |   }
  154 |   await page.goto('/shipments/' + runtime.stockSeed.blocked.reference);
  155 |   await expect(page.getByText(/موقوف: يوجد عجز/)).toBeVisible();
  156 |   await noOverflow(page);
  157 |   await capture(page, 'blocked-detail-1440');
  158 | });
  159 | test('lost committed confirmation response recovers original stock order after reload', async ({
  160 |   page,
  161 | }) => {
  162 |   await fill(page);
  163 |   await page.getByLabel('الكمية 1', { exact: true }).fill('1');
  164 |   await page.getByLabel('المستحق للقطعة 1 (ج.م)').fill('0');
  165 |   const before = await control('/statistics');
  166 |   await page.route('**/api/v1/shipments', async (route) => {
  167 |     if (route.request().method() === 'POST') {
  168 |       await route.fetch();
  169 |       await route.abort('failed');
  170 |     } else await route.continue();
  171 |   });
  172 |   await submit(page);
  173 |   await expect(page.getByRole('button', { name: 'استرد نتيجة الحفظ' })).toBeVisible();
  174 |   await page.unroute('**/api/v1/shipments');
> 175 |   await page.reload();
      |              ^ Error: page.reload: Test ended.
  176 |   await page.getByRole('button', { name: 'استرد نتيجة الحفظ' }).click();
  177 |   await expect(page).toHaveURL(/\/shipments\/\d+$/);
  178 |   const after = await control('/statistics');
  179 |   expect(after.shipments - before.shipments).toBe(1);
  180 |   expect(after.receipts).toBe(before.receipts);
  181 |   await capture(page, 'recovered-1440');
  182 | });
  183 | test('server denies branch revoked after form load and preserves entered recipient', async ({
  184 |   page,
  185 | }) => {
  186 |   await fill(page);
  187 |   await page.getByLabel('الكمية 1', { exact: true }).fill('1');
  188 |   await control('/revoke-a');
  189 |   try {
  190 |     await submit(page);
  191 |     await expect(page.getByRole('alert').filter({ hasText: 'غير مسندة لك' }).first()).toBeVisible();
  192 |     await expect(page.getByLabel('اسم المستلم')).not.toHaveValue('');
  193 |     await capture(page, 'denied-preserved-1440');
  194 |   } finally {
  195 |     await control('/restore-a');
  196 |   }
  197 | });
  198 | test('two browser forms loaded before stock changes receive one success and a named server shortage with retained input',async({page,context})=>{
  199 |  await fill(page);await page.getByLabel('الكمية 1',{exact:true}).fill('1');await page.getByRole('button',{name:'حذف القطعة 2',exact:true}).click();
  200 |  const quantity=await page.evaluate(async r=>{const response=await fetch('/api/v1/shipments/stock?'+new URLSearchParams({companyId:r.companyId,branchId:r.stockSeed.branchA,brandId:r.seed.brand}));const data=await response.json();return data.items.find((x:{variantId:string})=>x.variantId===r.stockSeed.blue).available;},runtime);
  201 |  expect(quantity).toBeGreaterThan(0);const other=await context.newPage();await fill(other);await other.getByRole('button',{name:'حذف القطعة 2',exact:true}).click();await other.getByLabel('الكمية 1',{exact:true}).fill(String(quantity));
  202 |  const before=await control('/statistics');await submit(other);await expect(other).toHaveURL(/\/shipments\/\d+$/);await submit(page);
  203 |  await expect(page.getByRole('alert').filter({hasText:'المخزون المتاح لا يكفي'}).first()).toBeVisible();await expect(page.getByLabel('الكمية 1',{exact:true})).toHaveValue('1');await expect(page.getByLabel('اسم المستلم')).not.toHaveValue('');
  204 |  expect((await control('/statistics')).shipments-before.shipments).toBe(1);await capture(page,'server-stock-shortage-1440');await other.close();
  205 | });
  206 | 
```