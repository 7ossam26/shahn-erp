# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: inventory.spec.ts >> phone product setup starts at zero and multi-line receipt creates immutable history
- Location: tests\p05\inventory.spec.ts:65:1

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('.stock-row')
Expected: 2
Received: 0
Timeout:  15000ms

Call log:
  - Expect "toHaveCount" locator('.stock-row') with timeout 15000ms
  - waiting for locator('.stock-row')
    33 × locator resolved to 0 elements
       - unexpected value "0"

```

# Page snapshot

```yaml
- generic [ref=f1e2]:
  - link "انتقل للمحتوى":
    - /url: "#main-content"
  - banner [ref=f1e3]:
    - generic [ref=f1e4]:
      - link [ref=f1e5] [cursor=pointer]:
        - /url: /
        - strong [ref=f1e11]: شحن
      - generic [ref=f1e12]: شركة التجربة
  - main [ref=f1e14]:
    - button "العودة للرئيسية" [ref=f1e15] [cursor=pointer]
    - generic [ref=f1e16]:
      - generic [ref=f1e18]:
        - paragraph [ref=f1e19]: متابعة يومية
        - heading "المخزون" [level=1] [ref=f1e20]
        - paragraph [ref=f1e21]: اعرف الموجود في الفرع، وما يمكن وعد العميل به، وما يحتاج مراجعة.
      - link "تسجيل استلام مخزون" [ref=f1e22] [cursor=pointer]:
        - /url: /inventory/receipts/new
      - paragraph [ref=f1e23]: المخزون الفعلي داخل فروعك فقط. الحجز مطالبة ضمن الموجود؛ لا يضيف وحدات جديدة.
      - generic [ref=f1e24]:
        - group "نوع المخزون" [ref=f1e25]:
          - button "المنتجات" [pressed] [ref=f1e26] [cursor=pointer]
          - button "الطرود" [ref=f1e27] [cursor=pointer]
        - generic [ref=f1e28]:
          - generic [ref=f1e29]:
            - generic [ref=f1e30]: الفرع
            - combobox "الفرع" [ref=f1e31] [cursor=pointer]:
              - option "اختر الفرع الحالي" [selected]
              - option "الفرع أ"
              - option "الفرع ب"
              - option "كل فروعك المعينة"
          - generic [ref=f1e32]:
            - generic [ref=f1e33]: بحث
            - textbox "بحث" [ref=f1e34]:
              - /placeholder: البراند أو المنتج أو المتغير…
              - text: منتج رحلة الهاتف
          - generic [ref=f1e35]:
            - generic [ref=f1e36]: البراند
            - combobox "البراند" [ref=f1e37] [cursor=pointer]:
              - option "كل البراندات" [selected]
              - option "براند التجربة — منتجات القاهرة والخدمات المتفق عليها"
        - button "فلاتر متقدمة (1)" [ref=f1e38] [cursor=pointer]
        - generic "الفلاتر النشطة" [ref=f1e39]:
          - generic [ref=f1e40]: "بحث: منتج رحلة الهاتف"
          - button "مسح الفلاتر" [ref=f1e41] [cursor=pointer]
        - status [ref=f1e42]: اختر فرعًا لعرض المخزون الحالي.
        - generic [ref=f1e43]:
          - paragraph [ref=f1e44]: تعريف المنتجات لا يستلم مخزونًا.
          - link "منتجات براند التجربة — منتجات القاهرة والخدمات المتفق عليها" [ref=f1e45] [cursor=pointer]:
            - /url: /brands/c11da914-f54e-4cdb-a0d8-440fe748d292/products
    - group [ref=f1e46]:
      - generic "الحساب والجلسة" [ref=f1e47] [cursor=pointer]
  - contentinfo [ref=f1e48]:
    - generic [ref=f1e49]: شحن · إدارة الوصول
    - generic [ref=f1e50]: جلسة خاصة بالشركة
