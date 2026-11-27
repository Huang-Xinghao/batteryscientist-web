import { expect, test } from '@playwright/test';

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: 'wait' });
});

async function mockCoordinatorReply(page: import('@playwright/test').Page) {
  let prompt = '';
  await page.route('**/api/projects/*/messages', async (route) => {
    prompt = route.request().postDataJSON().prompt;
    await route.fulfill({ status: 202, json: { id: 'mock-coordinator-run' } });
  });
  await page.route(/\/api\/projects\/[^/?]+$/, async (route) => {
    const response = await route.fetch();
    const project = await response.json();
    await route.fulfill({
      response,
      json: {
        ...project,
        runs: prompt
          ? [
              {
                id: 'mock-coordinator-run',
                status: 'completed',
                created_at: '2026-11-13T08:00:00Z',
                options: { action: 'coordinate', prompt },
              },
            ]
          : [],
      },
    });
  });
  await page.route('**/api/projects/*/activity?*', (route) => {
    const projectId = new URL(route.request().url()).pathname.split('/')[3];
    return route.fulfill({
      json: {
        has_more: false,
        events: prompt
          ? [
              {
                id: 900,
                project_id: projectId,
                run_id: 'mock-coordinator-run',
                kind: 'assistant_output',
                data: {
                  role: 'main',
                  phase: 'coordinator',
                  content: '我是 BatteryScientist，由主控协调研究任务。',
                },
                created_at: new Date().toISOString(),
              },
            ]
          : [],
      },
    });
  });
}

// Markdown reports open in the reading view; switch to the editor before editing.
async function showEditor(page: import('@playwright/test').Page) {
  await page.getByRole('combobox', { name: '选择项目文件' }).fill('DATA_REPORT.md');
  await page.locator('.directory-file').filter({ hasText: 'DATA_REPORT.md' }).click();
  await page.locator('.artifact-actions .ant-segmented-item').filter({ hasText: '编辑' }).click();
  await expect(page.locator('.monaco-editor').first()).toBeVisible();
}

async function openFixture(page: import('@playwright/test').Page, requireEditor = true) {
  await page.goto('/');
  await page
    .getByRole('link')
    .filter({ has: page.getByRole('heading', { name: 'battery-study' }) })
    .click();
  await expect(page.getByRole('heading', { name: 'battery-study', exact: true })).toBeVisible();
  if ((page.viewportSize()?.width || 1512) <= 1000) {
    await expect(page.getByRole('navigation', { name: '工作台视图' })).toBeVisible();
    await page.getByRole('button', { name: '产物工作区', exact: true }).click();
  }
  if (requireEditor) await showEditor(page);
}

test('lists real projects, searches, and opens a research report', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'battery-study' })).toBeVisible();
  await page.getByPlaceholder('搜索项目或研究目标').fill('不存在的研究');
  await expect(page.getByText('没有匹配的项目')).toBeVisible();
  await page.getByPlaceholder('搜索项目或研究目标').fill('电池');
  await page.locator('a.project-card').click();
  await expect(page.getByLabel('文献研究图谱', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '查看问题并回答' })).toHaveCount(0);
  await expect(page.getByText('优先研究哪一个泛化问题？')).toBeVisible();
  await page.screenshot({ path: 'artifacts/workbench-tested.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('creates a project with a separate research directory', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '新建研究项目' }).click();
  await page.getByLabel('项目名称').fill('浏览器新建项目');
  await page.getByRole('button', { name: '创建项目', exact: true }).click();
  await expect(page.getByRole('heading', { name: '浏览器新建项目' })).toBeVisible();
  await page.getByRole('button', { name: '启动研究' }).click();
  await expect(page.getByLabel('研究目标')).toBeVisible();
  await page.getByRole('button', { name: /取\s*消/ }).click();
});

