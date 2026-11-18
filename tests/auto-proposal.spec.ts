import { expect, test, type Page } from '@playwright/test';

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: 'wait' });
});

const proposalPath = 'refine-logs/FINAL_PROPOSAL.md';
const question = '是否使用共享编码器？';
async function fixture(page: Page, expert = false, running = false) {
  const runs: Record<string, unknown>[] = [];
  let stale = false;
  await page.route('**/api/projects/*/events?*', (route) =>
    route.fulfill({ contentType: 'text/event-stream', body: ': fixture\n\n' }),
  );
  await page.route(/\/api\/projects\/[^/?]+$/, async (route) => {
    const response = await route.fetch();
    const project = await response.json();
    const status = running ? 'running' : expert ? 'awaiting_user' : 'completed';
    await route.fulfill({
      response,
      json: {
        ...project,
        status,
        runs: [],
        pending_questions: [],
        checkpoint_token: 'test-token',
        state: {
          ...project.state,
          mode: expert ? 'expert' : 'auto',
          status,
          current_node: running ? 'experiment_plan' : 'refine',
          history: [{ node: 'refine' }],
          expert_checkpoint: expert
            ? { status: 'pending', node: 'refine', report: proposalPath, questions: [question] }
            : null,
        },
        progress: { ...project.progress, status, current_node: 'refine' },
      },
    });
  });
  await page.route('**/api/projects/*/files', (route) =>
    route.fulfill({ json: { files: [{ path: proposalPath, size: 100, modified: 0 }] } }),
  );
  await page.route('**/api/projects/*/file?*', (route) =>
    route.fulfill({
      json: {
        path: proposalPath,
        kind: 'text',
        content: '# Formal proposal',
        sha256: (stale ? 'c' : 'a').repeat(64),
        editable: true,
      },
    }),
  );
  await page.route('**/api/projects/*/proposal-overview', (route) =>
    route.fulfill({
      json: {
        sha256: 'a'.repeat(64),
        diagram: '前100循环 → 共享MLP → 寿命',
        input: 'X [b,100,3,300]',
        architecture: '共享循环编码器与回放缓冲。',
        output: '总寿命标量，派生RUL。',
      },
    }),
  );
  await page.route('**/api/projects/*/runs', async (route) => {
    runs.push(route.request().postDataJSON());
    await route.fulfill({ status: 202, json: { id: 'mock-run', status: 'queued' } });
  });
  await page.goto('/');
  await page.locator('a.project-card').filter({ hasText: 'battery-study' }).click();
  if (running) await expect(page.getByLabel('模型架构图')).toBeVisible();
  else await page.getByRole('button', { name: '查看方案', exact: true }).first().click();
  return {
    runs,
    setStale: () => {
      stale = true;
    },
  };
}

for (const running of [false, true]) {
  test(`automatic mode displays model without review or dispatch (running=${running})`, async ({
    page,
  }) => {
    const state = await fixture(page, false, running);
    await expect(page.getByLabel('模型架构图')).toHaveText('前100循环 → 共享MLP → 寿命');
    await expect(page.getByText('X [b,100,3,300]', { exact: true })).toBeVisible();
    await expect(page.getByText('总寿命标量，派生RUL。', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: '模型输入', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '按此方案继续', exact: true })).toHaveCount(0);
    await expect(page.getByLabel('方案问题')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '提交 Agent 修订', exact: true })).toHaveCount(0);
    expect(state.runs).toEqual([]);
  });
}

test('expert mode puts questions below model and submits answers with checkpoint', async ({
  page,
}) => {
  const state = await fixture(page, true);
  const questions = page.getByLabel('方案问题');
  await expect(questions).toBeVisible();
  expect((await questions.boundingBox())!.y).toBeGreaterThan(
    (await page.getByRole('heading', { name: '模型输出', exact: true }).boundingBox())!.y,
  );
  await expect(page.getByRole('button', { name: '提交回答', exact: true })).toBeDisabled();
  await page
    .getByRole('textbox', { name: question, exact: true })
    .fill('采用共享编码器，宽度改为64');
  await expect(page.getByRole('button', { name: '按此方案继续', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '提交回答', exact: true }).click();
  await expect.poll(() => state.runs.length).toBe(1);
  expect(state.runs[0]).toMatchObject({
    action: 'review',
    checkpoint_token: 'test-token',
    answer: `问题：${question}\n回答：采用共享编码器，宽度改为64`,
  });
});

test('expert can accept current proposal without triggering revision', async ({ page }) => {
  const state = await fixture(page, true);
  await page.getByRole('button', { name: '按此方案继续', exact: true }).click();
  await expect.poll(() => state.runs.length).toBe(1);
  expect(state.runs[0]).toMatchObject({
    action: 'review',
    answer: '',
    checkpoint_token: 'test-token',
  });
});

test('changed formal proposal prevents stale expert approval', async ({ page }) => {
  const state = await fixture(page, true);
  await expect(page.getByLabel('模型架构图')).toBeVisible();
  state.setStale();
  await page.getByRole('button', { name: '按此方案继续', exact: true }).click();
  await expect(page.getByText('方案已更新，请查看新版后回答', { exact: true })).toBeVisible();
  expect(state.runs).toEqual([]);
});

test('combined proposal fits a mobile workspace', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page, true);
  await expect(page.getByLabel('模型架构图')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/model-proposal-mobile.png' });
});
