# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: inventory.spec.ts >> registry module entry, explicit multi-branch choice, and A-only denied browser request
- Location: tests\p05\inventory.spec.ts:42:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 403
Received: 401
```

# Page snapshot

```yaml
- generic [ref=f2e2]:
  - link "انتقل للمحتوى":
    - /url: "#main-content"
  - banner [ref=f2e3]:
    - generic [ref=f2e4]:
      - link "شحن مساحة العمل" [ref=f2e5] [cursor=pointer]:
        - /url: /
        - strong [ref=f2e11]:
          - text: شحن
          - generic [ref=f2e12]: مساحة العمل
      - generic [ref=f2e14]:
        - text: شركة التجربة
        - generic [ref=f2e15]: staff-a
  - main [ref=f2e16]:
    - button "العودة للرئيسية" [ref=f2e17] [cursor=pointer]
    - generic [ref=f2e18]:
      - generic [ref=f2e20]:
        - paragraph [ref=f2e21]: متابعة يومية
        - heading "المخزون" [active] [level=1] [ref=f2e22]
        - paragraph [ref=f2e23]: اعرف الموجود في الفرع، وما يمكن وعد العميل به، وما يحتاج مراجعة.
      - link "تسجيل استلام مخزون" [ref=f2e24] [cursor=pointer]:
        - /url: /inventory/receipts/new
      - paragraph [ref=f2e25]: المخزون الفعلي داخل فروعك فقط. الحجز مطالبة ضمن الموجود؛ لا يضيف وحدات جديدة.
      - generic [ref=f2e26]:
        - group "نوع المخزون" [ref=f2e27]:
          - button "المنتجات" [pressed] [ref=f2e28] [cursor=pointer]
          - button "الطرود" [ref=f2e29] [cursor=pointer]
        - generic [ref=f2e30]:
          - generic [ref=f2e31]:
            - generic [ref=f2e32]: الفرع
            - textbox "الفرع" [ref=f2e33]: الفرع أ
          - generic [ref=f2e34]:
            - generic [ref=f2e35]: بحث
            - textbox "بحث" [ref=f2e36]:
              - /placeholder: البراند أو المنتج أو المتغير…
          - generic [ref=f2e37]:
            - generic [ref=f2e38]: البراند
            - combobox "البراند" [ref=f2e39] [cursor=pointer]:
              - option "كل البراندات" [selected]
              - option "براند التجربة — منتجات القاهرة والخدمات المتفق عليها"
        - button "فلاتر متقدمة (0)" [ref=f2e40] [cursor=pointer]
        - paragraph [ref=f2e41]: ٢ نتيجة · أرصدة حالية
        - generic [ref=f2e42]:
          - article [ref=f2e43]:
            - generic [ref=f2e44]:
              - paragraph [ref=f2e45]: براند التجربة — منتجات القاهرة والخدمات المتفق عليها · الفرع أ
              - heading [level=2] [ref=f2e46]:
                - link "قميص التجربة — مجموعة المنتجات والملابس المنزلية ذات الاسم الطويل لجميع الفروع · Blue" [ref=f2e47] [cursor=pointer]:
                  - /url: /inventory/variants/9d3c7b69-480a-40c7-903a-eea2969ee43a?branchId=dec10701-3202-4445-b245-d5bef0468f9a&back=%2Finventory%3F
              - paragraph [ref=f2e48]: أزرق · مقاس كبير · وصف طويل للتحقق من شاشة الهاتف
            - generic [ref=f2e49]:
              - generic [ref=f2e50]:
                - term [ref=f2e51]: الموجود فعليًا
                - definition [ref=f2e52]: ١٢
              - generic [ref=f2e53]:
                - term [ref=f2e54]: السليم
                - definition [ref=f2e55]: ١٠
              - generic [ref=f2e56]:
                - term [ref=f2e57]: المحجوز
                - definition [ref=f2e58]: ٠
              - generic [ref=f2e59]:
                - term [ref=f2e60]: المتاح
                - definition [ref=f2e61]: ١٠
              - generic [ref=f2e62]:
                - term [ref=f2e63]: غير المتاح
                - definition [ref=f2e64]: ٢
              - generic [ref=f2e65]:
                - term [ref=f2e66]: عجز الحجز
                - definition [ref=f2e67]: ٠
            - paragraph [ref=f2e68]: "آخر حركة: ٣‏/١٠‏/٢٠٢٦، ١١:٥٤:٥٨ م"
          - article [ref=f2e69]:
            - generic [ref=f2e70]:
              - paragraph [ref=f2e71]: براند التجربة — منتجات القاهرة والخدمات المتفق عليها · الفرع أ
              - heading [level=2] [ref=f2e72]:
                - link "قميص التجربة — مجموعة المنتجات والملابس المنزلية ذات الاسم الطويل لجميع الفروع · Red" [ref=f2e73] [cursor=pointer]:
                  - /url: /inventory/variants/a57975da-ecd8-4cbf-87a7-5b4308c60208?branchId=dec10701-3202-4445-b245-d5bef0468f9a&back=%2Finventory%3F
              - paragraph [ref=f2e74]: أحمر
            - generic [ref=f2e75]:
              - generic [ref=f2e76]:
                - term [ref=f2e77]: الموجود فعليًا
                - definition [ref=f2e78]: ٣
              - generic [ref=f2e79]:
                - term [ref=f2e80]: السليم
                - definition [ref=f2e81]: ٣
              - generic [ref=f2e82]:
                - term [ref=f2e83]: المحجوز
                - definition [ref=f2e84]: ٠
              - generic [ref=f2e85]:
                - term [ref=f2e86]: المتاح
                - definition [ref=f2e87]: ٣
              - generic [ref=f2e88]:
                - term [ref=f2e89]: غير المتاح
                - definition [ref=f2e90]: ٠
              - generic [ref=f2e91]:
                - term [ref=f2e92]: عجز الحجز
                - definition [ref=f2e93]: ٠
            - paragraph [ref=f2e94]: "آخر حركة: ٣‏/١٠‏/٢٠٢٦، ١١:٥٤:٥٨ م"
        - generic [ref=f2e95]:
          - button "السابق" [disabled]
          - generic [ref=f2e96]: صفحة ١
          - button "التالي" [disabled]
          - generic [ref=f2e97]:
            - generic [ref=f2e98]: نتائج الصفحة
            - combobox "نتائج الصفحة" [ref=f2e99] [cursor=pointer]:
              - option "25" [selected]
              - option "50"
              - option "100"
        - generic [ref=f2e100]:
          - paragraph [ref=f2e101]: تعريف المنتجات لا يستلم مخزونًا.
          - link "منتجات براند التجربة — منتجات القاهرة والخدمات المتفق عليها" [ref=f2e102] [cursor=pointer]:
            - /url: /brands/bcb6e76f-f5f1-40b9-8586-66e94bb3b9df/products
    - group [ref=f2e103]:
      - generic "الحساب والجلسة" [ref=f2e104] [cursor=pointer]
  - contentinfo [ref=f2e105]:
    - generic [ref=f2e106]: شحن · إدارة الوصول
    - generic [ref=f2e107]: جلسة خاصة بالشركة
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
> 59  |   expect(denied.status()).toBe(403);
      |                           ^ Error: expect(received).toBe(expected) // Object.is equality
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
  156 |   page,
  157 | }) => {
  158 |   const before = await page.request.get(
  159 |     `/api/v1/inventory/products?companyId=${runtime.companyId}&branches=${runtime.inventorySeed.branchA}&variantId=${runtime.inventorySeed.red}`,
```