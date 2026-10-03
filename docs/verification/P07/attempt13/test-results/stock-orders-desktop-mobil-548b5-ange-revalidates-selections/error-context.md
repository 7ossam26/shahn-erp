# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: stock-orders.spec.ts >> desktop/mobile shortage and missing tariff retain input; branch change revalidates selections
- Location: tests\p07\stock-orders.spec.ts:23:1

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.selectOption: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByLabel('الصنف 1', { exact: true })
    - locator resolved to <select required="" aria-label="الصنف 1">…</select>
  - attempting select option action
    2 × waiting for element to be visible and enabled
      - did not find some options
    - retrying select option action
    - waiting 20ms
    2 × waiting for element to be visible and enabled
      - did not find some options
    - retrying select option action
      - waiting 100ms
    75 × waiting for element to be visible and enabled
       - did not find some options
     - retrying select option action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=f1e2]:
  - link "انتقل للمحتوى":
    - /url: "#main-content"
  - banner [ref=f1e3]:
    - generic [ref=f1e4]:
      - link "شحن مساحة العمل" [ref=f1e5] [cursor=pointer]:
        - /url: /
        - strong [ref=f1e11]:
          - text: شحن
          - generic [ref=f1e12]: مساحة العمل
      - generic [ref=f1e14]:
        - text: شركة التجربة
        - generic [ref=f1e15]: admin
  - main [ref=f1e16]:
    - button "العودة للرئيسية" [ref=f1e17] [cursor=pointer]
    - generic [ref=f1e19]:
      - paragraph [ref=f1e20]: استلام الطرود
      - heading "طلب من المخزون" [level=1] [ref=f1e21]
      - paragraph [ref=f1e22]: البوليصة، المبالغ المتبقية، والاستلام الفعلي في خطوة واحدة.
    - link "قائمة التجهيز" [ref=f1e23] [cursor=pointer]:
      - /url: /preparation
    - generic [ref=f1e24]:
      - group [ref=f1e25]:
        - group "الاستلام والخدمة" [ref=f1e26]:
          - paragraph [ref=f1e28]: سجّل الفرع الذي توجد فيه البضاعة بالفعل.
          - generic [ref=f1e29]:
            - generic [ref=f1e30]:
              - generic [ref=f1e31]: فرع الاستلام
              - combobox "فرع الاستلام" [ref=f1e32] [cursor=pointer]:
                - option "اختر الفرع" [selected]
                - option "الفرع أ"
                - option "الفرع ب"
            - generic [ref=f1e33]:
              - generic [ref=f1e34]: البراند
              - combobox "البراند" [ref=f1e35] [cursor=pointer]:
                - option "اختر البراند" [selected]
                - option "براند التجربة — منتجات القاهرة والخدمات المتفق عليها"
            - generic [ref=f1e36]:
              - generic [ref=f1e37]: الخدمة
              - combobox "الخدمة" [ref=f1e38] [cursor=pointer]
            - generic [ref=f1e39]:
              - generic [ref=f1e40]: مرجع البراند (اختياري)
              - textbox "مرجع البراند (اختياري)" [ref=f1e41]
        - group "بيانات المستلم" [ref=f1e42]:
          - paragraph [ref=f1e44]: انقل البيانات من بوليصة البراند؛ رابط الموقع اختياري.
          - generic [ref=f1e45]:
            - generic [ref=f1e46]:
              - generic [ref=f1e47]: اسم المستلم
              - textbox "اسم المستلم" [ref=f1e48]
            - generic [ref=f1e49]:
              - generic [ref=f1e50]: رقم الهاتف
              - textbox "رقم الهاتف" [ref=f1e51]
            - generic [ref=f1e52]:
              - generic [ref=f1e53]: المحافظة
              - combobox "المحافظة" [ref=f1e54] [cursor=pointer]:
                - option "اختر المحافظة" [selected]
                - option "الجيزة"
                - option "القاهرة"
            - generic [ref=f1e55]:
              - generic [ref=f1e56]: المنطقة (اختياري)
              - combobox "المنطقة (اختياري)" [ref=f1e57] [cursor=pointer]:
                - option "سعر المحافظة" [selected]
            - generic [ref=f1e58]:
              - generic [ref=f1e59]: العنوان المكتوب
              - textbox "العنوان المكتوب" [ref=f1e60]
            - generic [ref=f1e61]:
              - generic [ref=f1e62]: رابط الموقع (اختياري)
              - textbox "رابط الموقع (اختياري)" [ref=f1e63]
        - group "القطع والمبالغ المستحقة" [ref=f1e64]:
          - paragraph [ref=f1e66]: أدخل المبلغ المتبقي للقطعة الواحدة. للبضاعة المدفوعة للبراند أدخل صفرًا؛ القطع ذات القيم المختلفة توضع في سطور مستقلة.
          - generic [ref=f1e67]:
            - status [ref=f1e68]: اختر الأصناف الموجودة بالفعل في الفرع؛ تغيير الفرع يعيد فحص كل السطور.
            - button "تحديث المخزون" [ref=f1e69] [cursor=pointer]
            - generic [ref=f1e71]:
              - generic [ref=f1e72]:
                - generic [ref=f1e73]: الصنف 1
                - combobox "الصنف 1" [ref=f1e74] [cursor=pointer]:
                  - option "اختر صنفًا من مخزون الفرع" [selected]
                - paragraph [ref=f1e75]: "المتاح في هذا الفرع: —"
              - generic [ref=f1e76]:
                - generic [ref=f1e77]: وصف القطعة 1
                - textbox "وصف القطعة 1" [ref=f1e78]
              - generic [ref=f1e79]:
                - generic [ref=f1e80]: الكمية 1
                - textbox "الكمية 1" [ref=f1e81]: "1"
              - generic [ref=f1e82]:
                - generic [ref=f1e83]: المستحق للقطعة 1 (ج.م)
                - textbox "المستحق للقطعة 1 (ج.م)" [ref=f1e84]: "0.00"
            - button "إضافة قطعة" [ref=f1e85] [cursor=pointer]
            - generic [ref=f1e86]:
              - generic [ref=f1e87]: سداد الشحن
              - combobox "سداد الشحن" [ref=f1e88] [cursor=pointer]:
                - option "مستحق على المستلم" [selected]
                - option "مدفوع إلى البراند — يموله البراند"
                - option "مستحق شحن محدد من البراند"
        - group "الفحص والملاحظات" [ref=f1e89]:
          - paragraph [ref=f1e91]: إذن الفحص مستقل عن سياسة التسليم الجزئي.
          - generic [ref=f1e92]:
            - generic [ref=f1e93]:
              - generic [ref=f1e94]: السماح بالفحص
              - combobox "السماح بالفحص" [ref=f1e95] [cursor=pointer]:
                - option "اختر صراحةً" [selected]
                - option "مسموح"
                - option "غير مسموح"
            - generic [ref=f1e96]:
              - generic [ref=f1e97]: ملاحظات (اختياري)
              - textbox "ملاحظات (اختياري)" [ref=f1e98]
      - button "مراجعة طلب المخزون" [disabled]
      - button "تحديث الإعدادات" [ref=f1e99] [cursor=pointer]
    - group [ref=f1e100]:
      - generic "الحساب والجلسة" [ref=f1e101] [cursor=pointer]
  - contentinfo [ref=f1e102]:
    - generic [ref=f1e103]: شحن · إدارة الوصول
    - generic [ref=f1e104]: جلسة خاصة بالشركة
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
> 11  |     blue: string;
      |                                                ^ Error: locator.selectOption: Test timeout of 60000ms exceeded.
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
```