test('edits and saves a report through the API', async ({ page }) => {
  await openFixture(page);
  const editor = page.locator('.monaco-editor').first();
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.press('ControlOrMeta+End');
  await page.keyboard.insertText('\n\n浏览器保存验证。');
  await expect(page.getByText('有未保存的修改，请在切换文件或页面前保存。')).toBeVisible();
  await page.locator('.back-link').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: /取\s*消/ }).click();
  await expect(editor).toBeVisible();
  await page.getByRole('button', { name: /保\s*存/ }).click();
  await expect(page.locator('.monaco-editor').first()).toContainText('浏览器保存验证。');
  await page.reload();
  await showEditor(page);
  await expect(page.locator('.monaco-editor').first()).toContainText('浏览器保存验证。');
});

test('expert review submits explicit feedback with a version token', async ({ page }) => {
  await openFixture(page);
  await expect(page.getByRole('button', { name: '查看问题并回答' })).toHaveCount(0);
  let body: Record<string, unknown> | undefined;
  await page.route('**/api/projects/*/runs', async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'mock-run' }),
    });
  });
  await page
    .getByPlaceholder('输入你的回答或修改意见；留空表示接受当前产物并继续。')
    .fill('优先研究跨电芯泛化');
  await page.getByRole('button', { name: '提交意见并继续' }).click();
  await page.getByRole('button', { name: /确\s*定/ }).click();
  await expect.poll(() => body?.answer).toBe('优先研究跨电芯泛化');
  expect(body?.action).toBe('review');
  expect(typeof body?.checkpoint_token).toBe('string');
});

test('mobile workbench fits the viewport and file navigation works', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFixture(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.getByRole('combobox', { name: '选择项目文件' }).fill('RESEARCH_REPORT.md');
  await page.locator('.directory-file').filter({ hasText: 'RESEARCH_REPORT.md' }).click();
  await expect(page.getByLabel('文献研究图谱', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'artifacts/workbench-mobile-tested.png', fullPage: true });
});

test('connection errors provide a retry action', async ({ page }) => {
  await page.route('**/api/projects', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ detail: '服务暂不可用' }),
    }),
  );
  await page.goto('/');
  await expect(page.getByText('项目加载失败')).toBeVisible();
  await expect(page.getByText('服务暂不可用')).toBeVisible();
  await expect(page.getByRole('button', { name: /重\s*试/ })).toBeVisible();
});

test('login gates project data without a floating logout button', async ({ page }) => {
  let signedIn = false;
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ json: { enabled: true, authenticated: signedIn } }),
  );
  await page.route('**/api/auth/login', async (route) => {
    const body = route.request().postDataJSON();
    signedIn = body.username === 'admin' && body.password === 'correct-password';
    await route.fulfill({
      status: signedIn ? 200 : 401,
      json: signedIn ? { authenticated: true } : { detail: '用户名或密码错误' },
    });
  });
  await page.goto('/');
  await expect(page.getByText('登录你的研究空间')).toBeVisible();
  await expect(page.locator('a.project-card')).toHaveCount(0);
  await page.getByLabel('用户名').fill('admin');
  await page.getByLabel('密码', { exact: true }).fill('wrong');
  await page.getByRole('button', { name: /登\s*录/ }).click();
  await expect(page.getByText('用户名或密码错误')).toBeVisible();
  await page.getByLabel('密码', { exact: true }).fill('correct-password');
  await page.getByRole('button', { name: /登\s*录/ }).click();
  await expect(page.getByRole('heading', { name: 'battery-study' })).toBeVisible();
  await expect(page.getByRole('button', { name: '退出登录' })).toHaveCount(0);
});

test('expert questions have a visible entry and collaboration mode can be chosen', async ({
  page,
}) => {
  await openFixture(page);
  await expect(page.getByRole('button', { name: '查看问题并回答' })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: /优先研究哪一个泛化问题/ })).toBeVisible();
  await page.goto('/');
  await page.getByRole('button', { name: '新建研究项目' }).click();
  await page.getByLabel('项目名称').fill('模式选择测试');
  await page.getByRole('button', { name: '创建项目', exact: true }).click();
  await page.getByRole('button', { name: '运行设置' }).click();
  await expect(page.getByRole('combobox', { name: '协作方式', exact: true })).toBeVisible();
  await expect(page.getByText('专家模式 · 每个阶段审阅后继续（推荐）')).toBeVisible();
});

