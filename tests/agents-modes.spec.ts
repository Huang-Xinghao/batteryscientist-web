import { expect, test, type Page } from '@playwright/test';

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: 'wait' });
});

async function fixture(
  page: Page,
  {
    running = true,
    mode = 'expert',
    proposal = false,
    compacting = false,
    operationStage = '',
  } = {},
) {
  let identifier = '';
  await page.route('**/api/projects/*/events?*', (route) =>
    route.fulfill({ contentType: 'text/event-stream', body: ': fixture\n\n' }),
  );
  await page.route(/\/api\/projects\/[^/?]+$/, async (route) => {
    const response = await route.fetch();
    const project = await response.json();
    identifier = project.id;
    await route.fulfill({
      response,
      json: {
        ...project,
        status: proposal ? 'awaiting_user' : running ? 'running' : 'interrupted',
        state: {
          ...project.state,
          mode,
          status: proposal ? 'awaiting_user' : running ? 'running' : 'interrupted',
          current_node: proposal ? 'refine' : 'experiment_plan',
          expert_checkpoint: proposal
            ? { ...project.state.expert_checkpoint, node: 'refine', questions: [] }
            : null,
        },
        progress: {
          ...project.progress,
          operations: operationStage
            ? [
                {
                  operation: 'review',
                  role: 'experiment',
                  stage: operationStage,
                  status: 'running',
                  elapsed_seconds: 123,
                  checks_completed: 4,
                  activity_age_seconds: 2,
                },
              ]
            : [],
        },
        pending_questions: [],
        runs: running
          ? [
              {
                id: 'role-run',
                status: 'running',
                created_at: new Date().toISOString(),
                options: { mode },
              },
            ]
          : [],
        agents: [
          { role: 'main', status: running ? 'waiting' : 'idle', is_active: false },
          { role: 'idea_generator', status: 'completed', is_active: false },
          {
            role: 'experiment',
            status: running ? 'running' : 'idle',
            phase: 'experiment_plan',
            instruction: '设计独立的对照实验',
            is_active: running,
          },
          { role: 'paper_writer', status: 'completed', is_active: false },
        ],
      },
    });
  });
  await page.route('**/api/projects/*/activity*', (route) =>
    route.fulfill({
      json: {
        has_more: false,
        events: running
          ? [
              {
                id: 1,
                kind: 'assistant_output',
                data: { role: 'main', phase: 'coordinator', content: '主控正在核对研究目标' },
              },
              {
                id: 2,
                kind: 'assistant_output',
                data: { role: 'paper_writer', phase: 'paper_write', content: '论文角色的写作记录' },
              },
              {
                id: 3,
                kind: 'assignment_start',
                data: {
                  role: 'main',
                  assignment: {
                    node: 'experiment_plan',
                    role: 'experiment',
                    instruction: '设计独立的对照实验',
                  },
                },
              },
              {
                id: 4,
                kind: 'assistant_output',
                data: {
                  role: 'experiment',
                  phase: 'experiment_plan',
                  content: '实验角色正在规划对照组',
                },
              },
              ...(compacting
                ? [
                    {
                      id: 5,
                      kind: 'context_compacting',
                      data: { role: 'experiment', phase: 'experiment_plan' },
                    },
                    {
                      id: 6,
                      kind: 'model_heartbeat',
                      data: {
                        role: 'experiment',
                        phase: 'experiment_plan',
                        context_compacting: true,
                      },
                    },
                  ]
                : []),
            ].map((event) => ({
              ...event,
              project_id: identifier,
              run_id: 'role-run',
              created_at: `2026-11-13T08:00:0${event.id}Z`,
            }))
          : [],
      },
    }),
  );
  await page.goto('/projects');
  await page.locator('a.project-card').filter({ hasText: 'battery-study' }).click();
}

test('current agent status follows work without a task history button', async ({ page }) => {
  await fixture(page);
  const bar = page.getByRole('status', { name: '当前执行进展' });
  await expect(bar).toContainText('实验 Agent');
  await expect(page.getByText('实验角色正在规划对照组', { exact: true })).toBeVisible();
  await expect(bar.getByRole('button')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '查看当前 Agent 任务与记录' })).toHaveCount(0);
  await page.reload();
  await expect(bar).toContainText('实验 Agent');
  await expect(page.getByText('实验角色正在规划对照组', { exact: true })).toBeVisible();
});

