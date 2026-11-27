import { expect, test } from '@playwright/test';

for (const width of [1512, 390]) {
  test(`landing page charges into the workbench at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.locator('#boot')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { level: 1, name: '从一个研究问题，到一篇可复现的电池论文' }),
    ).toBeVisible();
    await expect(page.getByRole('figure', { name: '电池循环测试示意动画' })).toBeVisible();
    await expect(page.locator('.landing-pipeline li')).toHaveCount(12);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.waitForTimeout(2600);
    await page.screenshot({ path: `artifacts/landing-${width}.png` });
    // Sections light up as they scroll into view.
    await page.locator('#pipeline').scrollIntoViewIfNeeded();
    await expect(page.locator('.landing-pipeline')).toHaveClass(/is-shown/);
    await page.locator('#features').scrollIntoViewIfNeeded();
    await expect(page.locator('.landing-features')).toHaveClass(/is-shown/);
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `artifacts/landing-full-${width}.png`, fullPage: true });
    await page.evaluate(() => scrollTo(0, 0));

    await page.locator('.landing-hero').getByRole('link', { name: '进入工作台' }).click();
    const overlay = page.locator('.ct-overlay');
    await expect(overlay).toBeVisible();
    await expect(overlay.getByText('研究项目')).toBeVisible();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `artifacts/landing-charge-${width}.png` });
    await expect(page).toHaveURL(/\/projects$/);
    await expect(overlay).toHaveCount(0);
    await expect(
      page.getByRole('link').filter({ has: page.getByRole('heading', { name: 'battery-study' }) }),
    ).toBeVisible();

    // The rail logo leads back to the landing page.
    if (width > 1000) {
      await page.getByRole('link', { name: 'BatteryScientist 首页' }).click();
      await expect(page).toHaveURL(/\/$/);
    }
  });
}
