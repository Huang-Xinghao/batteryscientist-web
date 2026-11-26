import { expect, test } from '@playwright/test';
import { artifactStage } from '../src/features/workbench/artifactStages';

test('deliverables belong to research stages while sources and temporary files stay hidden', () => {
  const expected = {
    'literature/RESEARCH_REPORT.md': 'literature',
    'data-search/DATA_REPORT.md': 'data_search',
    'idea-stage/IDEA_REPORT.md': 'ideas',
    'refine-logs/FINAL_PROPOSAL.md': 'refine',
    'refine-logs/EXPERIMENT_PLAN.md': 'experiment_plan',
    'refine-logs/EXPERIMENT_RESULTS.md': 'experiment_bridge',
    'results/overall_mae_table.md': 'experiment_bridge',
    'PAPER_PLAN.md': 'paper_plan',
    'figures/figure1.pdf': 'paper_figure',
    'paper/discussion.md': 'paper_write',
    'paper/main.pdf': 'paper_compile',
    'paper/review_round1.md': 'improvement',
  };
  for (const [path, stage] of Object.entries(expected))
    expect(artifactStage(path), path).toBe(stage);
  for (const path of [
    'paper/main.tex',
    'scripts/train.py',
    'results/metrics.csv',
    'workflow-state.json',
    'experiments/template/README.md',
    'refine-logs/archives/old.md',
    'figures/previews/page.png',
    '.batteryscientist/internal.md',
    'README.md',
  ])
    expect(artifactStage(path), path).toBeUndefined();
});

test('stage selector lists only deliverables without nesting physical folders or exposing code', async ({
  page,
}) => {
  const paths = [
    'literature/RESEARCH_REPORT.md',
    'refine-logs/EXPERIMENT_PLAN.md',
    'refine-logs/EXPERIMENT_RESULTS.md',
    'results/overall_mae_table.md',
    'figures/figure1.png',
    'paper/main.pdf',
    'paper/main.tex',
    'scripts/train.py',
    'experiments/template/README.md',
    'figures/previews/page.png',
  ];
  await page.route('**/api/projects/*/files', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      json: {
        ...(await response.json()),
        files: paths.map((path) => ({
          path,
          size: 100,
          modified: 1,
        })),
      },
    });
  });
  await page.goto('/');
  await page.locator('a.project-card').filter({ hasText: 'battery-study' }).click();
  await page.locator('.artifact-directory .ant-select-selector').click();
  const popup = page.locator('.artifact-directory-popup');
  await expect(popup).toContainText('阶段产物');
  await expect(popup.locator('.directory-group')).toContainText([
    '文献研究',
    '实验规划',
    '实验执行',
    '论文绘图',
    '编译交付',
  ]);
  await expect(popup.locator('.directory-file')).toHaveCount(6);
  await expect(popup.locator('.directory-folder')).toHaveCount(0);
  await expect(popup).not.toContainText('main.tex');
  await expect(popup).not.toContainText('train.py');
  await expect(popup).not.toContainText('README.md');
  await expect(page.getByRole('button', { name: '论文编辑器' })).toHaveCount(0);
  await popup.locator('.directory-file').filter({ hasText: 'RESEARCH_REPORT.md' }).click();
  await expect(page.getByRole('region', { name: '文献研究图谱', exact: true })).toBeVisible();
  await page.locator('.artifact-directory .ant-select-selector').click();
  await popup.locator('.directory-file').filter({ hasText: 'main.pdf' }).click();
  await expect(page.locator('.pdf-preview')).toBeVisible();
  await expect(page.locator('.monaco-editor')).toHaveCount(0);
});