test('review questions have independent drafts and submit their matching answers together', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route(/\/api\/projects\/[^/?]+$/, async (route) => {
    const response = await route.fetch();
    const project = await response.json();
    if (project.state?.expert_checkpoint)
      project.state.expert_checkpoint.questions = [
        '优先研究哪一个泛化问题？',
        '希望使用什么数据集？',
      ];
    await route.fulfill({ response, json: project });
  });
  await openFixture(page);
  await page.getByRole('button', { name: '研究对话', exact: true }).click();
  const first = page.getByRole('textbox', { name: /优先研究哪一个泛化问题/ });
  const second = page.getByRole('textbox', { name: /希望使用什么数据集/ });
  await first.fill('优先跨电芯泛化');
  await second.fill('NASA 和 CALCE');
  await expect(page.getByText('已回答 2 / 2')).toBeVisible();
  await page.getByLabel('专家反馈').fill('先完成文献对照');
  await page.getByRole('button', { name: '提交意见并继续' }).click();
  await page.getByRole('button', { name: /取\s*消/ }).click();
  await expect(first).toHaveValue('优先跨电芯泛化');
  await expect(second).toHaveValue('NASA 和 CALCE');
  let fail = true;
  let body: Record<string, unknown> | undefined;
  await page.route('**/api/projects/*/runs', async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({
      status: fail ? 409 : 202,
      json: fail ? { detail: '检查点已更新，请刷新' } : { id: 'question-review' },
    });
  });
  await page.getByRole('button', { name: '提交意见并继续' }).click();
  await page.getByRole('button', { name: /确\s*定/ }).click();
  await expect(page.getByText('检查点已更新，请刷新')).toBeVisible();
  await expect(first).toHaveValue('优先跨电芯泛化');
  await expect(second).toHaveValue('NASA 和 CALCE');
  fail = false;
  await page.getByRole('button', { name: /取\s*消/ }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await first.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'artifacts/review-question-answers-mobile.png' });
  await page.getByRole('button', { name: '提交意见并继续' }).click();
  await page.getByRole('button', { name: /确\s*定/ }).click();
  await expect(first).toHaveValue('');
  await expect(second).toHaveValue('');
  expect(body?.answer).toBe(
    '问题 1：优先研究哪一个泛化问题？\n回答：优先跨电芯泛化\n\n问题 2：希望使用什么数据集？\n回答：NASA 和 CALCE\n\n补充意见：先完成文献对照',
  );
  expect(typeof body?.checkpoint_token).toBe('string');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.unrouteAll({ behavior: 'wait' });
});

