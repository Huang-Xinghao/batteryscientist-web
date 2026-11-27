import { expect, test, type Page } from '@playwright/test';

const RUN = 'stream-run';

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: 'wait' });
});

type Step = [kind: string, data: Record<string, unknown>];

/** A running project whose activity history is exactly `steps`. */
async function openWithActivity(page: Page, steps: Step[], running = true) {
  await page.route(/\/api\/projects\/[^/?]+$/, async (route) => {
    const response = await route.fetch();
    const project = await response.json();
    await route.fulfill({
      response,
      json: {
        ...project,
        status: running ? 'running' : 'completed',
        state: { ...project.state, status: 'running', current_node: 'literature' },
        runs: [
          {
            id: RUN,
            status: running ? 'running' : 'completed',
            created_at: new Date(Date.now() - 60_000).toISOString(),
            options: { action: 'coordinate', message_prompt: '调研跨电芯泛化' },
          },
        ],
      },
    });
  });
  await page.route('**/api/projects/*/activity?*', (route) => {
    const url = new URL(route.request().url());
    const projectId = url.pathname.split('/')[3];
    const base = Date.now() - 50_000;
    return route.fulfill({
      json: {
        has_more: false,
        events: url.searchParams.get('after')
          ? []
          : steps.map(([kind, data], index) => ({
              id: 500 + index,
              project_id: projectId,
              run_id: RUN,
              kind,
              data: { role: 'idea_generator', phase: 'literature', iteration: 1, ...data },
              created_at: new Date(base + index * 4_000).toISOString(),
            })),
      },
    });
  });
  await page.route('**/api/projects/*/events?*', (route) => route.abort());
  await page.goto('/projects');
  await page
    .getByRole('link')
    .filter({ has: page.getByRole('heading', { name: 'battery-study' }) })
    .click();
}

const tools: Step[] = [
  ['tool_start', { tool: 'search_wiki', call_id: 'a', arguments: '{"query":"cross-cell"}' }],
  ['tool_end', { tool: 'search_wiki', call_id: 'a', output: '找到 12 条' }],
  ['tool_start', { tool: 'read_wiki', call_id: 'b', arguments: '{"path":"papers/a.md"}' }],
  ['tool_end', { tool: 'read_wiki', call_id: 'b', output: '论文摘要' }],
];

test('finished tool calls fold into one steps block that opens step by step', async ({ page }) => {
  await openWithActivity(
    page,
    [['model_start', {}], ...tools, ['assistant_output', { content: '调研完成。' }]],
    false,
  );
  const process = page.getByRole('region', { name: '执行过程' });
  await expect(process).toHaveCount(1);
  await expect(process).toContainText('已完成 2 步');
  await expect(process).toContainText('检索范式库');
  await expect(page.getByText('论文摘要')).toBeHidden();
  await process.getByRole('button', { name: /已完成 2 步/ }).click();
  await process.getByRole('button', { name: /^阅读范式库条目/ }).click();
  await expect(page.getByText('论文摘要')).toBeVisible();
  await expect(page.getByText('调研完成。')).toBeVisible();
});

test('a running step keeps the block open and names the current step', async ({ page }) => {
  await openWithActivity(page, [
    ['model_start', {}],
    ...tools,
    ['tool_start', { tool: 'search_literature', call_id: 'c', arguments: '{"query":"transfer"}' }],
  ]);
  const process = page.getByRole('region', { name: '执行过程' });
  await expect(process.getByRole('button', { name: /正在检索文献/ })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(process).toContainText('第 3 步');
});

test('model thinking streams open and folds to its duration when done', async ({ page }) => {
  await openWithActivity(page, [
    ['model_start', {}],
    ['assistant_reasoning_delta', { content: '先确认数据划分方式，' }],
  ]);
  const live = page.getByRole('region', { name: '思考过程' });
  await expect(live.getByRole('button', { name: /思考中/ })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(live).toContainText('先确认数据划分方式');
  // Thinking is visible, so the generic indicator stays away.
  await expect(page.getByRole('status').filter({ hasText: '正在思考' })).toHaveCount(0);

  await page.unrouteAll({ behavior: 'wait' });
  await openWithActivity(
    page,
    [
      ['model_start', {}],
      ['assistant_reasoning', { content: '先确认数据划分方式，再比较方法。' }],
      ['assistant_output', { content: '结论如下。' }],
    ],
    false,
  );
  const done = page.getByRole('region', { name: '思考过程' });
  const summary = done.getByRole('button', { name: /已思考 \d+ 秒/ });
  await expect(summary).toHaveAttribute('aria-expanded', 'false');
  await summary.click();
  await expect(done).toContainText('再比较方法');
});

test('an agent working without streamed text shows that it is thinking', async ({ page }) => {
  await openWithActivity(page, [['model_start', { role: 'main', phase: 'coordinator' }]]);
  await expect(page.getByRole('status').filter({ hasText: '正在思考' })).toBeVisible();
});
