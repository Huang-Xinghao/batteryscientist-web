import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const proposal = 'refine-logs/FINAL_PROPOSAL.md';

async function fixture(request: APIRequestContext) {
  const marker = await request.get('/api/proposal-review-test');
  expect(marker.ok(), '必须连接独立模拟服务器，禁止向实际项目提交测试任务').toBeTruthy();
  expect(await marker.json()).toMatchObject({ simulated: true, modelCalls: 0 });
  const result = await request.post('/api/proposal-review-test/fixtures');
  expect(result.ok()).toBeTruthy();
  return (await result.json()).id as string;
}

async function file(request: APIRequestContext, id: string, path = proposal) {
  const result = await request.get(`/api/projects/${id}/file`, { params: { path } });
  expect(result.ok()).toBeTruthy();
  return result.json();
}

async function feedback(page: Page, text: string) {
  await page.getByRole('textbox', { name: '方案修改意见', exact: true }).fill(text);
  await page.getByRole('button', { name: '加入本轮修改', exact: true }).click();
}

async function revise(page: Page, request: APIRequestContext, id: string) {
  const before = await (await request.get(`/api/projects/${id}/idea-canvas`)).json();
  await page.getByRole('button', { name: '提交 Agent 修订', exact: true }).click();
  await expect
    .poll(async () => {
      const current = await (await request.get(`/api/projects/${id}/idea-canvas`)).json();
      return (
        current.revision?.id !== before.revision?.id && current.operation?.status === 'completed'
      );
    })
    .toBe(true);
  await expect(page.getByRole('button', { name: '提交 Agent 修订', exact: true })).toBeEnabled();
  await expect(page.getByRole('region', { name: 'Agent 本轮修订', exact: true })).toBeVisible();
}

test('连续修订、复审和批准交付同一版本，规划后停下', async ({ page, request }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const id = await fixture(request);
  const initial = await file(request, id);
  await page.goto(`/projects/${id}?view=idea-review`);
  const approve = page.getByRole('button', { name: '批准并进入实验规划', exact: true });
  await expect(approve).toBeDisabled();
  await expect(page.getByRole('button', { name: '前往方案审阅', exact: true })).toBeVisible();

  const section = page.locator('#proposal-section-method');
  await section.getByRole('button', { name: '修改这一部分', exact: true }).click();
  await page
    .getByRole('textbox', { name: '重点表述', exact: true })
    .fill('先比较简单统计方法，再考虑复杂模型。');
  await page.getByRole('button', { name: '应用这处修改', exact: true }).click();
  await feedback(page, '同步检查研究主张、强健康对照和比较顺序的关联影响。');
  await revise(page, request, id);
  await expect(
    page.getByRole('heading', { name: '这些问题需要你决定', exact: true }),
  ).toBeVisible();
  await expect(approve).toBeDisabled();
  expect((await file(request, id)).sha256).toBe(initial.sha256);

  await feedback(page, '确定先比较简单统计融合，复杂编码器后置。');
  await revise(page, request, id);
  await expect(page.getByRole('heading', { name: '这些问题需要你决定', exact: true })).toHaveCount(
    0,
  );
  await expect(approve).toBeEnabled();
  expect((await file(request, id)).sha256).toBe(initial.sha256);

  await section.getByRole('button', { name: '修改这一部分', exact: true }).click();
  await page
    .getByRole('textbox', { name: '重点表述', exact: true })
    .fill('临时改变方案，尚未同步。');
  await expect(approve).toBeDisabled();
  await page.getByRole('button', { name: '应用这处修改', exact: true }).click();
  await page.getByRole('button', { name: '保存审阅草稿', exact: true }).click();
  await expect(page.getByRole('button', { name: '保存审阅草稿', exact: true })).toBeDisabled();
  await expect(approve).toBeDisabled();
  await feedback(page, '确定采用简单统计比较，请统一刚才的修改。');
  await revise(page, request, id);
  await expect(approve).toBeEnabled();
  await page.reload();
  await expect(approve).toBeEnabled();

  const reviewed = await (await request.get(`/api/projects/${id}/idea-canvas`)).json();
  const expected =
    '# 最终研究方案\n\n' +
    reviewed.draft.review.sections
      .map(
        (item: { title: string; details: string }) => `## ${item.title}\n\n${item.details.trim()}`,
      )
      .join('\n\n') +
    '\n';
  await page.screenshot({ path: info.outputPath('ready-for-approval.png') });
  await approve.click();
  await page.getByRole('button', { name: '批准并进入实验规划', exact: true }).last().click();
  await expect
    .poll(async () => {
      const current = await (await request.get(`/api/projects/${id}`)).json();
      return [current.state.current_node, current.status];
    })
    .toEqual(['experiment_plan', 'awaiting_user']);
  await expect(page.getByText('已批准版本', { exact: true })).toBeVisible();
  const approved = await (await request.get(`/api/projects/${id}/idea-canvas`)).json();
  expect((await file(request, id)).content).toBe(expected);
  expect((await file(request, id, approved.revision.frozenPath)).content).toBe(expected);
  expect((await file(request, id)).sha256).toBe(approved.revision.formalHash);
  expect(approved.canApprove).toBe(false);
  const project = await (await request.get(`/api/projects/${id}`)).json();
  expect(
    project.state.history.some((entry: { node: string }) => entry.node === 'experiment_bridge'),
  ).toBe(false);
  expect(errors).toEqual([]);
});

