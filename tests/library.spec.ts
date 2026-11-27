import { expect, test } from '@playwright/test';

test('paradigm graph opens documents, searches, filters and preserves deep links', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/libraries/paradigms');
  await expect(page.getByRole('heading', { name: '电池范式库', exact: true })).toBeVisible();
  await expect(page.locator('.react-flow__node')).toHaveCount(2);
  await expect(page.locator('.react-flow__edge')).toHaveCount(1);
  await expect(page.getByRole('region', { name: '文档阅读区' })).toHaveCount(0);
  await page.locator('.react-flow__node').filter({ hasText: '时序预测范式' }).click();
  await expect(page.getByRole('heading', { name: '时序预测范式' })).toBeVisible();
  await expect(page.getByText('metadata-hidden')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: '时序预测范式' })).toBeVisible();
  await page.getByRole('link', { name: '返回索引' }).click();
  await expect(page.getByRole('heading', { name: '范式索引' })).toBeVisible();
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByLabel('搜索图谱', { exact: true }).fill('Transformer');
  await expect(page.getByText('1 个匹配节点')).toBeVisible();
  await page.getByRole('button', { name: '时序预测范式', exact: true }).click();
  await expect(page.getByRole('heading', { name: '时序预测范式' })).toBeVisible();
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByLabel('搜索图谱', { exact: true }).fill('没有的内容');
  await expect(page.getByText('0 个匹配节点')).toBeVisible();
  await page.getByLabel('搜索图谱', { exact: true }).fill('');
  await page.getByRole('button', { name: '研究思路 1' }).click();
  await expect(page.getByText('1 个匹配节点')).toBeVisible();
  await page.screenshot({ path: 'artifacts/paradigm-graph-desktop.png' });
  expect(errors).toEqual([]);
});

test('paradigm graph supports mobile node reading and returning to the graph', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/libraries/paradigms');
  await expect(page.locator('.react-flow__node')).toHaveCount(2);
  await page.locator('.react-flow__node').filter({ hasText: '时序预测范式' }).click();
  await expect(page.getByRole('heading', { name: '时序预测范式' })).toBeVisible();
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await expect(page.getByLabel('搜索图谱', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: 'artifacts/paradigm-graph-mobile.png' });
});

test('battery library navigates categories and internal links on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/projects');
  await page.locator('.sidebar').getByRole('link', { name: '电池资源库', exact: true }).click();
  await expect(page.getByRole('heading', { name: '电池资源库', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '总览与指南 1' }).click();
  await expect(page.locator('.library-entry')).toHaveCount(1);
  await page.locator('.library-entry').click();
  await expect(page.getByRole('heading', { name: '电池资源总览' })).toBeVisible();
  await page.getByRole('link', { name: '查看 Tongji 数据集' }).click();
  await expect(page.getByRole('heading', { name: 'Tongji 数据集' })).toBeVisible();
  await expect(
    page.getByRole('region', { name: '文档阅读区' }).getByText('寿命标签与容量规范。'),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: 'artifacts/battery-library-mobile.png' });
  await page.getByRole('button', { name: '返回目录' }).click();
  await expect(page.getByPlaceholder('搜索标题或正文')).toBeVisible();
});

test('library errors show retry and missing libraries show an empty state', async ({ page }) => {
  await page.route('**/api/libraries/paradigms?*', (route) =>
    route.fulfill({ status: 503, json: { detail: '暂不可用' } }),
  );
  await page.goto('/libraries/paradigms');
  await expect(page.getByText('资源库加载失败')).toBeVisible();
  await page.getByRole('button', { name: '重试', exact: true }).click();
  await page.route('**/api/libraries/battery?*', (route) =>
    route.fulfill({
      json: { available: false, items: [], categories: [], total: 0, matched: 0, truncated: false },
    }),
  );
  await page.goto('/libraries/battery');
  await expect(page.getByText('资源库尚未配置，请联系管理员初始化内容。')).toBeVisible();
});

for (const width of [1512, 390]) {
  test(`paper figures show titles, real images and captions at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/libraries/paradigms');
    await expect(page.getByRole('heading', { name: '电池范式库', exact: true })).toBeVisible();
    await page.getByRole('tab', { name: '论文图片' }).click();
    await expect(page.getByRole('region', { name: '论文图片区' })).toBeVisible();
    await expect(page.getByRole('button', { name: '时序预测范式', exact: true })).toBeVisible();
    await expect(page.getByText('Figure 1: 跨电芯容量预测结果与真实值。')).toBeVisible();
    await expect(page.getByText('PDF 第 3 页')).toBeVisible();
    const image = page.getByRole('img', { name: '时序预测范式 — Figure 1' });
    await expect(image).toBeVisible();
    await expect
      .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
    await page.locator('.paper-figure-image .ant-image').click();
    await expect(page.locator('.ant-image-preview-img')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.ant-image-preview-img')).not.toBeVisible();
    await page.getByRole('button', { name: '时序预测范式', exact: true }).click();
    await expect(page.getByRole('heading', { name: '时序预测范式' })).toBeVisible();
    await page.getByRole('button', { name: '关闭', exact: true }).click();
    await page.getByLabel('搜索论文图片', { exact: true }).fill('不存在的图');
    await expect(page.getByText('没有匹配的图片，试试其他论文或关键词。')).toBeVisible();
    await page.getByLabel('搜索论文图片', { exact: true }).fill('容量预测');
    await expect(page.locator('.paper-figure-card')).toHaveCount(1);
    await page.reload();
    await expect(page.getByRole('region', { name: '论文图片区' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    await page.screenshot({ path: `artifacts/paper-figures-${width}.png` });
    await page.getByRole('tab', { name: '关系图谱' }).click();
    await expect(page.locator('.react-flow__node')).toHaveCount(2);
  });
}
