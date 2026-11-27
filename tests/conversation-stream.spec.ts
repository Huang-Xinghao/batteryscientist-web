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

test('user history remains visible during a worker handoff and after reload', async ({ page }) => {
  await page.route('**/api/projects/*/messages*', (route) =>
    route.fulfill({
      json: {
        messages: Array.from({ length: 35 }, (_, index) => ({
          id: `saved-message-${index}`,
          created_at: new Date(Date.now() - (40 - index) * 60000).toISOString(),
          content: `已保存的用户消息 ${index}`,
          label: '研究指令',
        })),
        next_cursor: null,
      },
    }),
  );
  await openWithActivity(page, [
    ['assignment_start', { assignment: { role: 'idea_generator', node: 'literature' } }],
    ['model_start', {}],
  ]);
  await expect(page.locator('.user-message')).toHaveCount(36);
  await expect(page.locator('.user-message').filter({ hasText: '已保存的用户消息 0' })).toHaveCount(
    1,
  );
  await page.reload();
  await expect(page.locator('.user-message')).toHaveCount(36);
  await expect(
    page.locator('.user-message').filter({ hasText: '已保存的用户消息 34' }),
  ).toHaveCount(1);
});

for (const width of [1512, 390]) {
  test(`scrolling up loads earlier messages and execution records at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    let olderRequests = 0;
    let olderActivityRequests = 0;
    let release: () => void = () => {};
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/projects/*/messages*', async (route) => {
      const older = new URL(route.request().url()).searchParams.has('before');
      if (older) {
        olderRequests += 1;
        await hold;
      }
      const start = older ? 0 : 20;
      await route.fulfill({
        json: {
          messages: Array.from({ length: 20 }, (_, index) => ({
            id: `scroll-message-${start + index}`,
            created_at: new Date(Date.now() - (60 - start - index) * 60000).toISOString(),
            content: `历史研究指令 ${start + index}`,
            label: '研究指令',
          })),
          next_cursor: older ? null : 'older-messages',
        },
      });
    });
    await openWithActivity(page, [], false);
    await page.route('**/api/projects/*/activity?*', async (route) => {
      const url = new URL(route.request().url());
      const older = url.searchParams.has('before');
      if (older) {
        olderActivityRequests += 1;
        await hold;
      }
      const start = older ? 0 : 20;
      await route.fulfill({
        json: {
          has_more: !older,
          events: url.searchParams.has('after')
            ? []
            : Array.from({ length: 20 }, (_, index) => ({
                id: start + index + 1,
                project_id: url.pathname.split('/')[3],
                run_id: RUN,
                kind: 'assistant_output',
                data: { role: 'main', content: `历史执行记录 ${start + index}` },
                created_at: new Date(
                  Date.now() - (60 - start - index) * 60000 + 1000,
                ).toISOString(),
              })),
        },
      });
    });
    await page.reload();
    await expect(page.locator('.user-message')).toHaveCount(21);
    await expect(page.getByRole('button', { name: '加载更早的执行记录' })).toHaveCount(0);
    const scroller = page.locator('.conversation-scroll');
    await scroller.evaluate((element) => {
      element.scrollTop = 100;
    });
    await expect.poll(() => olderRequests).toBe(1);
    const anchor = page.locator('.user-message').filter({ hasText: '历史研究指令 21' });
    await expect.poll(() => olderActivityRequests).toBe(1);
    const before = (await anchor.boundingBox())!.y;
    await scroller.hover();
    await page.mouse.wheel(0, -1);
    release();
    await expect(page.locator('.user-message')).toHaveCount(41);
    await expect(page.getByText('历史执行记录 0', { exact: true })).toHaveCount(1);
    await expect
      .poll(async () => Math.abs((await anchor.boundingBox())!.y - before))
      .toBeLessThan(5);
    expect(olderRequests).toBe(1);
    expect(olderActivityRequests).toBe(1);
    await scroller.evaluate((element) => {
      element.scrollTop = 0;
    });
    await expect(page.locator('.user-message').filter({ hasText: '历史研究指令 0' })).toBeVisible();
    expect(olderRequests).toBe(1);
  });
}

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
