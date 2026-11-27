import { expect, test, type Page } from '@playwright/test';
import { projectImageFile } from '../src/shared/file-preview/projectImage';

test('image references resolve against registered project files', () => {
  const files = [{ path: 'figures/图 1.png', modified: 1, size: 100 }];
  for (const src of [
    'figures/图%201.png',
    '/data/study/figures/图%201.png',
    '/figures/图%201.png',
  ]) {
    expect(projectImageFile(src, files, '/data/study')?.path).toBe(files[0].path);
  }
  expect(
    projectImageFile('../figures/图%201.png?version=2', files, '', 'paper/report.md')?.path,
  ).toBe(files[0].path);
  for (const src of [
    'https://example.com/image.png',
    '//example.com/image.png',
    'figures/missing.png',
    'figures/script.svg',
    '../../secret.png',
  ]) {
    expect(projectImageFile(src, files)).toBeUndefined();
  }
});

async function imageReply(page: Page, content: string) {
  await page.route('**/api/projects/*/events?*', (route) => route.abort());
  await page.route('**/api/projects/*/activity*', (route) =>
    route.fulfill({
      json: {
        has_more: false,
        events: [
          {
            id: 950,
            project_id: 'fixture',
            run_id: 'image-reply',
            kind: 'assistant_output',
            created_at: new Date().toISOString(),
            data: { role: 'main', phase: 'coordinator', content },
          },
        ],
      },
    }),
  );
  await page.goto('/projects');
  await page.locator('a.project-card').filter({ hasText: 'battery-study' }).click();
}

test('chat images load through the project API, preview and survive reload', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await imageReply(
    page,
    '## 生图模型润色后的版本\n\n![三面板图1](figures/test.png)\n\n![编码路径](figures/%74est.png)\n\n![不支持的图片](https://example.com/image.png)',
  );
  const image = page.locator('.chat-markdown').getByRole('img', { name: '三面板图1', exact: true });
  await expect
    .poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth))
    .toBeGreaterThan(0);
  const url = new URL((await image.getAttribute('src'))!, page.url());
  expect(url.pathname).toMatch(/\/api\/projects\/[^/]+\/download$/);
  expect(url.searchParams.get('path')).toBe('figures/test.png');
  await expect(page.locator('.chat-markdown').getByRole('img', { name: '编码路径' })).toBeVisible();
  expect(requests.some((url) => url.startsWith('https://example.com/'))).toBe(false);
  await page.locator('.chat-markdown .project-markdown-image .ant-image').first().click();
  await expect(page.locator('.ant-image-preview-img')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.reload();
  await expect
    .poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth))
    .toBeGreaterThan(0);
});

test('a failed project image offers a working retry', async ({ page }) => {
  let fail = true;
  await page.route('**/api/projects/*/download?*', (route) =>
    fail ? route.fulfill({ status: 503, body: 'temporarily unavailable' }) : route.continue(),
  );
  await imageReply(page, '![架构图](figures/test.png)');
  await expect(page.getByText('图片加载失败：架构图')).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: '重新加载', exact: true }).click();
  const image = page.locator('.chat-markdown').getByRole('img', { name: '架构图', exact: true });
  await expect
    .poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth))
    .toBeGreaterThan(0);
});
