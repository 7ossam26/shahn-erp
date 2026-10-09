import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
test('native restore restrictions and Arabic banner survive desktop/mobile reads without successful writes', async ({
  page,
}) => {
  await mkdir('docs/verification/P25/screenshots', { recursive: true });
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1050 : 844 });
    await page.goto('/api/test/p25-login');
    await expect(page.getByText('النظام متاح للقراءة والمراجعة', { exact: true })).toBeVisible();
    await expect(page.getByText(/يُراجع مسؤول|يراجع مسؤول الشركة/)).toBeVisible();
    const status = await page.request.get('/api/v1/operations');
    expect((await status.json()).mutationsEnabled).toBe(false);
    expect((await page.request.post('/api/v1/finance/commands', { data: {} })).status()).toBe(503);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
    await page.screenshot({
      path: `docs/verification/P25/screenshots/restore-${width}.png`,
      fullPage: true,
    });
  }
});
