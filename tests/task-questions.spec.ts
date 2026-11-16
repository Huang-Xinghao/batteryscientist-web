import { expect, test } from '@playwright/test';

test('task question survives refresh and answers the original task while preserving rejected drafts', async ({
  page,
}) => {
  const question = {
    id: 'a'.repeat(32),
    task_id: 'original-task',
    role: 'main',
    phase: 'coordinator',
    question: '请选择当前任务的研究路线',
    options: ['方案 A', '方案 B'],
    status: 'awaiting_user',
    live: true,
    created_at: new Date().toISOString(),
  };
  let answered = false;
  let attempts = 0;
  const bodies: unknown[] = [];
  await page.route(/\/api\/projects\/[^/?]+$/, async (route) => {
    const response = await route.fetch();
    const project = await response.json();
    await route.fulfill({
      response,
      json: {
        ...project,
        status: 'running',
        pending_questions: answered ? [] : [question],
      },
    });
  });
  await page.route('**/api/projects/*/questions/*/answer', async (route) => {
    bodies.push(route.request().postDataJSON());
    attempts++;
    if (attempts === 1)
      await route.fulfill({ status: 409, json: { detail: '版本校验失败，请核查' } });
    else {
      answered = true;
      await route.fulfill({ json: { status: 'answered' } });
    }
  });
  await page.goto('/');
  await page.locator('a.project-card').filter({ hasText: 'battery-study' }).click();
  await expect(page.getByRole('article', { name: '任务提问' })).toBeVisible();
  await page.reload();
  await expect(page.getByText(question.question)).toBeVisible();
  await page.getByRole('button', { name: '方案 B', exact: true }).click();
  await expect(page.getByLabel('任务回答')).toHaveValue('方案 B');
  await page.getByRole('button', { name: '回答并继续原任务' }).click();
  await expect(page.getByText('版本校验失败，请核查')).toBeVisible();
  await expect(page.getByLabel('任务回答')).toHaveValue('方案 B');
  await page.getByRole('button', { name: '回答并继续原任务' }).click();
  await expect(page.getByRole('article', { name: '任务提问' })).toHaveCount(0);
  expect(bodies).toEqual([
    { task_id: 'original-task', answer: '方案 B' },
    { task_id: 'original-task', answer: '方案 B' },
  ]);
});

test('stopping task disables its question form', async ({ page }) => {
  await page.route(/\/api\/projects\/[^/?]+$/, async (route) => {
    const response = await route.fetch();
    const project = await response.json();
    await route.fulfill({
      response,
      json: {
        ...project,
        status: 'stopping',
        pending_questions: [
          {
            id: 'b'.repeat(32),
            task_id: 'stopping-task',
            role: 'experiment',
            phase: 'experiment_plan',
            question: '停止中的问题',
            options: ['A'],
            status: 'awaiting_user',
            live: true,
            created_at: new Date().toISOString(),
          },
        ],
      },
    });
  });
  await page.goto('/');
  await page.locator('a.project-card').filter({ hasText: 'battery-study' }).click();
  await expect(page.getByLabel('任务回答')).toBeDisabled();
  await expect(page.getByRole('button', { name: '任务正在停止', exact: true })).toBeDisabled();
});