test('修订失败不覆盖草稿或正式方案，补充意见后可重试', async ({ page, request }) => {
  const id = await fixture(request);
  const original = await file(request, id);
  await page.goto(`/projects/${id}?view=idea-review`);
  await feedback(page, '模拟失败');
  await page.getByRole('button', { name: '保存审阅草稿', exact: true }).click();
  await expect(page.getByRole('button', { name: '保存审阅草稿', exact: true })).toBeDisabled();
  const before = await (await request.get(`/api/projects/${id}/idea-canvas`)).json();
  await page.getByRole('button', { name: '提交 Agent 修订', exact: true }).click();
  await expect(page.getByText('上次方案操作未完成，草稿仍保留', { exact: true })).toBeVisible();
  const after = await (await request.get(`/api/projects/${id}/idea-canvas`)).json();
  expect(after.operation.status).toBe('failed');
  expect(after.sha256).toBe(before.sha256);
  expect((await file(request, id)).sha256).toBe(original.sha256);
  await feedback(page, '确定先比较简单统计方法。');
  await revise(page, request, id);
  await expect(page.getByRole('button', { name: '批准并进入实验规划', exact: true })).toBeEnabled();
});

test('手机审阅操作可见，方法画布占满内容区', async ({ page, request }, info) => {
  const id = await fixture(request);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(`/projects/${id}?view=idea-review`);
  await expect(page.getByRole('button', { name: '提交 Agent 修订', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '批准并进入实验规划', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('mobile.png') });
  await page.getByRole('button', { name: '方法画布', exact: true }).click();
  await expect(page.locator('.idea-graph')).toBeVisible();
  const graph = await page.locator('.idea-graph').boundingBox();
  const pane = await page.locator('.idea-reading-pane').boundingBox();
  expect(graph!.height).toBeGreaterThan(200);
  expect(pane!.height - graph!.height).toBeLessThan(70);
  await page.getByRole('button', { name: '新增模块', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '模块名称', exact: true })).toBeVisible();
});

test('按章节定位、展开细节并返回原意见；方法画布保留阅读位置', async ({ page, request }) => {
  const id = await fixture(request);
  await page.goto(`/projects/${id}?view=idea-review`);
  await feedback(page, '请先比较简单统计，再决定复杂编码器。');
  await revise(page, request, id);
  const impact = page
    .getByRole('region', { name: 'Agent 本轮修订', exact: true })
    .locator('details')
    .filter({ has: page.locator('summary', { hasText: '先验证简单方法' }) });
  await impact.locator('summary').click();
  const link = impact.getByRole('button', { name: '关键取舍：方法怎样比较' });
  await expect(link).toBeVisible();
  // 点击会先把入口滚到视野内；以实际点击前的位置核对返回位置。
  await link.scrollIntoViewIfNeeded();
  const pane = page.locator('.idea-reading-pane');
  const origin = await pane.evaluate((el) => el.scrollTop);
  await link.click();
  const target = page.locator('#proposal-section-method');
  await expect(target).toHaveClass(/is-located/);
  await expect(target.locator('details')).toHaveAttribute('open', '');
  await expect(target).toBeFocused();
  const back = page.getByRole('button', { name: '返回刚才的修订意见' });
  await expect(back).toBeVisible();
  await back.click();
  await expect(link).toBeFocused();
  await expect.poll(() => pane.evaluate((el) => el.scrollTop)).toBeCloseTo(origin, 0);
  await expect(target).not.toHaveClass(/is-located/);
  const canvasLink = page.getByRole('button', { name: '打开方法画布' });
  await canvasLink.scrollIntoViewIfNeeded();
  const reading = await pane.evaluate((el) => el.scrollTop);
  await canvasLink.click();
  await expect(page.locator('.idea-graph')).toHaveCount(1);
  await expect(page.locator('.idea-graph')).toBeVisible();
  await page.getByRole('button', { name: '返回方案阅读位置' }).click();
  await expect(canvasLink).toBeVisible();
  await expect.poll(() => pane.evaluate((el) => el.scrollTop)).toBeCloseTo(reading, 0);
  await expect(impact).toHaveAttribute('open', '');
});