```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | import { readFile, mkdir } from 'node:fs/promises';
  3   | import { randomUUID } from 'node:crypto';
  4   | let runtime: {
  5   |   token: string;
  6   |   companyId: string;
  7   |   csrfToken: string;
  8   |   staffToken: string;
  9   |   branchB: string;
  10  |   seed: { brand: string };
  11  |   inventorySeed: {
  12  |     branchA: string;
  13  |     brand: string;
  14  |     product: string;
  15  |     blue: string;
  16  |     red: string;
  17  |     receipt: string;
  18  |   };
  19  | };
  20  | test.beforeEach(async ({ context }) => {
  21  |   runtime = JSON.parse(await readFile('tests/.p05-runtime.json', 'utf8'));
  22  |   await context.addCookies([
  23  |     {
  24  |       name: 'erp_session',
  25  |       value: runtime.token,
  26  |       url: 'http://127.0.0.1:5297',
  27  |       httpOnly: true,
  28  |       secure: true,
  29  |       sameSite: 'Lax',
  30  |     },
  31  |   ]);
  32  | });
  33  | const noOverflow = async (page: Page) =>
  34  |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  35  | const capture = async (page: Page, name: string) => {
  36  |   await mkdir('docs/verification/P05/screenshots', { recursive: true });
  37  |   await page.screenshot({
  38  |     path: 'docs/verification/P05/screenshots/' + name + '.png',
  39  |     fullPage: true,
  40  |   });
  41  | };
  42  | test('registry module entry, explicit multi-branch choice, and A-only denied browser request', async ({
  43  |   page,
  44  |   context,
  45  | }) => {
  46  |   await page.goto('/');
  47  |   await page.getByRole('link', { name: /المخزون/ }).click();
  48  |   await expect(page.getByText('اختر فرعًا لعرض المخزون الحالي.')).toBeVisible();
  49  |   await page.getByLabel('الفرع', { exact: true }).selectOption(runtime.inventorySeed.branchA);
  50  |   await expect(page.locator('.stock-row').first()).toBeVisible();
  51  |   await context.clearCookies();
  52  |   await page.goto('/api/test/inventory-staff-login');
  53  |   await page.getByRole('link', { name: /المخزون/ }).click();
  54  |   await expect(page.locator('.stock-row').first()).toBeVisible();
  55  |   await expect(page.getByLabel('الفرع', { exact: true })).toHaveValue('الفرع أ');
  56  |   const denied = await page.request.get(
  57  |     `/api/v1/inventory/products?companyId=${runtime.companyId}&branches=${runtime.branchB}`,
  58  |   );
  59  |   expect(denied.status()).toBe(403);
  60  |   expect(await denied.text()).not.toContain('الفرع ب');
  61  |   await page.goto(`/inventory?branches=${runtime.branchB}`);
  62  |   await expect(page).not.toHaveURL(new RegExp(runtime.branchB));
  63  |   await expect(page.locator('.inventory-page')).not.toContainText('الفرع ب');
  64  | });
  65  | test('phone product setup starts at zero and multi-line receipt creates immutable history', async ({
  66  |   page,
  67  | }) => {
  68  |   await page.setViewportSize({ width: 390, height: 844 });
  69  |   await page.goto(`/brands/${runtime.seed.brand}/products`);
  70  |   await page.getByLabel('اسم المنتج', { exact: true }).fill('منتج رحلة الهاتف');
  71  |   await page.getByLabel('اسم المتغير 1', { exact: true }).fill('أزرق الهاتف');
  72  |   await page.getByRole('button', { name: 'إضافة متغير', exact: true }).click();
  73  |   await page.getByLabel('اسم المتغير 2', { exact: true }).fill('أحمر الهاتف');
  74  |   await page.getByRole('button', { name: 'تعريف المنتج', exact: true }).click();
  75  |   await expect(page.getByRole('heading', { name: 'تم حفظ المنتج' })).toBeVisible();
  76  |   await page.goto(
  77  |     `/inventory?branches=${runtime.inventorySeed.branchA}&search=${encodeURIComponent('منتج رحلة الهاتف')}`,
  78  |   );
> 79  |   await expect(page.locator('.stock-row')).toHaveCount(2);
      |                                            ^ Error: expect(locator).toHaveCount(expected) failed
  80  |   for (const row of await page.locator('.stock-row').all())
  81  |     await expect(row.locator('dd')).toHaveText(['٠', '٠', '٠', '٠', '٠', '٠']);
  82  |   await page.getByRole('link', { name: 'تسجيل استلام مخزون', exact: true }).click();
  83  |   await page
  84  |     .getByLabel('فرع الاستلام', { exact: true })
  85  |     .selectOption(runtime.inventorySeed.branchA);
  86  |   await page.getByLabel('البراند', { exact: true }).selectOption(runtime.seed.brand);
  87  |   await page
  88  |     .getByLabel('المتغير 1', { exact: true })
  89  |     .selectOption({ label: 'منتج رحلة الهاتف · أزرق الهاتف · ' });
  90  |   await page.getByLabel('الكمية 1', { exact: true }).fill('١٠');
  91  |   await page.getByRole('button', { name: 'إضافة سطر', exact: true }).click();
  92  |   await page
  93  |     .getByLabel('المتغير 2', { exact: true })
  94  |     .selectOption({ label: 'منتج رحلة الهاتف · أزرق الهاتف · ' });
  95  |   await page.getByLabel('الكمية 2', { exact: true }).fill('٢');
  96  |   await page.getByLabel('الحالة 2', { exact: true }).selectOption('damaged');
  97  |   await page.getByRole('button', { name: 'مراجعة الاستلام', exact: true }).click();
  98  |   await expect(page.getByLabel('مراجعة الاستلام')).toContainText('الفرع أ');
  99  |   await noOverflow(page);
  100 |   await capture(page, 'receipt-confirm-390');
  101 |   await page.getByRole('button', { name: 'تأكيد الاستلام الفعلي', exact: true }).click();
  102 |   await expect(page.getByRole('heading', { name: /استلام مخزون [0-9]/ })).toBeVisible();
  103 |   await expect(page.locator('.stock-row')).toHaveCount(2);
  104 |   await page.getByRole('link', { name: 'عرض تاريخ المتغير' }).first().click();
  105 |   await expect(page.locator('.stock-balances dd')).toHaveText(['١٢', '١٠', '٠', '١٠', '٢', '٠']);
  106 |   await capture(page, 'received-history-390');
  107 | });
  108 | for (const width of [320, 390, 768, 1440])
  109 |   test(`current inventory, advanced filter/back state and long labels at ${width}px`, async ({
  110 |     page,
  111 |   }) => {
  112 |     await page.setViewportSize({ width, height: width === 1440 ? 1050 : 844 });
  113 |     await page.goto(
  114 |       `/inventory?branches=${runtime.inventorySeed.branchA}&search=Blue&categories=unavailable`,
  115 |     );
  116 |     await expect(page.locator('.stock-row')).toHaveCount(1);
  117 |     await expect(page.locator('.stock-balances dd')).toHaveText(['١٢', '١٠', '٠', '١٠', '٢', '٠']);
  118 |     await page.getByRole('button', { name: /فلاتر متقدمة/ }).click();
  119 |     await expect(page.getByLabel('غير متاح', { exact: true })).toBeChecked();
  120 |     await expect(page.getByLabel('الفلاتر النشطة')).toContainText('فئات');
  121 |     await noOverflow(page);
  122 |     await capture(page, `inventory-${width}`);
  123 |     await page.locator('.stock-row h2 a').click();
  124 |     await expect(page.getByRole('heading', { name: /Blue/ })).toBeVisible();
  125 |     await expect(page.locator('h1')).toBeFocused();
  126 |     await page.getByRole('link', { name: 'العودة بنفس الفلاتر' }).click();
  127 |     await expect(page.getByLabel('بحث', { exact: true })).toHaveValue('Blue');
  128 |     await expect(page).toHaveURL(/categories=unavailable/);
  129 |     await page.getByRole('button', { name: 'الطرود', exact: true }).click();
  130 |     await expect(page.getByRole('heading', { name: 'لا توجد طرود مسجلة بعد' })).toBeVisible();
  131 |     await page.getByLabel('موقع العهدة').selectOption('external');
  132 |     await expect(page.locator('.stock-empty')).toContainText('لا يضيف مخزونًا');
  133 |     await noOverflow(page);
  134 |   });
  135 | test('negative quantity retains input and connection failure differs from no results', async ({
  136 |   page,
  137 | }) => {
  138 |   await page.goto('/inventory/receipts/new');
  139 |   await page
  140 |     .getByLabel('فرع الاستلام', { exact: true })
  141 |     .selectOption(runtime.inventorySeed.branchA);
  142 |   await page.getByLabel('البراند', { exact: true }).selectOption(runtime.seed.brand);
  143 |   await page.getByLabel('المتغير 1', { exact: true }).selectOption(runtime.inventorySeed.blue);
  144 |   await page.getByLabel('الكمية 1', { exact: true }).fill('-1');
  145 |   await page.getByRole('button', { name: 'مراجعة الاستلام', exact: true }).click();
  146 |   await expect(page.getByRole('alert')).toContainText('كمية صحيحة موجبة');
  147 |   await expect(page.getByRole('alert')).toBeFocused();
  148 |   await expect(page.getByLabel('الكمية 1')).toHaveValue('-1');
  149 |   await page.route('**/api/v1/inventory/products?**', (route) => route.abort());
  150 |   await page.goto(`/inventory?branches=${runtime.inventorySeed.branchA}`);
  151 |   await expect(page.getByRole('alert')).toContainText('تعذر الاتصال');
  152 |   await expect(page.getByText('لا توجد نتائج بهذه الفلاتر.', { exact: false })).toHaveCount(0);
  153 |   await capture(page, 'loading-failure-1440');
  154 | });
  155 | test('lost response after real commit persists original identity across reload and recovers once', async ({
  156 |   page,
  157 | }) => {
  158 |   const before = await page.request.get(
  159 |     `/api/v1/inventory/products?companyId=${runtime.companyId}&branches=${runtime.inventorySeed.branchA}&variantId=${runtime.inventorySeed.red}`,
  160 |   );
  161 |   const initial = (await before.json()).items[0].soundOnHand;
  162 |   await page.goto('/inventory/receipts/new');
  163 |   await page.getByLabel('فرع الاستلام').selectOption(runtime.inventorySeed.branchA);
  164 |   await page.getByLabel('البراند', { exact: true }).selectOption(runtime.seed.brand);
  165 |   await page.getByLabel('المتغير 1').selectOption(runtime.inventorySeed.red);
  166 |   await page.getByLabel('الكمية 1').fill('4');
  167 |   await page.getByRole('button', { name: 'مراجعة الاستلام', exact: true }).click();
  168 |   let identity = '';
  169 |   await page.route(
  170 |     '**/api/v1/inventory/receipts',
  171 |     async (route) => {
  172 |       identity = route.request().postDataJSON().commandId;
  173 |       const result = await route.fetch();
  174 |       expect(result.status()).toBe(200);
  175 |       await route.abort();
  176 |     },
  177 |     { times: 1 },
  178 |   );
  179 |   await page.getByRole('button', { name: 'تأكيد الاستلام الفعلي', exact: true }).click();
```