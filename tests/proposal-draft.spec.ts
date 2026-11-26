import { expect, test, type Page } from '@playwright/test';

const PROPOSAL = 'refine-logs/FINAL_PROPOSAL.md';
const SHA = 'a'.repeat(64);
const ARCHIVED = [
  'refine-logs/archive/idea-review-20261125T000000Z/IDEA_CANVAS.json',
  'refine-logs/archive/idea-review-20261125T000000Z/IDEA_REVIEW.json',
];

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: 'wait' });
});

/** A project waiting at the refine checkpoint with a draft left by the old review page. */
async function refineWithLeftoverDraft(page: Page) {
  const calls = { archive: 0, runs: [] as Record<string, unknown>[] };
  let archived = false;
  await page.route(/\/api\/projects\/[^/?]+$/, async (route) => {
    const response = await route.fetch();
    const project = await response.json();
    await route.fulfill({
      response,
      json: {
        ...project,
        status: 'awaiting_user',
        state: {
          ...project.state,
          status: 'awaiting_user',
          mode: 'expert',
          current_node: 'refine',
          expert_checkpoint: {
            node: 'refine',
            summary: '方案已生成。',
            questions: [],
            report: PROPOSAL,
            files: [PROPOSAL],
            status: 'pending',
            next_node: 'experiment_plan',
          },
        },
      },
    });
  });
  await page.route('**/api/projects/*/files', async (route) => {
    const response = await route.fetch();
    const list = await response.json();
    await route.fulfill({
      response,
      json: { ...list, files: [...list.files, { path: PROPOSAL, size: 100, modified: 1 }] },
    });
  });
  await page.route('**/api/projects/*/proposal-overview', (route) =>
    route.fulfill({
      json: {
        sha256: SHA,
        diagram: '',
        input: '电压曲线。',
        architecture: '编码器。',
        output: '寿命。',
        pendingReview: archived
          ? null
          : {
              changes: 2,
              editedSections: 1,
              hasFeedback: true,
              hasRevision: false,
              unreadable: false,
            },
      },
    }),
  );
  await page.route('**/api/projects/*/file?path=refine-logs*', (route) =>
    route.fulfill({ json: { kind: 'text', path: PROPOSAL, content: '# 方案', sha256: SHA } }),
  );
  await page.route('**/api/projects/*/idea-canvas/archive', (route) => {
    calls.archive += 1;
    archived = true;
    return route.fulfill({ json: { archived: ARCHIVED } });
  });
  await page.route('**/api/projects/*/runs', (route) => {
    calls.runs.push(route.request().postDataJSON());
    return route.fulfill({ status: 202, json: { id: 'mock-run', status: 'queued' } });
  });
  await page.goto('/');
  await page
    .getByRole('link')
    .filter({ has: page.getByRole('heading', { name: 'battery-study' }) })
    .click();
  return calls;
}

test('a leftover review draft explains itself and can be archived to continue', async ({
  page,
}) => {
  const calls = await refineWithLeftoverDraft(page);
  const card = page.getByRole('region', { name: '未处理的方案审阅草稿' });
  await expect(card).toBeVisible();
  await expect(card).toContainText('2 条修改记录');
  // The blocked continue button is replaced by the two ways out.
  await expect(page.getByRole('button', { name: /按此方案继续/ })).toHaveCount(0);

  await card.getByRole('button', { name: /归档草稿，按当前方案继续/ }).click();
  await page.getByRole('button', { name: '归档并继续' }).click();
  await expect.poll(() => calls.runs.length).toBe(1);
  expect(calls.archive).toBe(1);
  expect(calls.runs[0]).toMatchObject({ action: 'review', answer: '' });
  await expect(card).toHaveCount(0);
  await expect(page.getByRole('button', { name: /按此方案继续/ })).toBeVisible();
});

test('a leftover review draft can be handed to the Agent for revision', async ({ page }) => {
  const calls = await refineWithLeftoverDraft(page);
  const card = page.getByRole('region', { name: '未处理的方案审阅草稿' });
  await card.getByRole('button', { name: /让 Agent 按草稿修订方案/ }).click();
  await expect.poll(() => calls.runs.length).toBe(1);
  expect(calls.archive).toBe(1);
  expect(calls.runs[0].action).toBe('review');
  expect(String(calls.runs[0].answer)).toContain(ARCHIVED[0]);
});