test('LaTeX source and PDF appear together and images open in a gallery', async ({ page }) => {
  await openFixture(page);
  await page.getByRole('combobox', { name: '选择项目文件' }).fill('paper/main.tex');
  await page.locator('.directory-file').filter({ hasText: 'main.tex' }).click();
  await expect(page.locator('.workspace-panel-header')).toBeHidden();
  await expect(page.getByRole('tab', { name: '文件', exact: true })).toBeHidden();
  await expect(page.getByRole('combobox', { name: '选择项目文件' })).toBeVisible();
  await expect(page.getByText('LaTeX 论文工作区', { exact: true })).toHaveCount(0);
  await expect(page.locator('.latex-artifact .artifact-toolbar')).toHaveCount(0);
  await expect(page.getByText('编辑', { exact: true })).toHaveCount(0);
  const surface = await page.locator('.latex-source .monaco-editor').boundingBox();
  expect(surface!.height).toBeGreaterThan(500);
  expect(surface!.width).toBeGreaterThan(350);
  await expect(page.locator('iframe[title="论文 PDF 对照预览"]')).toBeVisible();
  const editor = page.locator('.monaco-editor').first();
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.press('ControlOrMeta+End');
  await page.keyboard.insertText('\n% Browser edit');
  await page.keyboard.press('ControlOrMeta+s');
  await expect(page.getByText('文件已保存')).toBeVisible();
  await expect(page.getByText('待编译', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'artifacts/latex-workspace.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.getByRole('button', { name: '文件与产物', exact: true }).click();
  await page.getByRole('menuitem', { name: '图片画廊' }).click();
  await expect(page.locator('.workspace-panel-header')).toBeVisible();
  await page.locator('.figure-gallery .ant-image').first().click();
  await expect(page.locator('.ant-image-preview')).toBeVisible();
});

for (const viewport of [
  { width: 1512, height: 900 },
  { width: 390, height: 844 },
  { width: 360, height: 640 },
]) {
  test(`file contents scroll without moving controls at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route('**/api/projects/*/file?*', async (route) => {
      const response = await route.fetch();
      const data = await response.json();
      const path = new URL(route.request().url()).searchParams.get('path');
      await route.fulfill({
        response,
        json: {
          ...data,
          content: path?.endsWith('.tex')
            ? '\\documentclass{article}\n' + '% Long source line\n'.repeat(250)
            : '# 电池寿命研究\n\n' + '研究证据与实验结果。\n\n'.repeat(250),
        },
      });
    });
    if (viewport.height === 640) {
      await page.route('**/api/projects/*/files', async (route) => {
        const response = await route.fetch();
        const data = await response.json();
        await route.fulfill({
          response,
          json: {
            ...data,
            files: data.files.map((file: { path: string; modified: number }) =>
              file.path.endsWith('.tex') ? { ...file, modified: Date.now() / 1000 + 3600 } : file,
            ),
          },
        });
      });
      await page.route(/\/api\/projects\/[^/?]+$/, async (route) => {
        const response = await route.fetch();
        const data = await response.json();
        await route.fulfill({
          response,
          json: {
            ...data,
            state: { ...data.state, error: '连接中断，请查看日志并重试。'.repeat(40) },
          },
        });
      });
    }
    await openFixture(page);
    const toolbar = page.locator('.artifact-toolbar');
    const editor = page.locator('.monaco-editor').first();
    const top = (await toolbar.boundingBox())!.y;
    await editor.click();
    await page.keyboard.press('ControlOrMeta+End');
    await expect(editor).toContainText('研究证据与实验结果。');
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    expect((await toolbar.boundingBox())!.y).toBe(top);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
      true,
    );
    await expect(page.getByRole('button', { name: '全屏查看' })).toHaveCount(0);
    await page.getByRole('combobox', { name: '选择项目文件' }).fill('paper/main.tex');
    await page.locator('.directory-file').filter({ hasText: 'main.tex' }).click();
    const source = page.locator('.latex-source .monaco-editor');
    await expect(source).toBeVisible();
    const scroll = source.locator('.monaco-scrollable-element').first();
    await expect.poll(() => scroll.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    const sourceTop = (await toolbar.boundingBox())!.y;
    await source.hover();
    await page.mouse.wheel(0, 650);
    await expect
      .poll(async () => Number(await source.locator('.line-numbers').first().textContent()))
      .toBeGreaterThan(1);
    expect((await toolbar.boundingBox())!.y).toBe(sourceTop);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    if (viewport.width < 700) {
      await page.locator('.latex-mobile-switch').getByText('PDF 预览', { exact: true }).click();
      await expect(page.locator('.latex-pdf iframe')).toBeVisible();
      expect((await page.locator('.latex-pdf iframe').boundingBox())!.height).toBeGreaterThan(50);
      await expect(source).toBeHidden();
    }
    await page.getByRole('button', { name: /运行动态/ }).click();
    await expect(page.getByRole('dialog', { name: '运行动态' })).toBeVisible();
    await page.getByRole('button', { name: '关闭', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `artifacts/bounded-workbench-${viewport.width}.png` });
  });
}

test('conversation replays execution output and opens artifacts in the workspace', async ({
  page,
}) => {
  await page.route('**/api/projects/*/activity?*', async (route) => {
    const projectId = new URL(route.request().url()).pathname.split('/')[3];
    const kinds = [
      ['model_start', { phase: 'literature', iteration: 1 }],
      [
        'assistant_output',
        { phase: 'literature', content: '已比较已有证据，接下来检查跨电芯泛化。' },
      ],
      [
        'tool_start',
        {
          phase: 'literature',
          iteration: 1,
          call_id: 'read-1',
          tool: 'read',
          arguments: '{"path":"literature/RESEARCH_REPORT.md"}',
        },
      ],
      [
        'tool_end',
        {
          phase: 'literature',
          iteration: 1,
          call_id: 'read-1',
          tool: 'read',
          output: '已读取研究报告',
          is_error: false,
        },
      ],
      ['node_end', { node: 'literature', artifact: '文献证据整理完成。' }],
    ];
    const after = new URL(route.request().url()).searchParams.get('after');
    await route.fulfill({
      json: {
        has_more: false,
        events: after
          ? []
          : kinds.map(([kind, data], index) => ({
              id: index + 100,
              project_id: projectId,
              run_id: 'fixture-run',
              kind,
              data,
              created_at: `2026-10-24T09:00:0${index}Z`,
            })),
      },
    });
  });
  await openFixture(page);
  await expect(page.getByText('已比较已有证据，接下来检查跨电芯泛化。')).toBeVisible();
  // Tool calls fold into one steps block; expand it, then open the step's details.
  const process = page.getByRole('region', { name: '执行过程' });
  await expect(process).toContainText('已完成 1 步');
  await process.getByRole('button', { name: /已完成 1 步/ }).click();
  await process.getByRole('button', { name: /^读取文件/ }).click();
  await expect(page.getByText('已读取研究报告')).toBeVisible();
  await page.locator('.chat-artifact').click();
  // The literature report opens as the research map rather than a text editor.
  await expect(page.getByRole('region', { name: '文献研究图谱', exact: true })).toBeVisible();
  const separator = page.getByRole('separator', { name: '调整工作区宽度' });
  await separator.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(separator).toHaveAttribute('aria-valuenow', '36');
  await page.getByRole('button', { name: '展开工作区', exact: true }).click();
  await expect(page.locator('.conversation-panel')).toBeHidden();
  await page.getByRole('button', { name: '恢复分栏' }).click();
  await page.reload();
  await expect(page.getByText('已比较已有证据，接下来检查跨电芯泛化。')).toBeVisible();
  await page.screenshot({ path: 'artifacts/conversation-workspace-desktop.png' });
});

test('mobile conversation sends checkpoint feedback and opens the artifact workspace', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFixture(page);
  await page.getByRole('button', { name: '研究对话', exact: true }).click();
  let body: Record<string, unknown> | undefined;
  await page.route('**/api/projects/*/runs', async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({ status: 202, json: { id: 'mock-chat-run' } });
  });
  await page.getByLabel('专家反馈').fill('优先验证跨电芯泛化');
  await page.getByRole('button', { name: '提交意见并继续' }).click();
  await page.getByRole('button', { name: /确\s*定/ }).click();
  await expect.poll(() => body?.answer).toBe('优先验证跨电芯泛化');
  expect(body?.action).toBe('review');
  expect(typeof body?.checkpoint_token).toBe('string');
  await page.screenshot({ path: 'artifacts/conversation-workspace-mobile.png' });
  await page.locator('.chat-artifact').first().click();
  await expect(page.getByRole('region', { name: '文献研究图谱', exact: true })).toBeVisible();
});

test('composer starts research and preserves its draft when submission fails', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '新建研究项目' }).click();
  await page.getByLabel('项目名称').fill('对话启动测试');
  await page.getByRole('button', { name: '创建项目', exact: true }).click();
  await expect(page.getByRole('heading', { name: '对话启动测试' })).toBeVisible();
  let shouldFail = true;
  let body: Record<string, unknown> | undefined;
  await page.route('**/api/projects/*/messages', async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({
      status: shouldFail ? 409 : 202,
      json: shouldFail ? { detail: '已有研究正在运行，请稍后重试' } : { id: 'composer-run' },
    });
  });
  const draft = page.getByRole('textbox', { name: '研究指令', exact: true });
  await draft.fill('请研究跨电芯寿命预测中的泛化误差。');
  await page.getByRole('button', { name: '发送研究指令' }).click();
  await expect(page.getByText('已有研究正在运行，请稍后重试')).toBeVisible();
  await expect(draft).toHaveValue('请研究跨电芯寿命预测中的泛化误差。');
  shouldFail = false;
  await expect(draft).toBeEnabled();
  await draft.press('ControlOrMeta+Enter');
  await expect(draft).toHaveValue('');
  expect(body?.action).toBeUndefined();
  expect(body?.mode).toBe('expert');
  expect(body?.prompt).toBe('请研究跨电芯寿命预测中的泛化误差。');
});

test('new project sends questions to the coordinator and replays saved chat on reload', async ({
  page,
}) => {
  await mockCoordinatorReply(page);
  await page.goto('/');
  await page.getByRole('button', { name: '新建研究项目' }).click();
  await page.getByLabel('项目名称').fill('普通问答测试');
  await page.getByRole('button', { name: '创建项目', exact: true }).click();
  await expect(page.getByRole('heading', { name: '普通问答测试' })).toBeVisible();
  const url = page.url();
  const draft = page.getByRole('textbox', { name: '研究指令', exact: true });
  await draft.fill('你是谁？');
  await page.getByRole('button', { name: '发送研究指令' }).click();
  await expect(draft).toHaveValue('');
  await expect(
    page.locator('.chat-markdown').filter({ hasText: '我是 BatteryScientist' }),
  ).toBeVisible();
  await expect(page.getByText('运行请求已提交')).toHaveCount(0);
  const id = url.split('/').pop();
  const project = await (await page.request.get(`/api/projects/${id}`)).json();
  expect(project.runs).toEqual([]);
  expect(project.status).toBe('idle');
  await page.reload();
  await expect(page.locator('.user-message').filter({ hasText: '你是谁？' })).toBeVisible();
  await expect(
    page.locator('.chat-markdown').filter({ hasText: '我是 BatteryScientist' }),
  ).toBeVisible();
  await page.unrouteAll({ behavior: 'wait' });
});

test('paper divider resizes with the keyboard and resets on double click', async ({ page }) => {
  await openFixture(page);
  await page.getByRole('combobox', { name: '选择项目文件' }).fill('main.tex');
  await page.locator('.directory-file').filter({ hasText: 'main.tex' }).click();
  const divider = page.getByRole('separator', { name: '调整源码与 PDF 宽度' });
  await expect(divider).toBeVisible();
  const source = page.locator('.latex-source');
  const before = (await source.boundingBox())!.width;
  await divider.press('ArrowLeft');
  await expect(divider).toHaveAttribute('aria-valuenow', '48');
  expect((await source.boundingBox())!.width).toBeLessThan(before);
  await divider.dblclick();
  await expect(divider).toHaveAttribute('aria-valuenow', '50');
});

test('gallery filters images, recovers failed loads and opens the preview', async ({ page }) => {
  await openFixture(page);
  await page.route(/\/api\/projects\/.*\/download\?.*test.png/, (route) => route.abort());
  await page.getByRole('tab', { name: '图片', exact: true }).click();
  await expect(page.getByText('图片加载失败', { exact: true })).toBeVisible();
  await page.unroute(/\/api\/projects\/.*\/download\?.*test.png/);
  await page.getByRole('button', { name: /重新加载/ }).click();
  await expect(page.getByText('1 × 1', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: '筛选研究图片' }).fill('不存在');
  await expect(page.getByText('没有匹配的图片')).toBeVisible();
  await page.getByRole('textbox', { name: '筛选研究图片' }).fill('test');
  await page.locator('.figure-gallery .ant-image').click();
  await expect(page.locator('.ant-image-preview-img')).toBeVisible();
});

test('single image opens the shared sibling preview', async ({ page }) => {
  await openFixture(page);
  await page.getByRole('combobox', { name: '选择项目文件' }).fill('figures/test.png');
  await page.locator('.directory-file').filter({ hasText: 'test.png' }).click();
  await page.locator('.image-preview .ant-image').click();
  await expect(page.locator('.ant-image-preview-img')).toBeVisible();
});

test('message copy and reuse protect an existing composer draft', async ({ page, context }) => {
  await mockCoordinatorReply(page);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.getByRole('button', { name: '新建研究项目' }).click();
  await page.getByLabel('项目名称').fill('消息操作测试');
  await page.getByRole('button', { name: '创建项目', exact: true }).click();
  const draft = page.getByRole('textbox', { name: '研究指令', exact: true });
  await draft.fill('你是谁？');
  await page.getByRole('button', { name: '发送研究指令' }).click();
  const reply = page.locator('.agent-message').filter({ has: page.locator('.chat-markdown') });
  await expect(reply).toContainText('我是 BatteryScientist');
  await reply.getByRole('button', { name: '复制消息', exact: true }).click();
  await expect(reply.getByRole('button', { name: '消息已复制' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    '我是 BatteryScientist',
  );
  await draft.fill('保留这条未发送的指令');
  await page.getByRole('button', { name: '修改这条指令' }).click();
  await expect(page.getByRole('dialog')).toContainText('替换输入框中未发送的草稿？');
  await page.getByRole('button', { name: /取\s*消/ }).click();
  await expect(draft).toHaveValue('保留这条未发送的指令');
  await page.getByRole('button', { name: '修改这条指令' }).click();
  await page.getByRole('button', { name: /确\s*定/ }).click();
  await expect(draft).toHaveValue('你是谁？');
  await expect(draft).toBeFocused();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.screenshot({ path: 'artifacts/chat-bubbles-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/chat-bubbles-mobile.png' });
  await page.unrouteAll({ behavior: 'wait' });
});

test('completed project messages use routing instead of resuming improvement', async ({ page }) => {
  await page.route(/\/api\/projects\/[^/?]+$/, async (route) => {
    const response = await route.fetch();
    const project = await response.json();
    project.status = 'completed';
    project.state.status = 'completed';
    project.state.current_node = 'improvement';
    project.state.expert_checkpoint = null;
    await route.fulfill({ response, json: project });
  });
  let body: Record<string, unknown> | undefined;
  await page.route('**/api/projects/*/messages', async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({ status: 202, json: { id: 'scoped-figure-task' } });
  });
  await page.route('**/api/projects/*/runs', () => {
    throw new Error('Message must not resume the previous workflow node');
  });
  await openFixture(page, false);
  await page.getByRole('textbox', { name: '研究指令' }).fill('只修改图一的配色，其他图不要动');
  await page.getByRole('button', { name: '发送研究指令' }).click();
  await expect.poll(() => body?.prompt).toBe('只修改图一的配色，其他图不要动');
  expect(body).not.toHaveProperty('action');
  expect(body).not.toHaveProperty('start_node');
  await page.unrouteAll({ behavior: 'wait' });
});

test('running project retains unaccepted messages without stopping the task', async ({ page }) => {
  await page.route(/\/api\/projects\/[^/?]+$/, async (route) => {
    const response = await route.fetch();
    const project = await response.json();
    project.status = 'running';
    project.state.status = 'running';
    project.state.expert_checkpoint = null;
    await route.fulfill({ response, json: project });
  });
  let prompt = '';
  await page.route('**/api/projects/*/messages', async (route) => {
    prompt = route.request().postDataJSON().prompt;
    await route.fulfill({
      json: { intent: 'status', accepted: false, reply: '当前任务仍在执行，请稍后提交。' },
    });
  });
  await openFixture(page, false);
  await page.getByRole('textbox', { name: '研究指令' }).fill('现在进度怎么样？');
  await page.getByRole('button', { name: '发送研究指令' }).click();
  await expect.poll(() => prompt).toBe('现在进度怎么样？');
  await expect(page.getByRole('textbox', { name: '研究指令' })).toHaveValue('现在进度怎么样？');
  await expect(page.getByText('当前任务仍在执行，请稍后提交。')).toBeVisible();
  await expect(
    page.locator('.chat-composer').getByRole('button', { name: '停止运行' }),
  ).toBeVisible();
  await page.unrouteAll({ behavior: 'wait' });
});

for (const width of [1512, 390]) {
  test(`方案交付后运行实验时可打开已有报告 ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const proposal = 'refine-logs/FINAL_PROPOSAL.md';
    await page.route(/\/api\/projects\/[^/?]+$/, async (route) => {
      const response = await route.fetch();
      const project = await response.json();
      await route.fulfill({
        response,
        json: {
          ...project,
          status: 'running',
          state: { ...project.state, current_node: 'experiment_bridge', expert_checkpoint: null },
          progress: { current_node: 'experiment_bridge' },
        },
      });
    });
    await page.route('**/api/projects/*/files', async (route) => {
      const response = await route.fetch();
      const data = await response.json();
      await route.fulfill({
        response,
        json: {
          ...data,
          files: [...data.files, { path: proposal, size: 100, modified: 1 }],
        },
      });
    });
    await page.route('**/api/projects/*/file?*', async (route) => {
      if (new URL(route.request().url()).searchParams.get('path') !== proposal)
        return route.continue();
      await route.fulfill({
        json: {
          kind: 'text',
          path: proposal,
          content: '# 已交付研究方案\n\n## 研究方法\n\n比较时序模型。',
          sha256: 'proposal-hash',
          editable: true,
        },
      });
    });
    await page.route('**/api/projects/*/idea-canvas', (route) =>
      route.fulfill({
        json: {
          sha256: '',
          sourceHash: 'proposal-hash',
          draft: null,
          context: 'historical',
          operation:
            width === 1512
              ? {
                  id: 'prior-approval',
                  action: 'proposal_approve',
                  status: 'completed',
                }
              : null,
        },
      }),
    );
    await openFixture(page, false);
    await page.getByRole('button', { name: '审阅方案', exact: true }).click();
    await expect(
      page.getByText('项目正在进行：实验执行。当前方案和已生成报告可继续查看。'),
    ).toBeVisible();
    await expect(page.getByRole('region', { name: '方案任务进度' })).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: '选择项目文件' })).toBeVisible();
    await page.getByRole('button', { name: /^文献研究，/ }).click();
    await expect(page.locator('.artifact-filename')).toHaveText('文献研究图谱');
    await showEditor(page);
    await expect(page.getByRole('button', { name: /保\s*存/, exact: true })).toBeDisabled();
  });
}

