# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: stock-orders.spec.ts >> Arabic mobile actual stock order at305, explicit preparation, cancellation and partial unpack
- Location: tests\p07\stock-orders.spec.ts:15:1

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.selectOption: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByLabel('الصنف 1', { exact: true })

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
    - generic [ref=f1e17]:
      - paragraph [ref=f1e18]: استلام الطرود
      - heading "طلب من المخزون" [level=1] [ref=f1e19]
      - paragraph [ref=f1e20]: البوليصة، المبالغ المتبقية، والاستلام الفعلي في خطوة واحدة.
    - link "قائمة التجهيز" [ref=f1e21] [cursor=pointer]:
      - /url: /preparation
    - generic [ref=f1e22]:
      - group [ref=f1e23]:
        - group "الاستلام والخدمة" [ref=f1e24]:
          - paragraph [ref=f1e26]: سجّل الفرع الذي توجد فيه البضاعة بالفعل.
          - generic [ref=f1e27]:
            - generic [ref=f1e28]:
              - generic [ref=f1e29]: فرع الاستلام
              - combobox "فرع الاستلام" [ref=f1e30] [cursor=pointer]:
                - option "اختر الفرع" [selected]
                - option "الفرع أ"
                - option "الفرع ب"
            - generic [ref=f1e31]:
              - generic [ref=f1e32]: البراند
              - combobox "البراند" [ref=f1e33] [cursor=pointer]:
                - option "اختر البراند" [selected]
                - option "براند التجربة — منتجات القاهرة والخدمات المتفق عليها"
            - generic [ref=f1e34]:
              - generic [ref=f1e35]: الخدمة
              - combobox "الخدمة" [ref=f1e36] [cursor=pointer]
            - generic [ref=f1e37]:
              - generic [ref=f1e38]: مرجع البراند (اختياري)
              - textbox "مرجع البراند (اختياري)" [ref=f1e39]
        - group "بيانات المستلم" [ref=f1e40]:
          - paragraph [ref=f1e42]: انقل البيانات من بوليصة البراند؛ رابط الموقع اختياري.
          - generic [ref=f1e43]:
            - generic [ref=f1e44]:
              - generic [ref=f1e45]: اسم المستلم
              - textbox "اسم المستلم" [ref=f1e46]
            - generic [ref=f1e47]:
              - generic [ref=f1e48]: رقم الهاتف
              - textbox "رقم الهاتف" [ref=f1e49]
            - generic [ref=f1e50]:
              - generic [ref=f1e51]: المحافظة
              - combobox "المحافظة" [ref=f1e52] [cursor=pointer]:
                - option "اختر المحافظة" [selected]
                - option "الجيزة"
                - option "القاهرة"
            - generic [ref=f1e53]:
              - generic [ref=f1e54]: المنطقة (اختياري)
              - combobox "المنطقة (اختياري)" [ref=f1e55] [cursor=pointer]:
                - option "سعر المحافظة" [selected]
            - generic [ref=f1e56]:
              - generic [ref=f1e57]: العنوان المكتوب
              - textbox "العنوان المكتوب" [ref=f1e58]
            - generic [ref=f1e59]:
              - generic [ref=f1e60]: رابط الموقع (اختياري)
              - textbox "رابط الموقع (اختياري)" [ref=f1e61]
        - group "القطع والمبالغ المستحقة" [ref=f1e62]:
          - paragraph [ref=f1e64]: أدخل المبلغ المتبقي للقطعة الواحدة. للبضاعة المدفوعة للبراند أدخل صفرًا؛ القطع ذات القيم المختلفة توضع في سطور مستقلة.
          - generic [ref=f1e65]:
            - status [ref=f1e66]: اختر الأصناف الموجودة بالفعل في الفرع؛ تغيير الفرع يعيد فحص كل السطور.
            - button "تحديث المخزون" [ref=f1e67] [cursor=pointer]
            - generic [ref=f1e69]:
              - generic [ref=f1e70]:
                - generic [ref=f1e71]: الصنف 1
                - combobox [ref=f1e72] [cursor=pointer]:
                  - option "اختر صنفًا من مخزون الفرع" [selected]
                - paragraph [ref=f1e73]: "المتاح في هذا الفرع: —"
              - generic [ref=f1e74]:
                - generic [ref=f1e75]: وصف القطعة 1
                - textbox "وصف القطعة 1" [ref=f1e76]
              - generic [ref=f1e77]:
                - generic [ref=f1e78]: الكمية 1
                - textbox "الكمية 1" [ref=f1e79]: "1"
              - generic [ref=f1e80]:
                - generic [ref=f1e81]: المستحق للقطعة 1 (ج.م)
                - textbox "المستحق للقطعة 1 (ج.م)" [ref=f1e82]: "0.00"
            - button "إضافة قطعة" [ref=f1e83] [cursor=pointer]
            - generic [ref=f1e84]:
              - generic [ref=f1e85]: سداد الشحن
              - combobox "سداد الشحن" [ref=f1e86] [cursor=pointer]:
                - option "مستحق على المستلم" [selected]
                - option "مدفوع إلى البراند — يموله البراند"
                - option "مستحق شحن محدد من البراند"
        - group "الفحص والملاحظات" [ref=f1e87]:
          - paragraph [ref=f1e89]: إذن الفحص مستقل عن سياسة التسليم الجزئي.
          - generic [ref=f1e90]:
            - generic [ref=f1e91]:
              - generic [ref=f1e92]: السماح بالفحص
              - combobox "السماح بالفحص" [ref=f1e93] [cursor=pointer]:
                - option "اختر صراحةً" [selected]
                - option "مسموح"
                - option "غير مسموح"
            - generic [ref=f1e94]:
              - generic [ref=f1e95]: ملاحظات (اختياري)
              - textbox "ملاحظات (اختياري)" [ref=f1e96]
      - button "مراجعة طلب المخزون" [disabled]
      - button "تحديث الإعدادات" [ref=f1e97] [cursor=pointer]
    - group [ref=f1e98]:
      - generic "الحساب والجلسة" [ref=f1e99] [cursor=pointer]
  - contentinfo [ref=f1e100]:
    - generic [ref=f1e101]: شحن · إدارة الوصول
    - generic [ref=f1e102]: جلسة خاصة بالشركة
