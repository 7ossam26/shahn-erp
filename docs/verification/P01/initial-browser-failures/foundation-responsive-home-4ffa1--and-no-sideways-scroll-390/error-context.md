# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: foundation.spec.ts >> responsive home/list/form/timeline, long Arabic and no sideways scroll 390
- Location: tests\browser\foundation.spec.ts:16:2

# Error details

```
Error: page.evaluate: Execution context was destroyed, most likely because of a navigation
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import { mkdir } from 'node:fs/promises';
  3  | const evidence='docs/verification/P01/screenshots';
  4  | test.beforeAll(async()=>{await mkdir(evidence,{recursive:true});});
  5  | test('real readiness, RTL, keyboard palette close/focus return and token sharing',async({page})=>{
  6  |  await page.goto('/');await expect(page.locator('html')).toHaveAttribute('dir','rtl');await expect(page.locator('html')).toHaveAttribute('lang','ar');
  7  |  await expect(page.getByText('API وقاعدة البيانات جاهزان')).toBeVisible();expect((await page.request.get('/api/v1/readiness')).status()).toBe(200);
  8  |  const trigger=page.getByRole('button',{name:'مراجعة المظهر'});await trigger.focus();await page.keyboard.press('Enter');await expect(page.getByRole('dialog')).toBeVisible();
  9  |  await page.getByRole('button',{name:'درجات دافئة'}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','warm');
  10 |  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toBeHidden();await expect(trigger).toBeFocused();
  11 |  await page.getByRole('link',{name:/الخط الزمني/}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','warm');
  12 |  await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${evidence}/timeline-mobile-warm.png`,fullPage:true});
  13 |  await page.getByRole('button',{name:'مراجعة المظهر'}).click();await page.getByRole('button',{name:'أبيض ولمسة ليموني'}).click();await page.keyboard.press('Escape');
  14 | });
  15 | for(const viewport of [{width:390,height:844},{width:1440,height:1050},{width:320,height:844},{width:768,height:1050}]){
  16 |  test(`responsive home/list/form/timeline, long Arabic and no sideways scroll ${viewport.width}`,async({page})=>{
  17 |   await page.setViewportSize(viewport);
  18 |   for(const [route,name] of [['/','home'],['/demo/list','list'],['/demo/form','form'],['/demo/timeline','timeline']]){
  19 |    await page.goto(route!);await expect(page.locator('h1')).toBeVisible();await page.evaluate(()=>document.fonts.ready);
  20 |    if(route==='/')await expect(page.getByText('API وقاعدة البيانات جاهزان')).toBeVisible();
> 21 |    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
     |                      ^ Error: page.evaluate: Execution context was destroyed, most likely because of a navigation
  22 |    await page.screenshot({path:`${evidence}/${name}-${viewport.width}.png`,fullPage:true});
  23 |    if(route==='/demo/list'){
  24 |     const content=page.locator(viewport.width<=800?'.shipment-cards':'.table-wrap');await expect(content).toBeVisible();await expect(content.getByText(/عنوان عربي طويل جدًا/)).toBeVisible();
  25 |     await page.getByRole('textbox',{name:'بحث في أمثلة العرض'}).fill('absent');await expect(page.getByText('لا توجد أمثلة تطابق البحث')).toBeVisible();
  26 |     await page.getByRole('button',{name:'إعادة عرض الأمثلة'}).click();await expect(content).toBeVisible();
  27 |    }
  28 |    if(route==='/demo/form'){
  29 |     await page.getByLabel(/عنوان المثال/).fill('عنوان طويل جدًا '.repeat(10));
  30 |     expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  31 |    }
  32 |   }
  33 |  });
  34 | }
  35 | test('form required validation, exact 50.5 display, keyboard dialog and pending/error retention',async({page})=>{
  36 |  await page.goto('/');await page.getByRole('link',{name:/نموذج توضيحي/}).click();await expect(page.locator('h1')).toBeFocused();
  37 |  await page.getByRole('button',{name:'راجع المثال'}).click();await expect(page.getByText(/اكتب عنوان المثال/)).toBeVisible();await expect(page.getByLabel(/عنوان المثال/)).toBeFocused();
  38 |  await page.getByLabel(/عنوان المثال/).fill('مثال المالك');await page.getByLabel(/المبلغ بالجنيه/).fill('50.5');await page.getByLabel(/ملاحظات المثال/).fill('احتفظ بالنص');
  39 |  await expect(page.getByText('50.50',{exact:true})).toBeVisible();
  40 |  const review=page.getByRole('button',{name:'راجع المثال'});await review.click();await page.keyboard.press('Escape');await expect(review).toBeFocused();
  41 |  await review.click();await page.getByRole('button',{name:'ابدأ التجربة'}).click();await expect(review).toBeDisabled();await expect(page.getByText('جارٍ تنفيذ تجربة العرض…')).toBeVisible();
  42 |  await expect(page.getByText('انتهت التجربة بخطأ مقصود؛ لم يُحفظ شيء')).toBeVisible();await expect(page.getByLabel(/المبلغ بالجنيه/)).toHaveValue('50.5');await expect(page.getByLabel(/ملاحظات المثال/)).toHaveValue('احتفظ بالنص');await expect(page.locator('.retained-error')).toBeFocused();
  43 |  await page.screenshot({path:`${evidence}/form-error.png`,fullPage:true});
  44 |  await page.getByRole('button',{name:'الرئيسية',exact:true}).click();await expect(page.locator('h1')).toBeFocused();
  45 | });
  46 | test('real loading, database stop/unavailable and restart recovery retain the migration',async({page})=>{
  47 |  // Hold one actual API response only to expose its loading state; do not manufacture status data.
  48 |  let release=()=>{};const barrier=new Promise<void>(resolve=>{release=resolve;});
  49 |  await page.route('**/api/v1/readiness',async route=>{await barrier;await route.continue();});
  50 |  await page.goto('/');await expect(page.getByText('جارٍ التحقق من API وقاعدة البيانات…')).toBeVisible();release();await page.unroute('**/api/v1/readiness');
  51 |  await expect(page.getByText('API وقاعدة البيانات جاهزان')).toBeVisible();
  52 |  await page.request.post('http://127.0.0.1:4202/database/stop');
  53 |  try{
  54 |   await page.getByRole('button',{name:'تحديث الحالة'}).click();await expect(page.getByText('قاعدة البيانات غير متاحة')).toBeVisible();
  55 |   const response=await page.request.get('/api/v1/readiness');expect(response.status()).toBe(503);expect((await response.json()).database).toBe('unavailable');
  56 |   await page.screenshot({path:`${evidence}/database-unavailable.png`,fullPage:true});
  57 |  }finally{await page.request.post('http://127.0.0.1:4202/database/start');}
  58 |  await page.getByRole('button',{name:'تحديث الحالة'}).click();await expect(page.getByText('API وقاعدة البيانات جاهزان')).toBeVisible();
  59 |  expect((await (await page.request.get('/api/v1/readiness')).json()).migrations.applied).toEqual(['0001_foundation']);
  60 | });
  61 | test('production bundle exposes no demonstration entries or routes',async({page})=>{
  62 |  await page.goto('http://127.0.0.1:5202/');await expect(page.getByRole('link',{name:/نموذج توضيحي/})).toHaveCount(0);await expect(page.getByRole('button',{name:'مراجعة المظهر'})).toHaveCount(0);
  63 |  await page.goto('http://127.0.0.1:5202/demo/form');await expect(page.getByRole('heading',{name:'الصفحة غير متاحة'})).toBeVisible();await expect(page.getByRole('button',{name:'راجع المثال'})).toHaveCount(0);
  64 | });
  65 | 
```