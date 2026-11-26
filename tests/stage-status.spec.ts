import { expect, test } from '@playwright/test';
import type { Project } from '../src/api/client';
import { stageStatuses } from '../src/features/workbench/stageStatus';

const nodes = ['paper_write', 'paper_compile', 'improvement'].map((id) => ({ id, label: id }));
function project(
  history: string[],
  paper_status = 'pending',
  status = 'completed',
  current_node = 'improvement',
): Project {
  return {
    id: 'fixture',
    name: 'fixture',
    path: '/fixture',
    created_at: '',
    checkpoint_token: '',
    status,
    progress: {},
    runs: [],
    state: { status, current_node, paper_status, history: history.map((node) => ({ node })) },
  };
}
test('successful improvement compilation completes the compile stage without standalone history', () => {
  expect(stageStatuses(project(['paper_write', 'improvement'], 'pdf_ready'), nodes)).toEqual({
    paper_write: 'done',
    paper_compile: 'done',
    improvement: 'done',
  });
  expect(
    stageStatuses(project(['paper_write', 'paper_compile', 'improvement'], 'pdf_ready'), nodes)
      .paper_compile,
  ).toBe('done');
});
test('completion alone or an unverified PDF never implies compilation', () => {
  expect(stageStatuses(project(['paper_write']), nodes).paper_compile).toBe('pending');
  expect(stageStatuses(project(['paper_write', 'improvement']), nodes).paper_compile).toBe(
    'pending',
  );
  expect(stageStatuses(project(['paper_write'], 'pdf_ready'), nodes).paper_compile).toBe('pending');
});
test('active compile reruns, errors and review take precedence over earlier completion', () => {
  for (const [status, expected] of [
    ['running', 'running'],
    ['failed', 'failed'],
    ['interrupted', 'stopped'],
    ['awaiting_user', 'review'],
  ]) {
    const value = project(['paper_write', 'improvement'], 'pdf_ready', status, 'paper_compile');
    expect(stageStatuses(value, nodes).paper_compile).toBe(expected);
  }
});
test('coordinator follow-ups preserve research stages while real delegated reruns light up', () => {
  const value = project(['paper_write', 'improvement'], 'pdf_ready', 'running');
  value.state.status = 'completed';
  value.progress = { current_node: 'paper_compile', status: 'completed' };
  value.runs = [
    { id: 'chat', status: 'running', created_at: '', options: { action: 'coordinate' } },
  ];
  value.agents = [{ role: 'main', phase: 'coordinator', is_active: true }];
  expect(stageStatuses(value, nodes)).toEqual({
    paper_write: 'done',
    paper_compile: 'done',
    improvement: 'done',
  });
  value.status = 'failed';
  expect(stageStatuses(value, nodes).paper_compile).toBe('done');
  value.status = 'running';
  value.agents = [{ role: 'paper_writer', phase: 'paper_write', is_active: true }];
  expect(stageStatuses(value, nodes).paper_write).toBe('running');
  expect(stageStatuses(value, nodes).paper_compile).toBe('done');
  value.agents[0].phase = 'paper_compile';
  expect(stageStatuses(value, nodes).paper_compile).toBe('running');
});
test('completed paper shows compile delivery as complete and opens its PDF', async ({ page }) => {
  await page.route(/\/api\/projects\/[^/?]+$/, async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    const completed = [
      'literature',
      'data_search',
      'ideas',
      'refine',
      'experiment_plan',
      'experiment_bridge',
      'paper_plan',
      'paper_figure',
      'paper_write',
      'improvement',
    ];
    await route.fulfill({
      response,
      json: {
        ...data,
        status: 'completed',
        progress: {},
        state: {
          ...data.state,
          status: 'completed',
          current_node: 'improvement',
          paper_status: 'pdf_ready',
          expert_checkpoint: null,
          history: completed.map((node) => ({ node })),
        },
      },
    });
  });
  await page.goto('/');
  await page
    .getByRole('link')
    .filter({ has: page.getByRole('heading', { name: 'battery-study' }) })
    .click();
  const stage = page.getByRole('button', { name: '编译交付，已完成', exact: true });
  await expect(stage).toBeVisible();
  await expect(stage).toHaveClass(/is-done/);
  await expect(page.getByRole('region', { name: '研究进度' })).toContainText('全部阶段已完成');
  await stage.click();
  await expect(page.locator('.pdf-preview')).toBeVisible();
  await expect(page.locator('.artifact-toolbar')).toHaveCount(0);
});
