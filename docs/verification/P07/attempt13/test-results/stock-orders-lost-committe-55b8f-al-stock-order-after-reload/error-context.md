# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: stock-orders.spec.ts >> lost committed confirmation response recovers original stock order after reload
- Location: tests\p07\stock-orders.spec.ts:33:1

# Error details

```
Error: ENOENT: no such file or directory, open 'C:\Users\ahmed\OneDrive\Документы\ChatGPT\shahn-erp\tests\.p07-runtime.json'
```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | import { readFile, mkdir } from 'node:fs/promises';
  3   | let runtime: {
> 4   |   token: string;
      |                                                       ^ Error: ENOENT: no such file or directory, open 'C:\Users\ahmed\OneDrive\Документы\ChatGPT\shahn-erp\tests\.p07-runtime.json'
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
```