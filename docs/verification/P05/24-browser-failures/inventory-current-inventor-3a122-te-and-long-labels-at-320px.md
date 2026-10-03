# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: inventory.spec.ts >> current inventory, advanced filter/back state and long labels at 320px
- Location: tests\p05\inventory.spec.ts:109:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('.stock-row h2 a')
    - locator resolved to <a data-discover="true" href="/inventory/variants/9d3c7b69-480a-40c7-903a-eea2969ee43a?branchId=dec10701-3202-4445-b245-d5bef0468f9a&back=%2Finventory%3Fbranches%3Ddec10701-3202-4445-b245-d5bef0468f9a%26search%3DBlue%26categories%3Dunavailable">قميص التجربة — مجموعة المنتجات والملابس المنزلية …</a>
  - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <legend>فئات المخزون — أي فئة مختارة</legend> from <div role="dialog" tabindex="-1" id="radix-_r_9_" data-state="open" data-slot="dialog-content" aria-labelledby="radix-_r_a_" aria-describedby="radix-_r_b_" class="fixed top-[50%] start-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] rtl:-translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[s…>…</div> subtree intercepts pointer events
  - retrying click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <p>التاريخ يختار الأرصدة التي شهدت حركة في الفترة بت…</p> from <div role="dialog" tabindex="-1" id="radix-_r_9_" data-state="open" data-slot="dialog-content" aria-labelledby="radix-_r_a_" aria-describedby="radix-_r_b_" class="fixed top-[50%] start-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] rtl:-translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[s…>…</div> subtree intercepts pointer events
  - retrying click action
    - waiting 20ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <legend>فئات المخزون — أي فئة مختارة</legend> from <div role="dialog" tabindex="-1" id="radix-_r_9_" data-state="open" data-slot="dialog-content" aria-labelledby="radix-_r_a_" aria-describedby="radix-_r_b_" class="fixed top-[50%] start-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] rtl:-translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[s…>…</div> subtree intercepts pointer events
  2 × retrying click action
      - waiting 100ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div data-state="open" aria-hidden="true" data-aria-hidden="true" data-slot="dialog-overlay" class="fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"></div> intercepts pointer events
  27 × retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <p>التاريخ يختار الأرصدة التي شهدت حركة في الفترة بت…</p> from <div role="dialog" tabindex="-1" id="radix-_r_9_" data-state="open" data-slot="dialog-content" aria-labelledby="radix-_r_a_" aria-describedby="radix-_r_b_" class="fixed top-[50%] start-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] rtl:-translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[s…>…</div> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <legend>فئات المخزون — أي فئة مختارة</legend> from <div role="dialog" tabindex="-1" id="radix-_r_9_" data-state="open" data-slot="dialog-content" aria-labelledby="radix-_r_a_" aria-describedby="radix-_r_b_" class="fixed top-[50%] start-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] rtl:-translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[s…>…</div> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div data-state="open" aria-hidden="true" data-aria-hidden="true" data-slot="dialog-overlay" class="fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"></div> intercepts pointer events
     - retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div data-state="open" aria-hidden="true" data-aria-hidden="true" data-slot="dialog-overlay" class="fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"></div> intercepts pointer events
  - retrying click action
    - waiting 500ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <p>التاريخ يختار الأرصدة التي شهدت حركة في الفترة بت…</p> from <div role="dialog" tabindex="-1" id="radix-_r_9_" data-state="open" data-slot="dialog-content" aria-labelledby="radix-_r_a_" aria-describedby="radix-_r_b_" class="fixed top-[50%] start-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] rtl:-translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[s…>…</div> subtree intercepts pointer events
  - retrying click action
    - waiting 500ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <legend>فئات المخزون — أي فئة مختارة</legend> from <div role="dialog" tabindex="-1" id="radix-_r_9_" data-state="open" data-slot="dialog-content" aria-labelledby="radix-_r_a_" aria-describedby="radix-_r_b_" class="fixed top-[50%] start-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] rtl:-translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[s…>…</div> subtree intercepts pointer events
  - retrying click action
    - waiting 500ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <div data-state="open" aria-hidden="true" data-aria-hidden="true" data-slot="dialog-overlay" class="fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"></div> intercepts pointer events
  - retrying click action
    - waiting 500ms
    - waiting for element to be visible, enabled and stable

```

# Page snapshot

```yaml
- generic:
  - generic [aria-hidden]:
    - link:
      - /url: "#main-content"
      - text: انتقل للمحتوى
    - banner:
      - generic:
        - link:
          - /url: /
          - strong: شحن
        - generic: شركة التجربة
    - main:
      - button: العودة للرئيسية
      - generic:
        - generic:
          - generic:
            - paragraph: متابعة يومية
            - heading [level=1]: المخزون
            - paragraph: اعرف الموجود في الفرع، وما يمكن وعد العميل به، وما يحتاج مراجعة.
        - link:
          - /url: /inventory/receipts/new
          - text: تسجيل استلام مخزون
        - paragraph: المخزون الفعلي داخل فروعك فقط. الحجز مطالبة ضمن الموجود؛ لا يضيف وحدات جديدة.
        - generic:
          - group:
            - button [pressed]: المنتجات
            - button: الطرود
          - generic:
            - generic:
              - generic: الفرع
              - combobox
            - generic:
              - generic: بحث
              - textbox:
                - /placeholder: البراند أو المنتج أو المتغير…
                - text: Blue
            - generic:
              - generic: البراند
              - combobox
          - button [expanded]: فلاتر متقدمة (2)
          - generic:
            - generic: "بحث: Blue"
            - generic: "فئات: unavailable"
            - button: مسح الفلاتر
          - paragraph: ١ نتيجة · أرصدة حالية
          - generic:
            - article:
              - generic:
                - paragraph: براند التجربة — منتجات القاهرة والخدمات المتفق عليها · الفرع أ
                - heading [level=2]:
                  - link:
                    - /url: /inventory/variants/9d3c7b69-480a-40c7-903a-eea2969ee43a?branchId=dec10701-3202-4445-b245-d5bef0468f9a&back=%2Finventory%3Fbranches%3Ddec10701-3202-4445-b245-d5bef0468f9a%26search%3DBlue%26categories%3Dunavailable
                    - text: قميص التجربة — مجموعة المنتجات والملابس المنزلية ذات الاسم الطويل لجميع الفروع · Blue
                - paragraph: أزرق · مقاس كبير · وصف طويل للتحقق من شاشة الهاتف
              - generic:
                - generic:
                  - term: الموجود فعليًا
                  - definition: ١٢
                - generic:
                  - term: السليم
                  - definition: ١٠
                - generic:
                  - term: المحجوز
                  - definition: ٠
                - generic:
                  - term: المتاح
                  - definition: ١٠
                - generic:
                  - term: غير المتاح
                  - definition: ٢
                - generic:
                  - term: عجز الحجز
                  - definition: ٠
              - paragraph: "آخر حركة: ٣‏/١٠‏/٢٠٢٦، ١١:٥٤:٥٨ م"
          - generic:
            - button [disabled]: السابق
            - generic: صفحة ١
            - button [disabled]: التالي
            - generic:
              - generic: نتائج الصفحة
              - combobox
          - generic:
            - paragraph: تعريف المنتجات لا يستلم مخزونًا.
            - link:
              - /url: /brands/bcb6e76f-f5f1-40b9-8586-66e94bb3b9df/products
              - text: منتجات براند التجربة — منتجات القاهرة والخدمات المتفق عليها
      - group:
        - generic: الحساب والجلسة
    - contentinfo:
      - generic: شحن · إدارة الوصول
      - generic: جلسة خاصة بالشركة
  - dialog [ref=e2]:
    - heading "فلاتر متقدمة" [level=2] [ref=e3]
    - paragraph [ref=e4]: حدد الفلاتر ثم طبقها. الأرصدة تظل حالية.
    - generic [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]: المنتج
        - combobox "المنتج" [active] [ref=e8] [cursor=pointer]:
          - option "كل المنتجات" [selected]
          - option "قميص التجربة — مجموعة المنتجات والملابس المنزلية ذات الاسم الطويل لجميع الفروع"
          - option "منتج رحلة الهاتف"
      - generic [ref=e9]:
        - generic [ref=e10]: المتغير
        - combobox "المتغير" [ref=e11] [cursor=pointer]:
          - option "كل المتغيرات" [selected]
          - option "قميص التجربة — مجموعة المنتجات والملابس المنزلية ذات الاسم الطويل لجميع الفروع · Blue · أزرق · مقاس كبير · وصف طويل للتحقق من شاشة الهاتف"
          - option "قميص التجربة — مجموعة المنتجات والملابس المنزلية ذات الاسم الطويل لجميع الفروع · Red · أحمر"
          - option "منتج رحلة الهاتف · أزرق الهاتف ·"
          - option "منتج رحلة الهاتف · أحمر الهاتف ·"
      - group "فئات المخزون — أي فئة مختارة" [ref=e12]:
        - generic [ref=e14]:
          - checkbox "متاح" [ref=e15]
          - text: متاح
        - generic [ref=e16]:
          - checkbox "محجوز" [ref=e17]
          - text: محجوز
        - generic [ref=e18]:
          - checkbox "غير متاح" [checked] [ref=e19]
          - text: غير متاح
        - generic [ref=e20]:
          - checkbox "عجز" [ref=e21]
          - text: عجز
      - generic [ref=e22]:
        - checkbox "بدون مخزون متاح" [ref=e23]
        - text: بدون مخزون متاح
      - generic [ref=e24]:
        - generic [ref=e25]: حركة مسجلة من
        - textbox "حركة مسجلة من" [ref=e26]
      - generic [ref=e27]:
        - generic [ref=e28]: حركة مسجلة إلى
        - textbox "حركة مسجلة إلى" [ref=e29]
      - paragraph [ref=e30]: التاريخ يختار الأرصدة التي شهدت حركة في الفترة بتوقيت القاهرة؛ الكميات المعروضة تظل حالية.
    - generic [ref=e31]:
      - button "تطبيق الفلاتر" [ref=e32] [cursor=pointer]
      - button "إعادة ضبط المتقدمة" [ref=e33] [cursor=pointer]
    - button "إغلاق" [ref=e34] [cursor=pointer]
```

# Test source

```ts
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
  56  |   const denied = await page.evaluate(async ({companyId,branchB}) => {
  57  |     const response=await fetch(`/api/v1/inventory/products?companyId=${companyId}&branches=${branchB}`);
  58  |     return {status:response.status,body:await response.text()};
  59  |   },{companyId:runtime.companyId,branchB:runtime.branchB});
  60  |   expect(denied.status).toBe(403);
  61  |   expect(denied.body).not.toContain('الفرع ب');
  62  |   await page.goto(`/inventory?branches=${runtime.branchB}`);
  63  |   await expect(page).not.toHaveURL(new RegExp(runtime.branchB));
  64  |   await expect(page.locator('.inventory-page')).not.toContainText('الفرع ب');
  65  | });
  66  | test('phone product setup starts at zero and multi-line receipt creates immutable history', async ({
  67  |   page,
  68  | }) => {
  69  |   await page.setViewportSize({ width: 390, height: 844 });
  70  |   await page.goto(`/brands/${runtime.seed.brand}/products`);
  71  |   await page.getByLabel('اسم المنتج', { exact: true }).fill('منتج رحلة الهاتف');
  72  |   await page.getByLabel('اسم المتغير 1', { exact: true }).fill('أزرق الهاتف');
  73  |   await page.getByRole('button', { name: 'إضافة متغير', exact: true }).click();
  74  |   await page.getByLabel('اسم المتغير 2', { exact: true }).fill('أحمر الهاتف');
  75  |   await page.getByRole('button', { name: 'تعريف المنتج', exact: true }).click();
  76  |   await expect(page.getByRole('heading', { name: 'تم حفظ المنتج' })).toBeVisible();
  77  |   await page.goto(
  78  |     `/inventory?branches=${runtime.inventorySeed.branchA}&search=${encodeURIComponent('منتج رحلة الهاتف')}`,
  79  |   );
  80  |   await expect(page.locator('.stock-row')).toHaveCount(2);
  81  |   for (const row of await page.locator('.stock-row').all())
  82  |     await expect(row.locator('dd')).toHaveText(['٠', '٠', '٠', '٠', '٠', '٠']);
  83  |   await page.getByRole('link', { name: 'تسجيل استلام مخزون', exact: true }).click();
  84  |   await page
  85  |     .getByLabel('فرع الاستلام', { exact: true })
  86  |     .selectOption(runtime.inventorySeed.branchA);
  87  |   await page.getByLabel('البراند', { exact: true }).selectOption(runtime.seed.brand);
  88  |   await page
  89  |     .getByLabel('المتغير 1', { exact: true })
  90  |     .selectOption({ label: 'منتج رحلة الهاتف · أزرق الهاتف · ' });
  91  |   await page.getByLabel('الكمية 1', { exact: true }).fill('١٠');
  92  |   await page.getByRole('button', { name: 'إضافة سطر', exact: true }).click();
  93  |   await page
  94  |     .getByLabel('المتغير 2', { exact: true })
  95  |     .selectOption({ label: 'منتج رحلة الهاتف · أزرق الهاتف · ' });
  96  |   await page.getByLabel('الكمية 2', { exact: true }).fill('٢');
  97  |   await page.getByLabel('الحالة 2', { exact: true }).selectOption('damaged');
  98  |   await page.getByRole('button', { name: 'مراجعة الاستلام', exact: true }).click();
  99  |   await expect(page.getByLabel('مراجعة الاستلام')).toContainText('الفرع أ');
  100 |   await noOverflow(page);
  101 |   await capture(page, 'receipt-confirm-390');
  102 |   await page.getByRole('button', { name: 'تأكيد الاستلام الفعلي', exact: true }).click();
  103 |   await expect(page.getByRole('heading', { name: /استلام مخزون [0-9]/ })).toBeVisible();
  104 |   await expect(page.locator('.stock-row')).toHaveCount(2);
  105 |   await page.getByRole('link', { name: 'عرض تاريخ المتغير' }).first().click();
  106 |   await expect(page.locator('.stock-balances dd')).toHaveText(['١٢', '١٠', '٠', '١٠', '٢', '٠']);
  107 |   await capture(page, 'received-history-390');
  108 | });
  109 | for (const width of [320, 390, 768, 1440])
  110 |   test(`current inventory, advanced filter/back state and long labels at ${width}px`, async ({
  111 |     page,
  112 |   }) => {
  113 |     await page.setViewportSize({ width, height: width === 1440 ? 1050 : 844 });
  114 |     await page.goto(
  115 |       `/inventory?branches=${runtime.inventorySeed.branchA}&search=Blue&categories=unavailable`,
  116 |     );
  117 |     await expect(page.locator('.stock-row')).toHaveCount(1);
  118 |     await expect(page.locator('.stock-balances dd')).toHaveText(['١٢', '١٠', '٠', '١٠', '٢', '٠']);
  119 |     await page.getByRole('button', { name: /فلاتر متقدمة/ }).click();
  120 |     await expect(page.getByLabel('غير متاح', { exact: true })).toBeChecked();
  121 |     await noOverflow(page);
  122 |     await capture(page, `filters-${width}`);
> 123 |     await page.getByRole('button',{name:'تطبيق الفلاتر',exact:true}).click();
      |                                           ^ Error: locator.click: Test timeout of 60000ms exceeded.
  124 |     await expect(page.getByLabel('الفلاتر النشطة')).toContainText('فئات');
  125 |     await capture(page, `inventory-${width}`);
  126 |     await page.locator('.stock-row h2 a').click();
  127 |     await expect(page.getByRole('heading', { name: /Blue/ })).toBeVisible();
  128 |     await expect(page.locator('h1')).toBeFocused();
  129 |     await page.getByRole('link', { name: 'العودة بنفس الفلاتر' }).click();
  130 |     await expect(page.getByLabel('بحث', { exact: true })).toHaveValue('Blue');
  131 |     await expect(page).toHaveURL(/categories=unavailable/);
  132 |     await page.getByRole('button', { name: 'الطرود', exact: true }).click();
  133 |     await expect(page.getByRole('heading', { name: 'لا توجد طرود مسجلة بعد' })).toBeVisible();
  134 |     await page.getByLabel('موقع العهدة').selectOption('external');
  135 |     await expect(page.locator('.stock-empty')).toContainText('لا يضيف مخزونًا');
  136 |     await noOverflow(page);
  137 |   });
  138 | test('negative quantity retains input and connection failure differs from no results', async ({
  139 |   page,
  140 | }) => {
  141 |   await page.goto('/inventory/receipts/new');
  142 |   await page
  143 |     .getByLabel('فرع الاستلام', { exact: true })
  144 |     .selectOption(runtime.inventorySeed.branchA);
  145 |   await page.getByLabel('البراند', { exact: true }).selectOption(runtime.seed.brand);
  146 |   await page.getByLabel('المتغير 1', { exact: true }).selectOption(runtime.inventorySeed.blue);
  147 |   await page.getByLabel('الكمية 1', { exact: true }).fill('-1');
  148 |   await page.getByRole('button', { name: 'مراجعة الاستلام', exact: true }).click();
  149 |   await expect(page.getByRole('alert')).toContainText('كمية صحيحة موجبة');
  150 |   await expect(page.getByRole('alert')).toBeFocused();
  151 |   await expect(page.getByLabel('الكمية 1')).toHaveValue('-1');
  152 |   await page.route('**/api/v1/inventory/products?**', (route) => route.abort());
  153 |   await page.goto(`/inventory?branches=${runtime.inventorySeed.branchA}`);
  154 |   await expect(page.getByRole('alert')).toContainText('تعذر الاتصال');
  155 |   await expect(page.getByText('لا توجد نتائج بهذه الفلاتر.', { exact: false })).toHaveCount(0);
  156 |   await capture(page, 'loading-failure-1440');
  157 | });
  158 | test('lost response after real commit persists original identity across reload and recovers once', async ({
  159 |   page,
  160 | }) => {
  161 |   const before = await page.request.get(
  162 |     `/api/v1/inventory/products?companyId=${runtime.companyId}&branches=${runtime.inventorySeed.branchA}&variantId=${runtime.inventorySeed.red}`,
  163 |   );
  164 |   const initial = (await before.json()).items[0].soundOnHand;
  165 |   await page.goto('/inventory/receipts/new');
  166 |   await page.getByLabel('فرع الاستلام').selectOption(runtime.inventorySeed.branchA);
  167 |   await page.getByLabel('البراند', { exact: true }).selectOption(runtime.seed.brand);
  168 |   await page.getByLabel('المتغير 1').selectOption(runtime.inventorySeed.red);
  169 |   await page.getByLabel('الكمية 1').fill('4');
  170 |   await page.getByRole('button', { name: 'مراجعة الاستلام', exact: true }).click();
  171 |   let identity = '';
  172 |   await page.route(
  173 |     '**/api/v1/inventory/receipts',
  174 |     async (route) => {
  175 |       identity = route.request().postDataJSON().commandId;
  176 |       const result = await route.fetch();
  177 |       expect(result.status()).toBe(200);
  178 |       await route.abort();
  179 |     },
  180 |     { times: 1 },
  181 |   );
  182 |   await page.getByRole('button', { name: 'تأكيد الاستلام الفعلي', exact: true }).click();
  183 |   await expect(page.getByRole('button', { name: 'استرد نتيجة الحفظ' })).toBeVisible();
  184 |   await page.reload();
  185 |   await expect(page.getByRole('button', { name: 'استرد نتيجة الحفظ' })).toBeVisible();
  186 |   await expect(page.locator('.commercial-recovery')).toContainText(identity);
  187 |   await capture(page, 'receipt-unknown');
  188 |   await page.getByRole('button', { name: 'استرد نتيجة الحفظ' }).click();
  189 |   await expect(page.getByRole('heading', { name: /استلام مخزون [0-9]/ })).toBeVisible();
  190 |   const after = await page.request.get(
  191 |     `/api/v1/inventory/products?companyId=${runtime.companyId}&branches=${runtime.inventorySeed.branchA}&variantId=${runtime.inventorySeed.red}`,
  192 |   );
  193 |   expect((await after.json()).items[0].soundOnHand).toBe(initial + 4);
  194 | });
  195 | test('offline confirmation waits for connection without sending a command', async ({
  196 |   page,
  197 |   context,
  198 | }) => {
  199 |   await page.goto('/inventory/receipts/new');
  200 |   await page.getByLabel('فرع الاستلام').selectOption(runtime.inventorySeed.branchA);
  201 |   await page.getByLabel('البراند', { exact: true }).selectOption(runtime.seed.brand);
  202 |   await page.getByLabel('المتغير 1').selectOption(runtime.inventorySeed.red);
  203 |   await page.getByLabel('الكمية 1').fill('1');
  204 |   await page.getByRole('button', { name: 'مراجعة الاستلام', exact: true }).click();
  205 |   await context.setOffline(true);
  206 |   await page.getByRole('button', { name: 'تأكيد الاستلام الفعلي', exact: true }).click();
  207 |   await expect(page.getByRole('alert')).toContainText('تعذر الاتصال');
  208 |   await expect(page.getByRole('button', { name: 'استرد نتيجة الحفظ' })).toHaveCount(0);
  209 |   await context.setOffline(false);
  210 | });
  211 | test('stale product edit retains draft and requires explicit review of current revision', async ({
  212 |   page,
  213 | }) => {
  214 |   const fields = {
  215 |     name: 'منتج اختبار النسخة',
  216 |     active: true,
  217 |     variants: [{ name: 'افتراضي', options: '', active: true }],
  218 |   };
  219 |   const created = await page.request.post(`/api/v1/brands/${runtime.seed.brand}/products`, {
  220 |     headers: { origin: 'http://127.0.0.1:5297', 'x-csrf-token': runtime.csrfToken },
  221 |     data: {
  222 |       companyId: runtime.companyId,
  223 |       commandId: randomUUID(),
```