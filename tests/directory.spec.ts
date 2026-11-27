import { expect, test } from '@playwright/test';
for (const width of [1512, 390]) {
  test(`artifact directory groups files and searches paths at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/projects');
    await page
      .getByRole('link')
      .filter({ has: page.getByRole('heading', { name: 'battery-study' }) })
      .click();
    if (width < 1000) {
      await expect(page.getByRole('navigation', { name: '工作台视图' })).toBeVisible();
      await page.getByRole('button', { name: '产物工作区', exact: true }).click();
    }
    const picker = page.getByRole('combobox', { name: '选择项目文件' });
    await picker.fill('figures/test.png');
    await expect(page.locator('.directory-file[title="figures/test.png"]')).toBeVisible();
    await expect(page.locator('.directory-group')).toHaveText([/论文绘图/]);
    await picker.fill('');
    await expect(page.locator('.directory-caption')).toBeVisible();
    await expect(page.locator('.directory-group').filter({ hasText: '论文写作' })).toBeVisible();
    await expect(page.locator('.directory-group').filter({ hasText: '文献研究' })).toBeVisible();
    await picker.fill('paper/main.tex');
    await page.locator('.directory-file[title="paper/main.tex"]').click();
    await expect(page.locator('.latex-source .monaco-editor')).toBeVisible();
    await page.locator('.artifact-directory .ant-select-selector').click();
    await picker.fill('no-such-artifact');
    await expect(page.getByText('没有匹配的产物')).toBeVisible();
    await picker.fill('RESEARCH_REPORT');
    await page.locator('.directory-file[title="literature/RESEARCH_REPORT.md"]').click();
    await expect(page.locator('.artifact-directory-popup')).toBeHidden();
    await expect(page.getByLabel('文献研究图谱', { exact: true })).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await page.locator('.artifact-directory .ant-select-selector').click();
    await picker.fill('');
    await page.screenshot({ path: `artifacts/artifact-directory-${width}.png` });
  });
}
