# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: inventory.spec.ts >> registry module entry, explicit multi-branch choice, and A-only denied browser request
- Location: tests\p05\inventory.spec.ts:42:1

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator: getByLabel('الفرع', { exact: true })
Expected: "الفرع أ"
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toHaveText" getByLabel('الفرع', { exact: true }) with timeout 15000ms
  - waiting for getByLabel('الفرع', { exact: true })

```

```yaml
- link "انتقل للمحتوى":
  - /url: "#main-content"
- banner:
  - link "شحن مساحة العمل":
    - /url: /
    - strong: شحن مساحة العمل
  - text: شركة التجربة staff-a
- main:
  - button "العودة للرئيسية"
  - paragraph: متابعة يومية
  - heading "المخزون" [level=1]
  - paragraph: اعرف الموجود في الفرع، وما يمكن وعد العميل به، وما يحتاج مراجعة.
  - link "تسجيل استلام مخزون":
    - /url: /inventory/receipts/new
  - paragraph: المخزون الفعلي داخل فروعك فقط. الحجز مطالبة ضمن الموجود؛ لا يضيف وحدات جديدة.
  - group "نوع المخزون":
    - button "المنتجات" [pressed]
    - button "الطرود"
  - text: الفرع
  - paragraph: الفرع أ
  - text: بحث
  - textbox "بحث":
    - /placeholder: البراند أو المنتج أو المتغير…
  - text: البراند
  - combobox "البراند":
    - option "كل البراندات" [selected]
    - option "براند التجربة — منتجات القاهرة والخدمات المتفق عليها"
  - button "فلاتر متقدمة (0)"
  - paragraph: ٢ نتيجة · أرصدة حالية
  - article:
    - paragraph: براند التجربة — منتجات القاهرة والخدمات المتفق عليها · الفرع أ
    - heading "قميص التجربة — مجموعة المنتجات والملابس المنزلية ذات الاسم الطويل لجميع الفروع · Blue" [level=2]:
      - link "قميص التجربة — مجموعة المنتجات والملابس المنزلية ذات الاسم الطويل لجميع الفروع · Blue":
        - /url: /inventory/variants/ff699172-6be6-4aff-ba85-3d82caf14f9d?branchId=0b652adb-d36d-423a-a5c9-24e25c6b9425&back=%2Finventory%3F
    - paragraph: أزرق · مقاس كبير · وصف طويل للتحقق من شاشة الهاتف
    - term: الموجود فعليًا
    - definition: ١٢
    - term: السليم
    - definition: ١٠
    - term: المحجوز
    - definition: ٠
    - term: المتاح
    - definition: ١٠
    - term: غير المتاح
    - definition: ٢
    - term: عجز الحجز
    - definition: ٠
    - paragraph: "آخر حركة: ٣‏/١٠‏/٢٠٢٦، ١١:٥١:٢١ م"
  - article:
    - paragraph: براند التجربة — منتجات القاهرة والخدمات المتفق عليها · الفرع أ
    - heading "قميص التجربة — مجموعة المنتجات والملابس المنزلية ذات الاسم الطويل لجميع الفروع · Red" [level=2]:
      - link "قميص التجربة — مجموعة المنتجات والملابس المنزلية ذات الاسم الطويل لجميع الفروع · Red":
        - /url: /inventory/variants/f097ad4b-2519-4fcd-80e5-ebad716f3b37?branchId=0b652adb-d36d-423a-a5c9-24e25c6b9425&back=%2Finventory%3F
    - paragraph: أحمر
    - term: الموجود فعليًا
    - definition: ٣
    - term: السليم
    - definition: ٣
    - term: المحجوز
    - definition: ٠
    - term: المتاح
    - definition: ٣
    - term: غير المتاح
    - definition: ٠
    - term: عجز الحجز
    - definition: ٠
    - paragraph: "آخر حركة: ٣‏/١٠‏/٢٠٢٦، ١١:٥١:٢١ م"
  - button "السابق" [disabled]
  - text: صفحة ١
  - button "التالي" [disabled]
  - text: نتائج الصفحة
  - combobox "نتائج الصفحة":
    - option "25" [selected]
    - option "50"
    - option "100"
  - paragraph: تعريف المنتجات لا يستلم مخزونًا.
  - link "منتجات براند التجربة — منتجات القاهرة والخدمات المتفق عليها":
    - /url: /brands/c11da914-f54e-4cdb-a0d8-440fe748d292/products
  - group: الحساب والجلسة
- contentinfo: شحن · إدارة الوصول جلسة خاصة بالشركة
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
> 55  |   await expect(page.getByLabel('الفرع', { exact: true })).toHaveText('الفرع أ');
      |                                                           ^ Error: expect(locator).toHaveText(expected) failed
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
  79  |   await expect(page.locator('.stock-row')).toHaveCount(2);
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
```