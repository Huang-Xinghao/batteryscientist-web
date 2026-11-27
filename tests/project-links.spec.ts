import { expect, test } from '@playwright/test';
import { projectFilePath } from '../src/shared/file-preview/projectLink';

test('resolves project and document references without changing external links', () => {
  expect(projectFilePath('figures/architecture_final.png')).toBe('figures/architecture_final.png');
  expect(projectFilePath('/data/study/figures/final.pdf', '/data/study')).toBe('figures/final.pdf');
  expect(projectFilePath('../figures/final.pdf', '', 'paper/report.md')).toBe('figures/final.pdf');
  expect(projectFilePath('./图%201.png', '', 'figures/report.md')).toBe('figures/图 1.png');
  for (const href of [
    'https://example.com/paper.pdf',
    '#caption',
    '/api/docs',
    '../../secret.pdf',
  ]) {
    expect(projectFilePath(href)).toBeUndefined();
  }
});

test('chat and report links preview project files in the workspace without opening windows', async ({
  page,
}) => {
  await page.route('**/api/projects/*/events?*', (route) =>
    route.fulfill({ contentType: 'text/event-stream', body: ': fixture\n\n' }),
  );
  await page.route('**/api/projects/*/activity*', (route) =>
    route.fulfill({
      json: {
        has_more: false,
        events: [
          {
            id: 900,
            project_id: 'fixture',
            run_id: 'links',
            kind: 'assistant_output',
            created_at: new Date().toISOString(),
            data: {
              role: 'main',
              phase: 'coordinator',
              content:
                '[最终 PNG](figures/test.png)\n\n[最终 PDF](paper/main.pdf)\n\n[外部论文](https://example.com/paper.pdf)',
            },
          },
        ],
      },
    }),
  );
  await page.goto('/projects');
  await page.locator('a.project-card').filter({ hasText: 'battery-study' }).click();
  const projectUrl = page.url();
  const pageCount = page.context().pages().length;
  for (const [name, path] of [
    ['最终 PNG', 'figures/test.png'],
    ['最终 PDF', 'paper/main.pdf'],
  ]) {
    const link = page.getByRole('link', { name, exact: true });
    const href = await link.getAttribute('href');
    expect(new URL(href!, page.url()).searchParams.get('path')).toBe(path);
    const responsePromise = page.context().waitForEvent('response', {
      predicate: (response) =>
        response.url().includes('/download?') &&
        new URL(response.url()).searchParams.get('path') === path,
    });
    await link.click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    if (path.endsWith('.png')) {
      await expect(page.getByRole('img', { name: path, exact: true })).toBeVisible();
    } else {
      await expect(page.getByRole('region', { name: 'PDF 阅读器', exact: true })).toBeVisible();
    }
    expect(page.context().pages()).toHaveLength(pageCount);
    expect(page.url()).toBe(projectUrl);
  }
  await expect(page.getByRole('link', { name: '外部论文' })).toHaveAttribute(
    'href',
    'https://example.com/paper.pdf',
  );

  await page.route('**/api/projects/*/file?*', async (route) => {
    const path = new URL(route.request().url()).searchParams.get('path');
    if (path !== 'data-search/DATA_REPORT.md') return route.continue();
    await route.fulfill({
      json: {
        kind: 'text',
        path,
        editable: true,
        sha256: 'fixture',
        content:
          '# 数据报告\n\n[报告内图片](../figures/test.png)\n\n![报告配图](../figures/test.png)',
      },
    });
  });
  await page.getByRole('combobox', { name: '选择项目文件' }).fill('DATA_REPORT.md');
  await page.locator('.directory-file').filter({ hasText: 'DATA_REPORT.md' }).click();
  const reportLink = page.getByRole('link', { name: '报告内图片' });
  await expect(reportLink).toBeVisible();
  const reportImage = page.getByRole('img', { name: '报告配图', exact: true });
  await expect
    .poll(() => reportImage.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
  expect(
    new URL((await reportLink.getAttribute('href'))!, page.url()).searchParams.get('path'),
  ).toBe('figures/test.png');
  await reportLink.click();
  await expect(page.getByRole('img', { name: 'figures/test.png', exact: true })).toBeVisible();
  expect(page.context().pages()).toHaveLength(pageCount);
  expect(page.url()).toBe(projectUrl);
  await page.unrouteAll({ behavior: 'wait' });
});
