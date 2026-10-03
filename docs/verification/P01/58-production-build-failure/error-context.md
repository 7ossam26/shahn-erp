# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: foundation.spec.ts >> production bundle exposes no demonstration entries or routes
- Location: tests\browser\foundation.spec.ts:137:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'الصفحة غير متاحة' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: 'الصفحة غير متاحة' }) with timeout 10000ms
  - waiting for getByRole('heading', { name: 'الصفحة غير متاحة' })

```

# Test source

```ts
  42  |     for (const [route, name] of [
  43  |       ['/', 'home'],
  44  |       ['/demo/list', 'list'],
  45  |       ['/demo/form', 'form'],
  46  |       ['/demo/timeline', 'timeline'],
  47  |     ]) {
  48  |       await page.goto(route!);
  49  |       await expect(page.locator('h1')).toBeVisible();
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
  118 |   await expect(page.getByText('API وقاعدة البيانات جاهزان')).toBeVisible();
  119 |   await page.unrouteAll({ behavior: 'wait' });
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
> 142 |   await expect(page.getByRole('heading', { name: 'الصفحة غير متاحة' })).toBeVisible();
      |                                                                         ^ Error: expect(locator).toBeVisible() failed
  143 |   await expect(page.getByRole('button', { name: 'راجع المثال' })).toHaveCount(0);
  144 | });
  145 | 
```