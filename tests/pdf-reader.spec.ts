import { expect, test } from '@playwright/test';

for (const width of [1512, 390]) {
  test(`paper PDF and LaTeX sources remain usable at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/projects');
    await page.locator('a.project-card').filter({ hasText: 'battery-study' }).click();
    if (width < 700) await page.getByRole('button', { name: '展开研究进度', exact: true }).click();
    await page.getByRole('button', { name: /^编译交付，/ }).click();
    const reader = page.getByRole('region', { name: 'PDF 阅读器', exact: true });
    await expect(reader.getByText('2 页', { exact: true })).toBeVisible();
    const canvas = reader.getByRole('img', { name: 'PDF 第 1 页', exact: true });
    await expect
      .poll(() => canvas.evaluate((element: HTMLCanvasElement) => element.width))
      .toBeGreaterThan(100);
    await expect(reader.locator('.paper-pdf-text').first()).toContainText(
      'Battery lifetime research',
    );
    const initialWidth = await canvas.evaluate((element: HTMLCanvasElement) => element.width);
    await reader.getByRole('button', { name: '放大 PDF', exact: true }).click();
    await expect
      .poll(() => canvas.evaluate((element: HTMLCanvasElement) => element.width))
      .toBeGreaterThan(initialWidth);
    await reader.getByRole('button', { name: 'PDF 适应宽度', exact: true }).click();
    await expect
      .poll(() => canvas.evaluate((element: HTMLCanvasElement) => element.width))
      .toBe(initialWidth);
    await reader.getByRole('button', { name: 'PDF 下一页', exact: true }).click();
    await expect(reader.getByRole('spinbutton', { name: 'PDF 页码', exact: true })).toHaveValue(
      '2',
    );
    await reader.getByRole('button', { name: 'PDF 上一页', exact: true }).click();
    await expect(reader.getByRole('spinbutton', { name: 'PDF 页码', exact: true })).toHaveValue(
      '1',
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(canvas).toHaveAttribute('data-rendered', 'true');
    expect(
      await canvas.evaluate((element: HTMLCanvasElement) => [
        ...element.getContext('2d')!.getImageData(4, 4, 1, 1).data,
      ]),
    ).toEqual([255, 255, 255, 255]);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await page.screenshot({ path: `artifacts/pdf-reader-${width}.png`, fullPage: true });
    await reader.getByRole('button', { name: 'LaTeX 源码', exact: true }).click();
    await expect(page.locator('.monaco-editor')).toBeVisible();
    await page.locator('.artifact-directory .ant-select-selector').click();
    await expect(page.locator('.artifact-directory-popup')).toBeVisible();
    await page.getByRole('combobox', { name: '选择项目文件' }).fill('introduction.tex');
    await page
      .getByRole('tree')
      .getByTitle('paper/sections/introduction.tex', { exact: true })
      .click();
    await expect(page.locator('.monaco-editor')).toContainText('Introduction');
    await expect(page.locator('.artifact-directory-popup')).toBeHidden();
    await page.locator('.artifact-directory .ant-select-selector').click();
    await expect(page.locator('.artifact-directory-popup')).toBeVisible();
    await page.getByRole('combobox', { name: '选择项目文件' }).fill('references.bib');
    await page.getByRole('tree').getByTitle('paper/references.bib', { exact: true }).click();
    await expect(page.locator('.monaco-editor')).toContainText('battery2026');
    expect(errors).toEqual([]);
  });
}

test('an invalid PDF shows a clear error and can retry', async ({ page }) => {
  let failed = true;
  await page.route('**/api/projects/*/download?*', (route) =>
    failed
      ? route.fulfill({ contentType: 'application/pdf', body: 'invalid pdf' })
      : route.continue(),
  );
  await page.goto('/projects');
  await page.locator('a.project-card').filter({ hasText: 'battery-study' }).click();
  await page.getByRole('button', { name: /^编译交付，/ }).click();
  const reader = page.getByRole('region', { name: 'PDF 阅读器', exact: true });
  await expect(reader.getByText('PDF 暂时无法预览')).toBeVisible();
  failed = false;
  await reader.getByRole('button', { name: /重\s*试/ }).click();
  await expect(reader.getByText('2 页', { exact: true })).toBeVisible();
});