```

# Test source

```ts
  1  | import { test, expect, type Page } from '@playwright/test';
  2  | import { readFile, mkdir } from 'node:fs/promises';
  3  | let runtime: { token:string; secret:string; companyId:string; csrfToken:string; branchB:string; seed:{brand:string;cairo:string;giza:string};stockSeed:{blue:string;red:string;held:string;branchA:string;blocked:{reference:string}} };
  4  | test.beforeEach(async({context})=>{runtime=JSON.parse(await readFile('tests/.p07-runtime.json','utf8'));await context.addCookies([{name:'erp_session',value:runtime.token,url:'http://127.0.0.1:5309',httpOnly:true,secure:true,sameSite:'Lax'}]);});
  5  | const control=async(path:string)=>{const r=await fetch('http://127.0.0.1:4310'+path,{headers:{'x-test-secret':runtime.secret}});expect(r.ok).toBe(true);return path==='/statistics'?r.json():r.text();};
  6  | const capture=async(page:Page,name:string)=>{await mkdir('docs/verification/P07/screenshots',{recursive:true});await page.screenshot({path:'docs/verification/P07/screenshots/'+name+'.png',fullPage:true});};
  7  | const noOverflow=async(page:Page)=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  8  | async function fill(page:Page,blue=runtime.stockSeed.blue) {
  9  |  await page.goto('/preparation/orders/new');await page.getByLabel('فرع الاستلام').selectOption(runtime.stockSeed.branchA);await page.getByLabel('البراند',{exact:true}).selectOption(runtime.seed.brand);await expect(page.getByLabel('الخدمة',{exact:true})).toHaveValue('stored_stock');
  10 |  await page.getByLabel('اسم المستلم').fill('مستلم طلب المخزون — اسم طويل للتحقق من العربية والهاتف');await page.getByLabel('رقم الهاتف').fill('٠١٠ ١٢٣٤ ٥٦٧٨');await page.getByLabel('المحافظة',{exact:true}).selectOption(runtime.seed.cairo);await page.getByLabel('العنوان المكتوب').fill('القاهرة — شارع البوليصة — الطابق الثالث');
> 11 |  await page.getByLabel('الصنف 1',{exact:true}).selectOption(blue);await page.getByLabel('الكمية 1',{exact:true}).fill('2');await page.getByLabel('المستحق للقطعة 1 (ج.م)').fill('50');
     |                                                ^ Error: locator.selectOption: Test timeout of 60000ms exceeded.
  12 |  await page.getByRole('button',{name:'إضافة قطعة',exact:true}).click();await page.getByLabel('الصنف 2',{exact:true}).selectOption(runtime.stockSeed.red);await page.getByLabel('المستحق للقطعة 2 (ج.م)').fill('150');await page.getByLabel('السماح بالفحص').selectOption('true');
  13 | }
  14 | async function submit(page:Page) {await page.getByRole('button',{name:'مراجعة طلب المخزون',exact:true}).click();await page.getByLabel('راجعت الفرع والأصناف والكميات المطلوب حجزها').check();await page.getByRole('button',{name:'تأكيد طلب المخزون',exact:true}).click();}
  15 | test('Arabic mobile actual stock order at305, explicit preparation, cancellation and partial unpack',async({page})=>{
  16 |  await page.setViewportSize({width:390,height:844});const before=await control('/statistics');await fill(page);await noOverflow(page);await capture(page,'stock-order-390');await submit(page);await expect(page).toHaveURL(/\/shipments\/\d+$/);const url=page.url(),ref=url.split('/').at(-1)!;await expect(page.getByRole('heading',{name:'حجوزات ومكونات المخزون'})).toBeVisible();await expect(page.getByText('305.00',{exact:false}).first()).toBeVisible();await capture(page,'stock-detail-390');
  17 |  const after=await control('/statistics');expect(after.shipments-before.shipments).toBe(1);expect(after.receipts).toBe(before.receipts);expect(after.journal).toBe(before.journal);
  18 |  await page.goto('/preparation?branches='+runtime.stockSeed.branchA+'&search='+ref);await expect(page.getByRole('link',{name:'طرد '+ref})).toBeVisible();await page.getByRole('button',{name:'إكمال التجهيز',exact:true}).click();await page.getByRole('button',{name:'تم التجهيز بالفعل',exact:true}).click();await expect(page.getByText('تم التجهيز',{exact:false}).first()).toBeVisible();
  19 |  await page.goto(url);await page.getByText('إجراءات قبل التسليم ونتيجة آخر طلب',{exact:true}).click();await page.getByRole('button',{name:'إلغاء الطلب',exact:true}).click();await page.getByLabel('سبب الإلغاء').fill('إلغاء بعد التغليف والفحص الفعلي لاحقًا');await page.getByRole('button',{name:'تأكيد الإلغاء',exact:true}).click();await expect(page.getByRole('heading',{name:'تأكيد فك التغليف والفحص الفعلي'})).toBeVisible();
  20 |  await page.getByLabel(/^سليم — .*Blue/).fill('1');await page.getByLabel(/^تالف — .*Blue/).fill('1');await page.getByLabel('سبب ونتيجة الفحص الفعلي').fill('فك التغليف فعليًا: وحدة سليمة ووحدة تالفة');await page.getByRole('button',{name:'تأكيد الفحص الفعلي',exact:true}).click();await expect(page.getByText(/سليم مفحوص.*1.*تالف.*1/).first()).toBeVisible();await capture(page,'unpack-390');await noOverflow(page);
  21 |  await page.goto('/inventory/variants/'+runtime.stockSeed.blue+'?branchId='+runtime.stockSeed.branchA);await expect(page.getByRole('heading',{name:'أين تلتزم الكميات'})).toBeVisible();await expect(page.getByRole('link',{name:'طلب '+ref}).first()).toBeVisible();
  22 | });
  23 | test('desktop/mobile shortage and missing tariff retain input; branch change revalidates selections',async({page})=>{
  24 |  await fill(page);await page.getByLabel('الكمية 1',{exact:true}).fill('999');await expect(page.getByRole('alert').filter({hasText:'المخزون المتاح لا يكفي'}).first()).toBeVisible();await expect(page.getByRole('button',{name:'مراجعة طلب المخزون'})).toBeDisabled();await capture(page,'shortage-1440');await noOverflow(page);
  25 |  await page.getByLabel('الكمية 1',{exact:true}).fill('1');await page.getByLabel('المحافظة',{exact:true}).selectOption(runtime.seed.giza);await expect(page.getByRole('alert').filter({hasText:'لا يوجد سعر'}).first()).toBeVisible();await expect(page.getByLabel('اسم المستلم')).not.toHaveValue('');
  26 |  await page.getByLabel('المحافظة',{exact:true}).selectOption(runtime.seed.cairo);await page.getByLabel('فرع الاستلام').selectOption(runtime.branchB);await expect(page.getByRole('alert').filter({hasText:'المخزون المتاح لا يكفي'}).first()).toBeVisible();await expect(page.getByLabel('الصنف 1',{exact:true})).toHaveValue(runtime.stockSeed.blue);
  27 |  await page.setViewportSize({width:320,height:844});await noOverflow(page);await capture(page,'branch-shortage-320');
  28 | });
  29 | test('blocked 5/7 order visible in queue/filter/detail without a preparation shortcut at320/768/1440',async({page})=>{
  30 |  for(const width of [320,768,1440]){await page.setViewportSize({width,height:width===1440?1050:844});await page.goto('/preparation?branches='+runtime.stockSeed.branchA+'&preparation=blocked');await expect(page.getByRole('link',{name:'طرد '+runtime.stockSeed.blocked.reference})).toBeVisible();await expect(page.getByRole('button',{name:'إكمال التجهيز',exact:true})).toHaveCount(0);await noOverflow(page);await capture(page,'blocked-queue-'+width);}
  31 |  await page.goto('/shipments/'+runtime.stockSeed.blocked.reference);await expect(page.getByText(/موقوف: يوجد عجز/)).toBeVisible();await noOverflow(page);await capture(page,'blocked-detail-1440');
  32 | });
  33 | test('lost committed confirmation response recovers original stock order after reload',async({page})=>{
  34 |  await fill(page);await page.getByLabel('الكمية 1',{exact:true}).fill('1');await page.getByLabel('المستحق للقطعة 1 (ج.م)').fill('0');const before=await control('/statistics');
  35 |  await page.route('**/api/v1/shipments',async route=>{if(route.request().method()==='POST'){await route.fetch();await route.abort('failed');}else await route.continue();});await submit(page);await expect(page.getByRole('button',{name:'استرد نتيجة الحفظ'})).toBeVisible();await page.unroute('**/api/v1/shipments');await page.reload();await page.getByRole('button',{name:'استرد نتيجة الحفظ'}).click();await expect(page).toHaveURL(/\/shipments\/\d+$/);const after=await control('/statistics');expect(after.shipments-before.shipments).toBe(1);expect(after.receipts).toBe(before.receipts);await capture(page,'recovered-1440');
  36 | });
  37 | test('server denies branch revoked after form load and preserves entered recipient',async({page})=>{
  38 |  await fill(page);await page.getByLabel('الكمية 1',{exact:true}).fill('1');await control('/revoke-a');try{await submit(page);await expect(page.getByRole('alert').filter({hasText:'غير مسندة لك'}).first()).toBeVisible();await expect(page.getByLabel('اسم المستلم')).not.toHaveValue('');await capture(page,'denied-preserved-1440');}finally{await control('/restore-a');}
  39 | });
  40 | 
```