test('mode choice is shared by composer and run settings and submits the chosen mode', async ({
  page,
}) => {
  await fixture(page, { running: false, mode: 'auto' });
  const composerMode = page.getByLabel('对话协作方式');
  await expect(composerMode).toBeVisible();
  await composerMode.getByText('每阶段由我审阅', { exact: true }).click();
  await page.getByRole('button', { name: '运行设置', exact: true }).click();
  await expect(
    page.getByText('专家模式 · 每个阶段审阅后继续（推荐）', { exact: true }),
  ).toBeVisible();
  await page.getByLabel('协作方式', { exact: true }).focus();
  await page.getByLabel('协作方式', { exact: true }).press('ArrowDown');
  await page.getByText('自动模式 · 连续运行整个工作流', { exact: true }).last().click();
  await expect(page.getByText('自动模式会在任务范围内连续推进', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: /取\s*消/ }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(
    composerMode.locator('.ant-segmented-item-selected').getByText('全自动', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '运行设置', exact: true }).click();
  await expect(page.getByText('自动模式会在任务范围内连续推进', { exact: false })).toBeVisible();
  let body: Record<string, unknown> | undefined;
  await page.route('**/api/projects/*/runs', (route) => {
    body = route.request().postDataJSON();
    return route.fulfill({ status: 202, json: { id: 'mock-auto-run' } });
  });
  await page.getByRole('button', { name: '启动研究', exact: true }).click();
  await expect.poll(() => body?.mode).toBe('auto');
  expect(body?.action).toBe('resume');
  expect(body?.max_tool_rounds).toBe(300);
});

test('live handoff returns focus to main without leaving the previous role working', async ({
  page,
}) => {
  await fixture(page);
  await page.route('**/api/projects/*/events?*', (route) => {
    const projectId = new URL(route.request().url()).pathname.split('/')[3];
    const event = {
      id: 5,
      project_id: projectId,
      run_id: 'role-run',
      kind: 'assignment_end',
      data: { role: 'experiment', status: 'completed' },
      created_at: '2026-11-13T08:00:05Z',
    };
    return route.fulfill({
      contentType: 'text/event-stream',
      body: `data: ${JSON.stringify(event)}\n\n`,
    });
  });
  await page.reload();
  await expect(page.getByRole('status', { name: '当前执行进展' })).toContainText('主控 Agent');
  await expect(page.getByText('主控正在核对研究目标', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '查看实验 Agent', exact: true })).toHaveCount(0);
});

test('terminal snapshot takes precedence over previous web run events', async ({ page }) => {
  await fixture(page);
  await page.route(/\/api\/projects\/[^/?]+$/, async (route) => {
    const response = await route.fetch();
    const project = await response.json();
    await route.fulfill({
      response,
      json: {
        ...project,
        status: 'external_running',
        agents: [
          {
            role: 'paper_writer',
            status: 'running',
            is_active: true,
            phase: 'paper_write',
            instruction: '编写结果章节',
          },
        ],
      },
    });
  });
  await page.reload();
  await expect(page.getByRole('status', { name: '当前执行进展' })).toContainText('论文 Agent');
  await expect(page.getByText('论文角色的写作记录', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '查看实验 Agent', exact: true })).toHaveCount(0);
});