test('等待进度显示实际阶段与耗时，刷新后恢复，不显示虚构比例', async ({ page, request }, info) => {
  const id = await fixture(request);
  const current = await (await request.get(`/api/projects/${id}/idea-canvas`)).json();
  await page.route(`**/api/projects/${id}/idea-canvas`, (route) =>
    route.fulfill({
      json: {
        ...current,
        operation: {
          id: 'progress-test',
          action: 'proposal_revise',
          status: 'running',
          createdAt: new Date(Date.now() - 65000).toISOString(),
          progress: {
            stage: 'receiving',
            receivedChars: 2850,
            updatedAt: new Date().toISOString(),
          },
        },
      },
    }),
  );
  await page.goto(`/projects/${id}?view=idea-review`);
  const progress = page.getByRole('region', { name: '方案任务进度' });
  await expect(progress).toBeVisible();
  await expect(progress.getByRole('status')).toContainText('接收修订');
  await expect(progress).toContainText('2,850 个字符');
  await expect(progress).toContainText('已等待 1 分');
  await expect(page.getByRole('button', { name: '提交 Agent 修订', exact: true })).toBeDisabled();
  await page.reload();
  await expect(progress.getByRole('status')).toContainText('接收修订');
  await expect(progress).not.toContainText('%');
  await expect(
    page.getByRole('heading', { name: '先看全貌，再决定怎么改', exact: true }),
  ).toBeVisible();
  const section = page.locator('#proposal-section-method');
  await expect(section.getByRole('button', { name: '修改这一部分', exact: true })).toBeDisabled();
  await section.locator('summary').click();
  await expect(section.locator('details')).toHaveAttribute('open', '');
  await page.screenshot({ path: info.outputPath('waiting-progress.png') });
});

