import { expect, test } from '@playwright/test';

async function openFixture(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('/projects');
  await page
    .getByRole('link')
    .filter({ has: page.getByRole('heading', { name: 'battery-study' }) })
    .click();
  await expect(page.getByRole('region', { name: '研究对话' })).toBeVisible();
}

test('expanded progress stays compact and leaves the workbench in view', async ({ page }) => {
  await openFixture(page);
  const expand = page.getByRole('button', { name: '展开研究进度' });
  if (await expand.count()) await expand.click();
  const track = (await page.locator('.charge-track').boundingBox())!;
  expect(track.height).toBeLessThan(170);
  const chat = (await page.getByRole('region', { name: '研究对话' }).boundingBox())!;
  expect(chat.height).toBeGreaterThan(500);
  await page.screenshot({ path: 'artifacts/workbench-track-expanded.png' });
  await page.getByRole('button', { name: '收起研究进度' }).click();
});

test('the workspace header opens the artifact picker', async ({ page }) => {
  await openFixture(page);
  await expect(page.locator('.file-selector-label')).toHaveText('文献研究');
  await page.getByRole('button', { name: /^选择产物，共 \d+ 个$/ }).click();
  const popup = page.locator('.artifact-directory-popup');
  await expect(popup).toBeVisible();
  await expect(popup.getByText('阶段产物')).toBeVisible();
  await page.screenshot({ path: 'artifacts/workbench-picker.png' });
  await popup.locator('.directory-file[title="data-search/DATA_REPORT.md"]').click();
  await expect(popup).toBeHidden();
  await expect(page.locator('.file-selector-label')).toHaveText('数据检索');
});

test('collaboration modes read as two distinct choices', async ({ page }) => {
  await openFixture(page);
  const mode = page.getByRole('radiogroup', { name: '对话协作方式' });
  await expect(mode.getByText('专家模式', { exact: true })).toBeVisible();
  await expect(mode.getByText('全自动', { exact: true })).toBeVisible();
  await expect(page.locator('.mode-switch')).toHaveClass(/is-expert/);
  await page.locator('.mode-switch').screenshot({ path: 'artifacts/mode-switch.png' });
});

test('picking a stage opens its artifact and scrolls the chat to it', async ({ page }) => {
  await openFixture(page);
  await page.getByRole('button', { name: '展开研究进度' }).click();
  await page.getByRole('button', { name: /^数据检索，/ }).click();
  await expect(page.locator('.file-selector-label')).toHaveText('数据检索');
  await page.getByRole('button', { name: /^文献研究，/ }).click();
  await expect(page.getByLabel('文献研究图谱', { exact: true })).toBeVisible();
  await expect(
    page.locator('.conversation-scroll [data-stage="literature"]').first(),
  ).toBeInViewport();
  await page.getByRole('button', { name: '收起研究进度' }).click();
});