test('auto-mode proposal does not present expert review controls', async ({ page }) => {
  await fixture(page, { running: false, mode: 'auto', proposal: true });
  await expect(page.getByRole('button', { name: '查看方案问题', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('专家反馈')).toHaveCount(0);
});

test('role controls fit mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page);
  await expect(page.getByRole('status', { name: '当前执行进展' })).toContainText('实验 Agent');
  await expect(page.getByRole('button', { name: '查看实验 Agent', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: 'artifacts/agent-roles-mobile.png', fullPage: true });
});

test('Wiki progress streams public text and preserves the original user request', async ({
  page,
}) => {
  await fixture(page);
  let finished = false;
  const original = '使用 Tongji 电池数据集用先进的时序模型完成电池寿命预测研究';
  const goal = '使用 Tongji 电池数据集开展研究，明确无泄漏评估协议并按专家模式交付。';
  await page.route(/\/api\/projects\/[^/?]+$/, async (route) => {
    const response = await route.fetch();
    const project = await response.json();
    await route.fulfill({
      response,
      json: {
        ...project,
        status: finished ? 'completed' : 'running',
        pending_questions: [],
        state: {
          ...project.state,
          status: finished ? 'completed' : 'running',
          expert_checkpoint: null,
          project_goal: goal,
        },
        runs: [
          {
            id: 'wiki-run',
            status: 'running',
            created_at: '2026-11-15T05:00:00Z',
            options: { action: 'coordinate', message_prompt: original, prompt: original },
          },
        ],
        agents: [{ role: 'wiki_agent', status: 'running', is_active: true, phase: 'wiki' }],
      },
    });
  });
  await page.route('**/api/projects/*/activity*', (route) => {
    const contents = [
      ['model_start', {}],
      ['assistant_delta', { content: '旧请求残片' }],
      ['assistant_stream_start', {}],
      ['assistant_delta', { content: '<think>内部推理不展示</think>正在整理' }],
      ['assistant_delta', { content: '论文证据。' }],
      ...(finished ? [['assistant_output', { content: '正在整理论文证据。' }]] : []),
    ];
    return route.fulfill({
      json: {
        has_more: false,
        events: contents.map(([kind, data], index) => ({
          id: index + 1,
          kind,
          project_id: 'fixture',
          run_id: 'wiki-run',
          created_at: `2026-11-15T05:00:0${index + 1}Z`,
          data: {
            role: 'wiki_agent',
            phase: 'wiki',
            task_id: 'wiki-task',
            iteration: 7,
            ...(data as Record<string, unknown>),
          },
        })),
      },
    });
  });
  await page.reload();
  await expect(page.getByRole('status', { name: '当前执行进展' })).toContainText('Wiki Agent');
  await expect(page.getByRole('status', { name: '当前执行进展' })).toContainText('正在生成回复');
  await expect(page.getByText('正在整理论文证据。', { exact: true })).toHaveCount(1);
  await expect(page.getByText('旧请求残片', { exact: true })).toHaveCount(0);
  await expect(page.getByText('内部推理不展示', { exact: true })).toHaveCount(0);
  await expect(page.locator('.user-message')).toHaveCount(0);
  finished = true;
  await page.reload();
  await expect(page.getByText('正在整理论文证据。', { exact: true })).toHaveCount(1);
  await expect(page.getByText('回复生成中', { exact: false })).toHaveCount(0);
  await expect(page.locator('.user-message')).toContainText(original);
  await expect(page.locator('.user-message')).not.toContainText(goal);
  await page.getByText('主控整理的研究目标', { exact: true }).click();
  await expect(page.locator('.research-goal')).toContainText(goal);
  await expect(page.getByRole('textbox', { name: '研究指令', exact: true })).toHaveValue('');
});

test('context compaction stays visible through heartbeats and clears after completion', async ({
  page,
}) => {
  await fixture(page, { compacting: true });
  const card = page.getByRole('status', { name: '当前执行进展' });
  await expect(card).toContainText('正在压缩上下文');
  await expect(card).toBeVisible();
  await page.route('**/api/projects/*/activity*', (route) =>
    route.fulfill({
      json: {
        has_more: false,
        events: [
          {
            id: 7,
            kind: 'working_context_compacted',
            run_id: 'role-run',
            created_at: '2026-11-13T08:00:07Z',
            data: { role: 'experiment', phase: 'experiment_plan' },
          },
        ],
      },
    }),
  );
  await page.reload();
  await expect(card).toContainText('实验 Agent');
  await expect(card).not.toContainText('正在压缩上下文');
  // The compaction notice is a step in the folded execution-process block.
  await expect(page.getByRole('region', { name: '执行过程' }).last()).toContainText(
    '上下文压缩完成',
  );
});

test('slow operations keep their current activity visible after refresh', async ({ page }) => {
  await fixture(page, { operationStage: 'checking_evidence' });
  const progress = page.getByRole('status', { name: '当前执行进展' });
  await expect(progress).toContainText('审阅者正在核查证据');
  await page.reload();
  await expect(progress).toContainText('审阅者正在核查证据');
});

test('idle status shows no working agents and concurrent operations show only active roles', async ({
  page,
}) => {
  await fixture(page, { running: false });
  const bar = page.getByRole('status', { name: '当前执行进展' });
  await expect(bar).toContainText('等待你的指令');
  await expect(bar).not.toContainText('Agent');
  await page.route(/\/api\/projects\/[^/?]+$/, async (route) => {
    const response = await route.fetch();
    const project = await response.json();
    await route.fulfill({
      response,
      json: {
        ...project,
        status: 'running',
        progress: {
          ...project.progress,
          operations: [
            { role: 'experiment', status: 'running', stage: 'checking_evidence' },
            { role: 'wiki_agent', status: 'running', stage: 'writing_report' },
            { role: 'paper_writer', status: 'finished' },
          ],
        },
      },
    });
  });
  await page.reload();
  await expect(bar).toContainText('实验 Agent');
  await expect(bar).toContainText('Wiki Agent');
  await expect(bar).not.toContainText('论文 Agent');
});

test('follow-up questions use live coordinator status instead of the completed workflow tool', async ({
  page,
}) => {
  await fixture(page);
  await page.route(/\/api\/projects\/[^/?]+$/, async (route) => {
    const response = await route.fetch();
    const project = await response.json();
    await route.fulfill({
      response,
      json: {
        ...project,
        status: 'running',
        state: {
          ...project.state,
          status: 'completed',
          current_node: 'improvement',
          paper_status: 'pdf_ready',
          expert_checkpoint: null,
          history: ['paper_write', 'improvement'].map((node) => ({ node })),
        },
        progress: {
          current_node: 'paper_compile',
          phase: 'paper_compile',
          tool: 'submit_delivery',
          status: 'completed',
          operations: [],
        },
        agents: [{ role: 'main', phase: 'coordinator', is_active: true, status: 'running' }],
        runs: [
          {
            id: 'follow-up',
            status: 'running',
            created_at: new Date().toISOString(),
            options: { action: 'coordinate', prompt: '解释一下实验配置' },
          },
        ],
      },
    });
  });
  await page.route('**/api/projects/*/activity*', (route) =>
    route.fulfill({
      json: {
        has_more: false,
        events: [
          {
            id: 100,
            project_id: 'fixture',
            run_id: 'follow-up',
            created_at: new Date().toISOString(),
            kind: 'assistant_delta',
            data: {
              role: 'main',
              phase: 'coordinator',
              task_id: 'follow-up',
              iteration: 1,
              content: '正在解释已有实验配置。',
            },
          },
        ],
      },
    }),
  );
  await page.reload();
  const status = page.getByRole('status', { name: '当前执行进展' });
  await expect(status).toContainText('主控 Agent');
  await expect(status).toContainText('正在生成回复');
  await expect(page.getByText('正在解释已有实验配置。', { exact: true })).toBeVisible();
  await expect(page.getByText('审阅改进 · submit_delivery', { exact: true })).toHaveCount(0);
  await expect(page.locator('.agent-working')).toHaveCount(0);
  await expect(page.locator('.conversation-scroll')).not.toContainText('submit_delivery');
  await expect(page.getByRole('button', { name: '编译交付，已完成', exact: true })).toHaveClass(
    /is-done/,
  );
  await expect(page.locator('.charge-stage.is-running')).toHaveCount(0);
});

test('completed coordinator receipts never create a user message or duplicate the answer', async ({
  page,
}) => {
  await fixture(page, { running: false });
  await page.route(/\/api\/projects\/[^/?]+$/, async (route) => {
    const response = await route.fetch();
    const project = await response.json();
    await route.fulfill({
      response,
      json: {
        ...project,
        status: 'completed',
        state: { ...project.state, status: 'completed', expert_checkpoint: null },
        runs: [
          {
            id: 'follow-up',
            status: 'completed',
            created_at: '2026-11-25T01:00:00Z',
            options: { action: 'coordinate', prompt: '解释一下实验配置' },
          },
        ],
      },
    });
  });
  const reply = '这是当前项目的实验配置说明。';
  await page.route('**/api/projects/*/activity*', (route) =>
    route.fulfill({
      json: {
        has_more: false,
        events: [
          {
            id: 100,
            run_id: 'follow-up',
            created_at: '2026-11-25T01:00:01Z',
            kind: 'assistant_output',
            data: { role: 'main', phase: 'coordinator', content: reply },
          },
          {
            id: 101,
            run_id: 'follow-up',
            created_at: '2026-11-25T01:00:02Z',
            kind: 'conversation_turn',
            data: { prompt: '主控执行结果', reply, intent: 'coordinator_result' },
          },
        ],
      },
    }),
  );
  await page.reload();
  await expect(page.getByText('主控执行结果', { exact: true })).toHaveCount(0);
  await expect(page.locator('.user-message').filter({ hasText: '解释一下实验配置' })).toHaveCount(
    1,
  );
  await expect(page.getByText(reply, { exact: true })).toHaveCount(1);
});
