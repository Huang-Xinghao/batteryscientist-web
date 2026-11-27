import { expect, test } from '@playwright/test';

for (const width of [1512, 390]) {
  test(`expanded progress stays compact and leaves room for the workbench at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/projects');
    await page
      .getByRole('link')
      .filter({ has: page.getByRole('heading', { name: 'battery-study' }) })
      .click();
    const progress = page.getByRole('region', { name: '研究进度', exact: true });
    await page.getByRole('button', { name: '展开研究进度', exact: true }).click();
    await expect(progress.locator('.charge-track-scroll')).toBeVisible();
    const checkLayout = async () => {
      const track = await progress.boundingBox();
      const workbench = await page.locator('.research-layout').boundingBox();
      expect(track!.height).toBeLessThan(220);
      expect(workbench!.height).toBeGreaterThan(500);
      expect(
        await progress
          .locator('.charge-cell')
          .evaluate((element) => getComputedStyle(element).aspectRatio),
      ).toBe('auto');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    };
    await checkLayout();
    await page.screenshot({ path: `artifacts/progress-expanded-${width}.png`, fullPage: true });
    await page.reload();
    await expect(page.getByRole('button', { name: '收起研究进度', exact: true })).toBeVisible();
    await checkLayout();
    await page.getByRole('button', { name: '收起研究进度', exact: true }).click();
    await expect(progress.locator('.charge-track-scroll')).toBeHidden();
    expect((await progress.boundingBox())!.height).toBeLessThan(140);
  });
}