test('Enter sends, Shift+Enter inserts a newline, and IME confirmation does not send', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: '新建研究项目' }).click();
  await page.getByLabel('项目名称').fill('回车发送测试');
  await page.getByRole('button', { name: '创建项目', exact: true }).click();
  const sent: string[] = [];
  await page.route('**/api/projects/*/messages', async (route) => {
    sent.push(route.request().postDataJSON().prompt);
    await route.fulfill({ status: 202, json: { id: 'keyboard-run' } });
  });
  const input = page.getByRole('textbox', { name: '研究指令', exact: true });
  await input.fill('第一行');
  await input.press('Shift+Enter');
  await input.press('End');
  await input.press('a');
  await expect(input).toHaveValue('第一行\na');
  expect(sent).toEqual([]);
  await input.dispatchEvent('keydown', {
    key: 'Enter',
    code: 'Enter',
    isComposing: true,
    bubbles: true,
  });
  expect(sent).toEqual([]);
  await input.dispatchEvent('keydown', {
    key: 'Enter',
    code: 'Enter',
    keyCode: 229,
    bubbles: true,
  });
  expect(sent).toEqual([]);
  await input.press('Enter');
  await expect(input).toHaveValue('');
  expect(sent).toEqual(['第一行\na']);
  await input.fill('兼容原快捷键');
  await input.press('ControlOrMeta+Enter');
  await expect(input).toHaveValue('');
  expect(sent).toEqual(['第一行\na', '兼容原快捷键']);
});
