# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: foundation.spec.ts >> real loading, database stop/unavailable and restart recovery retain the migration
- Location: tests\browser\foundation.spec.ts:46:1

# Error details

```
Error: route.continue: Route is already handled!
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - link "انتقل للمحتوى" [ref=e4] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=e5]:
    - generic [ref=e6]:
      - text: معاينة التطوير
      - generic [ref=e8]: P01
      - generic [ref=e9]: · بيانات توضيحية
    - button "مراجعة المظهر" [ref=e10] [cursor=pointer]
  - banner [ref=e17]:
    - generic [ref=e18]:
      - link "شحن — الرئيسية" [ref=e19] [cursor=pointer]:
        - /url: /
        - strong [ref=e25]:
          - text: شحن
          - generic [ref=e26]: مساحة العمل
      - generic [ref=e28]:
        - text: بيئة التطوير
        - generic [ref=e29]: لا توجد بيانات شركة أو جلسة مستخدم
  - main [ref=e30]:
    - generic [ref=e31]:
      - generic [ref=e32]:
        - paragraph [ref=e33]: مساحة العمل
        - heading "أهلًا بيك." [active] [level=1] [ref=e35]
        - paragraph [ref=e36]: البنية الأساسية جاهزة للمراجعة. حالة الخدمات أدناه تأتي من API الفعلي.
      - status [ref=e38]:
        - generic [ref=e39]:
          - strong [ref=e40]: API وقاعدة البيانات جاهزان
          - paragraph [ref=e41]:
            - text: البنية الأساسية متاحة · المهاجرات مطابقة · آخر فحص
            - time [ref=e42]: ٠٦:٢٦:٥٢ م
        - button "تحديث الحالة" [ref=e43] [cursor=pointer]
      - generic [ref=e44]:
        - generic [ref=e45]: أمثلة العرض
        - generic [ref=e46]: تطوير فقط · لا تمثل بيانات الشركة
      - generic [ref=e47]:
        - link [ref=e48] [cursor=pointer]:
          - /url: /demo/list
          - heading "قائمة العرض" [level=2] [ref=e64]
          - paragraph [ref=e65]: صفوف على الكمبيوتر وبطاقات واضحة على الهاتف
          - generic [ref=e66]: افتح المثال
        - link [ref=e69] [cursor=pointer]:
          - /url: /demo/form
          - heading "نموذج توضيحي" [level=2] [ref=e78]
          - paragraph [ref=e79]: حقول مطلوبة ومبلغ دقيق وحالات الانتظار والخطأ
          - generic [ref=e80]: افتح المثال
        - link [ref=e83] [cursor=pointer]:
          - /url: /demo/timeline
          - heading "الخط الزمني" [level=2] [ref=e92]
          - paragraph [ref=e93]: مراجعة ترتيب المعلومات وتوقيت القاهرة
          - generic [ref=e94]: افتح المثال
      - paragraph [ref=e97]: لا توجد أرصدة أو تسجيل شحنات أو اتصال تجريبي بتوصل.
  - contentinfo [ref=e101]:
    - generic [ref=e102]: شحن · البنية الأساسية
    - generic [ref=e103]: P01 · بدون عمليات تجارية
```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test';
  2   | import { mkdir } from 'node:fs/promises';
  3   | const evidence = 'docs/verification/P01/screenshots';
  4   | test.beforeAll(async () => {
  5   |   await mkdir(evidence, { recursive: true });
  6   | });
  7   | test('real readiness, RTL, keyboard palette close/focus return and token sharing', async ({
  8   |   page,
  9   | }) => {
  10  |   await page.goto('/');
  11  |   await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  12  |   await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  13  |   await expect(page.getByText('API وقاعدة البيانات جاهزان')).toBeVisible();
  14  |   expect((await page.request.get('/api/v1/readiness')).status()).toBe(200);
  15  |   const trigger = page.getByRole('button', { name: 'مراجعة المظهر' });
  16  |   await trigger.focus();
  17  |   await page.keyboard.press('Enter');
  18  |   await expect(page.getByRole('dialog')).toBeVisible();
  19  |   await page.getByRole('button', { name: 'درجات دافئة' }).click();
  20  |   await expect(page.locator('html')).toHaveAttribute('data-theme', 'warm');
  21  |   await page.keyboard.press('Escape');
  22  |   await expect(page.getByRole('dialog')).toBeHidden();
  23  |   await expect(trigger).toBeFocused();
  24  |   await page.getByRole('link', { name: /الخط الزمني/ }).click();
  25  |   await expect(page.locator('html')).toHaveAttribute('data-theme', 'warm');
  26  |   await page.setViewportSize({ width: 390, height: 844 });
  27  |   await page.screenshot({ path: `${evidence}/timeline-mobile-warm.png`, fullPage: true });
  28  |   await page.getByRole('button', { name: 'مراجعة المظهر' }).click();
  29  |   await page.getByRole('button', { name: 'أبيض ولمسة ليموني' }).click();
  30  |   await page.keyboard.press('Escape');
  31  | });
  32  | for (const viewport of [
  33  |   { width: 390, height: 844 },
  34  |   { width: 1440, height: 1050 },
  35  |   { width: 320, height: 844 },
  36  |   { width: 768, height: 1050 },
  37  | ]) {
  38  |   test(`responsive home/list/form/timeline, long Arabic and no sideways scroll ${viewport.width}`, async ({
  39  |     page,
  40  |   }) => {
  41  |     await page.setViewportSize(viewport);
  42  |     for (const [route, name] of [
  43  |       ['/', 'home'],
  44  |       ['/demo/list', 'list'],
  45  |       ['/demo/form', 'form'],
  46  |       ['/demo/timeline', 'timeline'],
  47  |     ]) {
  48  |       await page.goto(route!);
> 49  |       await expect(page.locator('h1')).toBeVisible();
      |                                                                                         ^ Error: route.continue: Route is already handled!
  50  |       await page.evaluate(() => document.fonts.ready);
  51  |       if (route === '/') await expect(page.getByText('API وقاعدة البيانات جاهزان')).toBeVisible();
  52  |       expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
  53  |         true,
  54  |       );
  55  |       await page.screenshot({ path: `${evidence}/${name}-${viewport.width}.png`, fullPage: true });
  56  |       if (route === '/demo/list') {
  57  |         const content = page.locator(viewport.width <= 800 ? '.shipment-cards' : '.table-wrap');
  58  |         await expect(content).toBeVisible();
  59  |         await expect(content.getByText(/عنوان عربي طويل جدًا/)).toBeVisible();
  60  |         await page.getByRole('textbox', { name: 'بحث في أمثلة العرض' }).fill('absent');
  61  |         await expect(page.getByText('لا توجد أمثلة تطابق البحث')).toBeVisible();
  62  |         await page.getByRole('button', { name: 'إعادة عرض الأمثلة' }).click();
  63  |         await expect(content).toBeVisible();
  64  |       }
  65  |       if (route === '/demo/form') {
  66  |         await page.getByLabel(/عنوان المثال/).fill('عنوان طويل جدًا '.repeat(10));
  67  |         expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
  68  |           true,
  69  |         );
  70  |       }
  71  |     }
  72  |   });
  73  | }
  74  | test('form required validation, exact 50.5 display, keyboard dialog and pending/error retention', async ({
  75  |   page,
  76  | }) => {
  77  |   await page.goto('/');
  78  |   await page.getByRole('link', { name: /نموذج توضيحي/ }).click();
  79  |   await expect(page.locator('h1')).toBeFocused();
  80  |   await page.getByRole('button', { name: 'راجع المثال' }).click();
  81  |   await expect(page.getByText(/اكتب عنوان المثال/)).toBeVisible();
  82  |   await expect(page.getByLabel(/عنوان المثال/)).toBeFocused();
  83  |   await page.getByLabel(/عنوان المثال/).fill('مثال المالك');
  84  |   await page.getByLabel(/المبلغ بالجنيه/).fill('50.5');
  85  |   await page.getByLabel(/ملاحظات المثال/).fill('احتفظ بالنص');
  86  |   await expect(page.getByText('50.50', { exact: true })).toBeVisible();
  87  |   const review = page.getByRole('button', { name: 'راجع المثال' });
  88  |   await review.click();
  89  |   await page.keyboard.press('Escape');
  90  |   await expect(review).toBeFocused();
  91  |   await review.click();
  92  |   await page.getByRole('button', { name: 'ابدأ التجربة' }).click();
  93  |   await expect(review).toBeDisabled();
  94  |   await expect(page.getByText('جارٍ تنفيذ تجربة العرض…')).toBeVisible();
  95  |   await expect(page.getByText('انتهت التجربة بخطأ مقصود؛ لم يُحفظ شيء')).toBeVisible();
  96  |   await expect(page.getByLabel(/المبلغ بالجنيه/)).toHaveValue('50.5');
  97  |   await expect(page.getByLabel(/ملاحظات المثال/)).toHaveValue('احتفظ بالنص');
  98  |   await expect(page.locator('.retained-error')).toBeFocused();
  99  |   await page.screenshot({ path: `${evidence}/form-error.png`, fullPage: true });
  100 |   await page.getByRole('button', { name: 'الرئيسية', exact: true }).click();
  101 |   await expect(page.locator('h1')).toBeFocused();
  102 | });
  103 | test('real loading, database stop/unavailable and restart recovery retain the migration', async ({
  104 |   page,
  105 | }) => {
  106 |   // Hold one actual API response only to expose its loading state; do not manufacture status data.
  107 |   let release = () => {};
  108 |   const barrier = new Promise<void>((resolve) => {
  109 |     release = resolve;
  110 |   });
  111 |   await page.route('**/api/v1/readiness', async (route) => {
  112 |     await barrier;
  113 |     await route.continue();
  114 |   });
  115 |   await page.goto('/');
  116 |   await expect(page.getByText('جارٍ التحقق من API وقاعدة البيانات…')).toBeVisible();
  117 |   release();
  118 |   await page.unroute('**/api/v1/readiness');
  119 |   await expect(page.getByText('API وقاعدة البيانات جاهزان')).toBeVisible();
  120 |   await page.request.post('http://127.0.0.1:4202/database/stop');
  121 |   try {
  122 |     await page.getByRole('button', { name: 'تحديث الحالة' }).click();
  123 |     await expect(page.getByText('قاعدة البيانات غير متاحة')).toBeVisible();
  124 |     const response = await page.request.get('/api/v1/readiness');
  125 |     expect(response.status()).toBe(503);
  126 |     expect((await response.json()).database).toBe('unavailable');
  127 |     await page.screenshot({ path: `${evidence}/database-unavailable.png`, fullPage: true });
  128 |   } finally {
  129 |     await page.request.post('http://127.0.0.1:4202/database/start');
  130 |   }
  131 |   await page.getByRole('button', { name: 'تحديث الحالة' }).click();
  132 |   await expect(page.getByText('API وقاعدة البيانات جاهزان')).toBeVisible();
  133 |   expect((await (await page.request.get('/api/v1/readiness')).json()).migrations.applied).toEqual([
  134 |     '0001_foundation',
  135 |   ]);
  136 | });
  137 | test('production bundle exposes no demonstration entries or routes', async ({ page }) => {
  138 |   await page.goto('http://127.0.0.1:5202/');
  139 |   await expect(page.getByRole('link', { name: /نموذج توضيحي/ })).toHaveCount(0);
  140 |   await expect(page.getByRole('button', { name: 'مراجعة المظهر' })).toHaveCount(0);
  141 |   await page.goto('http://127.0.0.1:5202/demo/form');
  142 |   await expect(page.getByRole('heading', { name: 'الصفحة غير متاحة' })).toBeVisible();
  143 |   await expect(page.getByRole('button', { name: 'راجع المثال' })).toHaveCount(0);
  144 | });
  145 | 
```