for (const width of [1440, 320]) {
  test(`底部待决入口定位问题、画布隐藏提交栏且保留未应用意见（${width}px）`, async ({
    page,
    request,
  }) => {
    const id = await fixture(request);
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/projects/${id}?view=idea-review`);
    await feedback(page, '请先比较简单统计，再决定复杂编码器。');
    await revise(page, request, id);
    const locate = page.getByRole('button', { name: '查看待决问题（1）', exact: false });
    await expect(locate).toBeVisible();
    const decisions = page.getByRole('region', { name: '待决策问题', exact: true });
    await page.getByRole('button', { name: '方法画布', exact: true }).click();
    await expect(page.locator('.idea-graph')).toBeVisible();
    await expect(page.locator('.proposal-workflow-actions')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '提交 Agent 修订', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: '返回方案阅读位置' }).click();
    await locate.click();
    await expect(page.locator('.idea-graph')).toHaveCount(0);
    await expect(decisions).toBeFocused();
    const pane = page.locator('.idea-reading-pane');
    await expect
      .poll(async () => {
        const target = await decisions.boundingBox();
        const reading = await pane.boundingBox();
        return Math.abs(target!.y - reading!.y - 18);
      })
      .toBeLessThan(2);
    const input = page.getByRole('textbox', { name: '方案修改意见', exact: true });
    await input.fill('尚未加入本轮的决定，定位时需要保留。');
    await locate.click();
    await expect(decisions).toBeFocused();
    await expect(input).toHaveValue('尚未加入本轮的决定，定位时需要保留。');
    await expect(
      page.getByRole('button', { name: '批准并进入实验规划', exact: true }),
    ).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}

test('划字引用保留原文与章节，连续加入意见并保存，原提案不变', async ({ page, request }, info) => {
  const id = await fixture(request);
  const original = await file(request, id);
  await page.goto(`/projects/${id}?view=idea-review`);
  const section = page.locator('#proposal-section-method');
  const summary = section.locator('.proposal-card-summary');
  const quoted = (await summary.innerText()).trim();
  await summary.click({ clickCount: 3 });
  await page.getByRole('button', { name: '添加到对话', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '方案修改对话', exact: true });
  await expect(dialog.locator('blockquote')).toHaveText(quoted);
  await expect(dialog).toContainText('关键取舍：方法怎样比较');
  const comment = dialog.getByRole('textbox', { name: '你的决定或修改意见', exact: true });
  await expect(comment).toBeFocused();
  await comment.fill('先比较简单统计，复杂模型后置。');
  await page.screenshot({ path: info.outputPath('quoted-comment.png') });
  await dialog.getByRole('button', { name: '加入本轮修改', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const feedbackInput = page.getByRole('textbox', { name: '方案修改意见', exact: true });
  await expect.poll(() => feedbackInput.inputValue()).toContain(quoted);
  await expect(feedbackInput).toHaveValue(/先比较简单统计，复杂模型后置/);
  await page.getByRole('button', { name: '添加修改意见', exact: true }).click();
  await comment.fill('请保留现有的数据划分。');
  await dialog.getByRole('button', { name: '加入本轮修改', exact: true }).click();
  await expect(feedbackInput).toHaveValue(/先比较简单统计，复杂模型后置/);
  await expect(feedbackInput).toHaveValue(/请保留现有的数据划分/);
  await page.getByRole('button', { name: '保存审阅草稿', exact: true }).click();
  await expect(page.getByRole('button', { name: '保存审阅草稿', exact: true })).toBeDisabled();
  const saved = await (await request.get(`/api/projects/${id}/idea-canvas`)).json();
  expect(saved.draft.review.feedback).toContain(`【针对：关键取舍：方法怎样比较】`);
  expect(saved.draft.review.feedback).toContain(quoted);
  expect(saved.operation).toBeNull();
  expect((await file(request, id)).sha256).toBe(original.sha256);
  await page.reload();
  await expect(feedbackInput).toHaveValue(/请保留现有的数据划分/);
});

test('待决问题原处填写决定，关闭侧栏后未加入的意见可以继续编辑', async ({ page, request }) => {
  const id = await fixture(request);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(`/projects/${id}?view=idea-review`);
  await feedback(page, '请先比较简单统计，再决定复杂编码器。');
  await revise(page, request, id);
  const decisions = page.getByRole('region', { name: '待决策问题', exact: true });
  const question = (await decisions.locator('article > p').innerText())
    .replace(/^1\.\s*/, '')
    .trim();
  await decisions.getByRole('button', { name: '填写决定', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '方案修改对话', exact: true });
  await expect(dialog.locator('blockquote')).toHaveText(question);
  const comment = dialog.getByRole('textbox', { name: '你的决定或修改意见', exact: true });
  await comment.fill('确定先用简单统计，不启动复杂模型。');
  await dialog.getByRole('button', { name: '关闭', exact: true }).click();
  await expect(page.getByRole('button', { name: '提交 Agent 修订', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '继续填写意见', exact: true }).click();
  await expect(comment).toHaveValue('确定先用简单统计，不启动复杂模型。');
  await expect(dialog.locator('blockquote')).toHaveText(question);
  expect(await dialog.evaluate((el) => el.getBoundingClientRect().width <= innerWidth)).toBe(true);
  await dialog.getByRole('button', { name: '加入本轮修改', exact: true }).click();
  await expect(page.getByRole('button', { name: '提交 Agent 修订', exact: true })).toBeEnabled();
  await expect(page.getByRole('textbox', { name: '方案修改意见', exact: true })).toHaveValue(
    /【针对：待决问题 1】/,
  );
  await revise(page, request, id);
  await expect(page.getByRole('button', { name: '批准并进入实验规划', exact: true })).toBeEnabled();
});

for (const width of [1440, 960, 320]) {
  test(`审阅底部按工作区宽度整齐排列（${width}px）`, async ({ page, request }) => {
    const id = await fixture(request);
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/projects/${id}?view=idea-review`);
    const footer = page.locator('.proposal-workflow-actions');
    await expect(footer).toBeVisible();
    const pane = await page.locator('.idea-workspace').boundingBox();
    const buttons = await footer.locator('.proposal-workflow-buttons > button').all();
    const boxes = await Promise.all(buttons.map((button) => button.boundingBox()));
    for (const box of boxes) {
      expect(box!.width).toBeGreaterThan(100);
      expect(box!.height).toBe(36);
      expect(box!.x).toBeGreaterThanOrEqual(pane!.x);
      expect(box!.x + box!.width).toBeLessThanOrEqual(pane!.x + pane!.width);
    }
    if (pane!.width >= 430) {
      expect(new Set(boxes.map((box) => box!.y)).size).toBe(1);
    } else {
      expect(new Set(boxes.map((box) => box!.x)).size).toBe(1);
      expect(new Set(boxes.map((box) => Math.round(box!.width))).size).toBe(1);
    }
    await page.getByRole('button', { name: '方法画布', exact: true }).click();
    await expect(footer).toHaveCount(0);
    await expect(page.getByRole('button', { name: '保存画布', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '新增模块', exact: true })).toBeVisible();
  });
}
