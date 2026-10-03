# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: stock-orders.spec.ts >> Arabic mobile actual stock order at305, explicit preparation, cancellation and partial unpack
- Location: tests\p07\stock-orders.spec.ts:71:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  getByText('تم التجهيز').first()
Expected: visible
Received: hidden
Timeout:  15000ms

Call log:
  - Expect "toBeVisible" getByText('تم التجهيز').first() with timeout 15000ms
  - waiting for getByText('تم التجهيز').first()
    33 × locator resolved to <option value="complete">تم التجهيز</option>
       - unexpected value "hidden"

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
  - paragraph: تجهيز الطرود
  - heading "قائمة التجهيز" [level=1]
  - paragraph: طلبات تغليف الشركة، مع تسجيل اكتمال التجهيز.
  - link "تسجيل طرد مستلم":
    - /url: /shipments/new
  - text: الفرع
  - combobox "الفرع":
    - option "اختر الفرع"
    - option "الفرع أ" [selected]
    - option "الفرع ب"
  - text: حالة التجهيز
  - combobox "حالة التجهيز":
    - option "كل الحالات" [selected]
    - option "بانتظار التجهيز"
    - option "موقوف بعجز المخزون"
    - option "تم التجهيز"
  - button "فلاتر متقدمة (1)"
  - text: بحث برقم الطرد أو بيانات المستلم
  - textbox "بحث برقم الطرد أو بيانات المستلم": "10005"
  - text: "بحث: 10005"
  - button "مسح الفلاتر"
  - link "طلب من المخزون":
    - /url: /preparation/orders/new
  - paragraph: ١ طرد
  - article:
    - link "طرد 10005":
      - /url: /shipments/10005
    - heading "مستلم طلب المخزون — اسم طويل للتحقق من العربية والهاتف" [level=2]
    - paragraph: براند التجربة — منتجات القاهرة والخدمات المتفق عليها · تجهيز من مخزون البراند
    - paragraph: الفرع أ · عهدة الفرع
    - paragraph: تم التجهيز
    - paragraph: في الفرع منذ 0 يوم
  - button "السابق" [disabled]
  - text: "1"
  - button "التالي" [disabled]
  - group: الحساب والجلسة
- contentinfo: شحن · إدارة الوصول جلسة خاصة بالشركة
```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | import { readFile, mkdir } from 'node:fs/promises';
  3   | let runtime: {
  4   |   token: string;
  5   |   secret: string;
  6   |   companyId: string;
  7   |   csrfToken: string;
  8   |   branchB: string;
  9   |   seed: { brand: string; cairo: string; giza: string };
  10  |   stockSeed: {
  11  |     blue: string;
  12  |     red: string;
  13  |     held: string;
  14  |     branchA: string;
  15  |     blocked: { reference: string };
  16  |   };
  17  | };
  18  | test.beforeEach(async ({ context }) => {
  19  |   runtime = JSON.parse(await readFile('tests/.p07-runtime.json', 'utf8'));
  20  |   await context.addCookies([
  21  |     {
  22  |       name: 'erp_session',
  23  |       value: runtime.token,
  24  |       url: 'http://127.0.0.1:5309',
  25  |       httpOnly: true,
  26  |       secure: true,
  27  |       sameSite: 'Lax',
  28  |     },
  29  |   ]);
  30  | });
  31  | const control = async (path: string) => {
  32  |   const r = await fetch('http://127.0.0.1:4310' + path, {
  33  |     headers: { 'x-test-secret': runtime.secret },
  34  |   });
  35  |   expect(r.ok).toBe(true);
  36  |   return path === '/statistics' ? r.json() : r.text();
  37  | };
  38  | const capture = async (page: Page, name: string) => {
  39  |   await mkdir('docs/verification/P07/screenshots', { recursive: true });
  40  |   await page.screenshot({
  41  |     path: 'docs/verification/P07/screenshots/' + name + '.png',
  42  |     fullPage: true,
  43  |   });
  44  | };
  45  | const noOverflow = async (page: Page) =>
  46  |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  47  | async function fill(page: Page, blue = runtime.stockSeed.blue) {
  48  |   await page.goto('/preparation/orders/new');
  49  |   await page.getByLabel('فرع الاستلام').selectOption(runtime.stockSeed.branchA);
  50  |   await page.getByLabel('البراند', { exact: true }).selectOption(runtime.seed.brand);
  51  |   await expect(page.getByLabel('الخدمة', { exact: true })).toHaveValue('stored_stock');
  52  |   await page
  53  |     .getByLabel('اسم المستلم')
  54  |     .fill('مستلم طلب المخزون — اسم طويل للتحقق من العربية والهاتف');
  55  |   await page.getByLabel('رقم الهاتف').fill('٠١٠ ١٢٣٤ ٥٦٧٨');
  56  |   await page.getByLabel('المحافظة', { exact: true }).selectOption(runtime.seed.cairo);
  57  |   await page.getByLabel('العنوان المكتوب').fill('القاهرة — شارع البوليصة — الطابق الثالث');
  58  |   await page.getByLabel('الصنف 1', { exact: true }).selectOption(blue);
  59  |   await page.getByLabel('الكمية 1', { exact: true }).fill('2');
  60  |   await page.getByLabel('المستحق للقطعة 1 (ج.م)').fill('50');
  61  |   await page.getByRole('button', { name: 'إضافة قطعة', exact: true }).click();
  62  |   await page.getByLabel('الصنف 2', { exact: true }).selectOption(runtime.stockSeed.red);
  63  |   await page.getByLabel('المستحق للقطعة 2 (ج.م)').fill('150');
  64  |   await page.getByLabel('السماح بالفحص').selectOption('true');
  65  | }
  66  | async function submit(page: Page) {
  67  |   await page.getByRole('button', { name: 'مراجعة طلب المخزون', exact: true }).click();
  68  |   await page.getByLabel('راجعت الفرع والأصناف والكميات المطلوب حجزها').check();
  69  |   await page.getByRole('button', { name: 'تأكيد طلب المخزون', exact: true }).click();
  70  | }
  71  | test('Arabic mobile actual stock order at305, explicit preparation, cancellation and partial unpack', async ({
  72  |   page,
  73  | }) => {
  74  |   await page.setViewportSize({ width: 390, height: 844 });
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
> 94  |   await expect(page.getByText('تم التجهيز', { exact: false }).first()).toBeVisible();
      |                                                                        ^ Error: expect(locator).toBeVisible() failed
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
  175 |   await page.reload();
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
```