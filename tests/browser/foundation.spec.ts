import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const evidence = 'docs/verification/P01/screenshots';
test.beforeAll(async () => {
  await mkdir(evidence, { recursive: true });
});
test('real readiness, RTL, keyboard palette close/focus return and token sharing', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.getByText('API وقاعدة البيانات جاهزان')).toBeVisible();
  expect((await page.request.get('/api/v1/readiness')).status()).toBe(200);
  const skip = page.getByRole('link', { name: 'انتقل للمحتوى' });
  await expect(skip).toHaveCSS('opacity', '0');
  await skip.focus();
  await expect(skip).toHaveCSS('opacity', '1');
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
  await expect(skip).toHaveCSS('opacity', '0');
  const trigger = page.getByRole('button', { name: 'مراجعة المظهر' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'درجات دافئة' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'warm');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(trigger).toBeFocused();
  await page.getByRole('link', { name: /الخط الزمني/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'warm');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${evidence}/timeline-mobile-warm.png`, fullPage: true });
  await page.getByRole('button', { name: 'مراجعة المظهر' }).click();
  await page.getByRole('button', { name: 'أبيض ولمسة ليموني' }).click();
  await page.keyboard.press('Escape');
});
for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 1050 },
  { width: 320, height: 844 },
  { width: 768, height: 1050 },
]) {
  test(`responsive home/list/form/timeline, long Arabic and no sideways scroll ${viewport.width}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    for (const [route, name] of [
      ['/', 'home'],
      ['/demo/list', 'list'],
      ['/demo/form', 'form'],
      ['/demo/timeline', 'timeline'],
    ]) {
      await page.goto(route!);
      await expect(page.locator('h1')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      if (route === '/') await expect(page.getByText('API وقاعدة البيانات جاهزان')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: `${evidence}/${name}-${viewport.width}.png`, fullPage: true });
      if (route === '/demo/list') {
        const content = page.locator(viewport.width <= 800 ? '.shipment-cards' : '.table-wrap');
        await expect(content).toBeVisible();
        await expect(content.getByText(/عنوان عربي طويل جدًا/)).toBeVisible();
        await page.getByRole('textbox', { name: 'بحث في أمثلة العرض' }).fill('absent');
        await expect(page.getByText('لا توجد أمثلة تطابق البحث')).toBeVisible();
        await page.getByRole('button', { name: 'إعادة عرض الأمثلة' }).click();
        await expect(content).toBeVisible();
      }
      if (route === '/demo/form') {
        await page.getByLabel(/عنوان المثال/).fill('عنوان طويل جدًا '.repeat(10));
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
      }
    }
  });
}
test('form required validation, exact 50.5 display, keyboard dialog and pending/error retention', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: /نموذج توضيحي/ }).click();
  await expect(page.locator('h1')).toBeFocused();
  await page.getByRole('button', { name: 'راجع المثال' }).click();
  await expect(page.getByText(/اكتب عنوان المثال/)).toBeVisible();
  await expect(page.getByLabel(/عنوان المثال/)).toBeFocused();
  await page.getByLabel(/عنوان المثال/).fill('مثال المالك');
  await page.getByLabel(/المبلغ بالجنيه/).fill('50.5');
  await page.getByLabel(/ملاحظات المثال/).fill('احتفظ بالنص');
  await expect(page.getByText('50.50', { exact: true })).toBeVisible();
  const review = page.getByRole('button', { name: 'راجع المثال' });
  await review.click();
  await page.keyboard.press('Escape');
  await expect(review).toBeFocused();
  await review.click();
  await page.getByRole('button', { name: 'ابدأ التجربة' }).click();
  await expect(review).toBeDisabled();
  await expect(page.getByText('جارٍ تنفيذ تجربة العرض…')).toBeVisible();
  await expect(page.getByText('انتهت التجربة بخطأ مقصود؛ لم يُحفظ شيء')).toBeVisible();
  await expect(page.getByLabel(/المبلغ بالجنيه/)).toHaveValue('50.5');
  await expect(page.getByLabel(/ملاحظات المثال/)).toHaveValue('احتفظ بالنص');
  await expect(page.locator('.retained-error')).toBeFocused();
  await expect(page.getByRole('link', { name: 'انتقل للمحتوى' })).toHaveCSS('opacity', '0');
  await page.screenshot({ path: `${evidence}/form-error.png`, fullPage: true });
  await page.getByRole('button', { name: 'الرئيسية', exact: true }).click();
  await expect(page.locator('h1')).toBeFocused();
});
test('real loading, database stop/unavailable and restart recovery retain the migration', async ({
  page,
}) => {
  // Hold one actual API response only to expose its loading state; do not manufacture status data.
  let release = () => {};
  const barrier = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/v1/readiness', async (route) => {
    await barrier;
    await route.continue();
  });
  await page.goto('/');
  await expect(page.getByText('جارٍ التحقق من API وقاعدة البيانات…')).toBeVisible();
  release();
  await expect(page.getByText('API وقاعدة البيانات جاهزان')).toBeVisible();
  await page.unrouteAll({ behavior: 'wait' });
  await page.request.post('http://127.0.0.1:4202/database/stop');
  try {
    await page.getByRole('button', { name: 'تحديث الحالة' }).click();
    await expect(page.getByText('قاعدة البيانات غير متاحة')).toBeVisible();
    const response = await page.request.get('/api/v1/readiness');
    expect(response.status()).toBe(503);
    expect((await response.json()).database).toBe('unavailable');
    await page.screenshot({ path: `${evidence}/database-unavailable.png`, fullPage: true });
  } finally {
    await page.request.post('http://127.0.0.1:4202/database/start');
  }
  await page.getByRole('button', { name: 'تحديث الحالة' }).click();
  await expect(page.getByText('API وقاعدة البيانات جاهزان')).toBeVisible();
  expect((await (await page.request.get('/api/v1/readiness')).json()).migrations.applied).toEqual([
    '0001_foundation',
  ]);
});
test('production bundle exposes no demonstration entries or routes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:5202/');
  await expect(page.getByRole('heading', { name: 'أهلًا بيك.' })).toBeVisible();
  await expect(page.getByText('API وقاعدة البيانات جاهزان')).toBeVisible();
  await expect(page.getByRole('link', { name: /نموذج توضيحي/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'مراجعة المظهر' })).toHaveCount(0);
  await page.goto('http://127.0.0.1:5202/demo/form');
  await expect(page.getByRole('heading', { name: 'الصفحة غير متاحة' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'راجع المثال' })).toHaveCount(0);
  expect(errors).toEqual([]);
});
