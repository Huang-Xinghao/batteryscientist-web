import { expect, test, type Page } from '@playwright/test';

async function openReport(page: Page) {
  await page.goto('/');
  await page
    .getByRole('link')
    .filter({ has: page.getByRole('heading', { name: 'battery-study' }) })
    .click();
  if (page.viewportSize()!.width <= 700) {
    await page.getByRole('button', { name: '产物工作区', exact: true }).click();
  }
  await expect(page.getByRole('button', { name: /保\s*存/, exact: true })).toBeVisible();
  await expect(page.getByText('编辑', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '全屏查看' })).toHaveCount(0);
  return page.url().split('/').pop()!;
}

async function appendDraft(page: Page, text: string) {
  const editor = page.locator('.monaco-editor').first();
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.press('ControlOrMeta+End');
  await page.keyboard.insertText(text);
  return editor;
}

for (const width of [1512, 360]) {
  test(`running report accepts a draft and saves it after the run pauses at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 360 ? 640 : 900 });
    let running = true;
    await page.route(/\/api\/projects\/[^/?]+$/, async (route) => {
      const response = await route.fetch();
      const project = await response.json();
      await route.fulfill({
        response,
        json: { ...project, status: running ? 'running' : 'awaiting_user' },
      });
    });
    await openReport(page);
    await expect(
      page.getByText('运行中可编辑草稿；等待阶段审阅或停止运行后再保存，避免与 Agent 的修改冲突。'),
    ).toHaveCount(0);
    const draftText = `运行中起草的修改（${width}）。`;
    await appendDraft(page, `\n\n${draftText}`);
    const save = page.getByRole('button', { name: /保\s*存/, exact: true });
    await expect(save).toBeDisabled();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: '下载草稿' }).click();
    expect((await downloadPromise).suggestedFilename()).toBe('draft-RESEARCH_REPORT.md');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `artifacts/report-editing-${width}.png` });
    running = false;
    await expect(save).toBeEnabled({ timeout: 10000 });
    await save.click();
    await expect(page.getByText('文件已保存', { exact: true })).toBeVisible();
    await expect(page.locator('.monaco-editor').first()).toContainText(draftText);
    await page.reload();
    if (width <= 700) {
      await page.getByRole('button', { name: '产物工作区', exact: true }).click();
    }
    await page.locator('.monaco-editor').first().click();
    await page.keyboard.press('ControlOrMeta+End');
    await expect(page.locator('.monaco-editor').first()).toContainText(draftText);
  });
}

test('concurrent file changes retain the draft and require explicit reload', async ({ page }) => {
  const id = await openReport(page);
  const editor = await appendDraft(page, '\n\n必须保留的草稿。');
  const endpoint = `/api/projects/${id}/file?path=literature%2FRESEARCH_REPORT.md`;
  const latest = await (await page.request.get(endpoint)).json();
  const external = await page.request.put(endpoint, {
    data: { content: latest.content + '\n\n外部更新的报告。', sha256: latest.sha256 },
  });
  expect(external.ok()).toBe(true);
  await page.getByRole('button', { name: /保\s*存/, exact: true }).click();
  await expect(page.getByText(/草稿已保留；可先下载草稿/)).toBeVisible();
  await expect(editor).toContainText('必须保留的草稿。');
  await page.getByRole('button', { name: '重新加载文件' }).click();
  await page.getByRole('button', { name: /取\s*消/ }).click();
  await expect(editor).toContainText('必须保留的草稿。');
  await page.getByRole('button', { name: '重新加载文件' }).click();
  await page.getByRole('button', { name: /确\s*定/ }).click();
  await expect(editor).toContainText('外部更新的报告。');
  await expect(editor).not.toContainText('必须保留的草稿。');
  await expect(page.getByRole('button', { name: /保\s*存/, exact: true })).toBeDisabled();
});

test('editor stays available when a deployment removes deferred editor assets', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'battery-study' })).toBeVisible();
  await page.route(/\/assets\/(?:Editor|editor)-[^/]+\.js$/, (route) => route.abort());
  await page
    .getByRole('link')
    .filter({ has: page.getByRole('heading', { name: 'battery-study' }) })
    .click();
  const editor = page.locator('.monaco-editor').first();
  await expect(editor).toBeVisible();
  await expect(page.locator('.editor-fallback')).toHaveCount(0);
  await editor.click();
  await page.keyboard.press('ControlOrMeta+End');
  await page.keyboard.insertText('\n\n发布后编辑器仍可保存。');
  await page.getByRole('button', { name: /保\s*存/, exact: true }).click();
  await expect(page.getByText('文件已保存')).toBeVisible();
  await expect(editor).toContainText('发布后编辑器仍可保存。');
});

test('save shortcut keeps edits typed while the saved snapshot is in flight', async ({ page }) => {
  const id = await openReport(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let received!: () => void;
  const started = new Promise<void>((resolve) => {
    received = resolve;
  });
  await page.route(/\/api\/projects\/[^/]+\/file\?/, async (route) => {
    if (route.request().method() !== 'PUT') return route.continue();
    received();
    await gate;
    await route.continue();
  });
  await appendDraft(page, '\n已提交的快照。');
  await page.keyboard.press('ControlOrMeta+s');
  await started;
  await page.keyboard.insertText('\n保存途中继续输入。');
  release();
  await expect(page.getByText('文件已保存')).toBeVisible();
  await expect(page.locator('.monaco-editor').first()).toContainText('保存途中继续输入。');
  await expect(page.getByRole('button', { name: /保\s*存/, exact: true })).toBeEnabled();
  const saved = await (
    await page.request.get(`/api/projects/${id}/file?path=literature%2FRESEARCH_REPORT.md`)
  ).json();
  expect(saved.content).toContain('已提交的快照。');
  expect(saved.content).not.toContain('保存途中继续输入。');
  await page.keyboard.press('ControlOrMeta+s');
  await expect(page.getByRole('button', { name: /保\s*存/, exact: true })).toBeDisabled();
});
