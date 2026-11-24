import { expect, test, type Page } from '@playwright/test';
import {
  gapEvidence,
  parseLiteratureReport,
  reportSections,
} from '../src/features/workbench/literature/report';
import { researchActions } from '../src/features/workbench/literature/trace';
import type { ActivityEvent } from '../src/api/client';

const report = `# 领域研究报告

## 1. 研究范围与证据覆盖
只使用 Wiki 证据，未核验原始 PDF。

## 2. 相关工作对照表
| 论文（标题，年份） | 发表 venue | 方法 | 研究场景 | 解决的问题 |
|---|---|---|---|---|
| [**Battery A**, 2025](literature/papers/battery-a.md) | Nature Energy | Transformer \\| transfer | 跨电芯寿命 | 跨电芯泛化 |
| Battery B, 2024 | 预印本 | 线性回归 | 容量预测 | 容量估计 |
| P1: Battery C, 2023 | Journal | 物理模型 | 寿命预测 | |

## 4. gap
Battery A 尚未解决新工况下区间可靠性；此判断仍需验证。

## 5. 为什么这个gap重要
为新工况下的电芯筛选提供可信依据。
`;
const event = (
  id: number,
  kind: string,
  data: Record<string, unknown>,
  run_id = 'lit-run',
): ActivityEvent => ({
  id,
  project_id: 'fixture',
  run_id,
  kind,
  data,
  created_at: `2026-11-24T13:00:${String(id).padStart(2, '0')}Z`,
});
const events = [
  event(1, 'tool_start', {
    phase: 'literature',
    tool: 'search_wiki',
    call_id: 'search',
    arguments: JSON.stringify({ query: 'battery generalization' }),
  }),
  event(2, 'tool_end', {
    phase: 'literature',
    tool: 'search_wiki',
    call_id: 'search',
    output: JSON.stringify({
      matches: [
        { title: 'Battery A', wiki_path: 'literature/papers/battery-a.md' },
        { title: 'Candidate only', wiki_path: 'papers/candidate.md' },
      ],
    }),
  }),
  event(3, 'tool_start', {
    phase: 'literature',
    tool: 'read_wiki',
    call_id: 'read',
    arguments: { wiki_path: 'literature/papers/battery-a.md' },
  }),
  event(4, 'tool_end', {
    phase: 'literature',
    tool: 'read_wiki',
    call_id: 'read',
    output: '{"title":"Battery A"}',
  }),
];
test('existing report preserves Markdown and derives only explicit gap evidence', () => {
  const papers = parseLiteratureReport(report);
  expect(papers).toHaveLength(3);
  expect(papers[0].fields[2].markdown).toBe('Transformer \\| transfer');
  expect(papers[0].sources).toEqual(['literature/papers/battery-a.md']);
  const gaps = reportSections(report).filter((section) => section.title === '4. gap');
  expect(gaps).toHaveLength(1);
  expect(gapEvidence(gaps[0], papers)).toEqual(['paper-0']);
  expect(
    gapEvidence({ ...gaps[0], text: 'P1 指出尚需验证', markdown: 'P1 指出尚需验证' }, papers),
  ).toEqual(['paper-2']);
  expect(
    gapEvidence({ ...gaps[0], text: 'P10 尚需验证', markdown: 'P10 尚需验证' }, papers),
  ).toEqual([]);
  expect(parseLiteratureReport('```markdown\n' + report + '\n```')).toEqual([]);
  expect(parseLiteratureReport('# 报告正在生成\n\n| 论文 | 方法 |\n')).toEqual([]);
});
test('trace separates runs, failed/truncated searches and literature scope', () => {
  const actions = researchActions([
    ...events,
    event(5, 'tool_start', {
      phase: 'ideas',
      tool: 'search_wiki',
      call_id: 'ideas',
      arguments: { query: 'ignore' },
    }),
    event(
      6,
      'tool_start',
      {
        phase: 'literature',
        tool: 'search_wiki',
        call_id: 'search',
        arguments: { query: 'another run' },
      },
      'different-run',
    ),
    event(
      7,
      'tool_end',
      {
        phase: 'literature',
        tool: 'search_wiki',
        call_id: 'search',
        output: '{"matches": [',
        truncated: true,
      },
      'different-run',
    ),
    event(8, 'tool_start', {
      phase: 'literature',
      tool: 'search_wiki',
      call_id: 'failure',
      arguments: { query: 'failed' },
    }),
    event(9, 'tool_end', {
      phase: 'literature',
      tool: 'search_wiki',
      call_id: 'failure',
      is_error: true,
      output: 'error',
    }),
  ]);
  expect(actions).toHaveLength(4);
  expect(actions[0].candidates).toHaveLength(2);
  expect(actions[1].kind).toBe('read');
  expect(actions[2].resultsAvailable).toBe(false);
  expect(actions[3].status).toBe('error');
});
async function open(page: Page, width: number) {
  await page.goto('/');
  await page
    .getByRole('link')
    .filter({ has: page.getByRole('heading', { name: 'battery-study' }) })
    .click();
  if (width <= 700) await page.getByRole('button', { name: '产物工作区', exact: true }).click();
}
for (const width of [1512, 360]) {
  test(`research journey is the default, uses goal and tool receipts, and preserves report download at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route(/\/api\/projects\/[^/]+\/file\?/, async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, json: { ...(await response.json()), content: report } });
    });
    await page.route('**/api/projects/*/activity?*', async (route) => {
      const projectId = new URL(route.request().url()).pathname.split('/')[3];
      await route.fulfill({
        json: {
          has_more: false,
          events: events.map((entry) => ({ ...entry, project_id: projectId })),
        },
      });
    });
    await open(page, width);
    const journey = page.getByRole('region', { name: '文献研究图谱', exact: true });
    await expect(journey).toBeVisible();
    await expect(page.locator('.markdown-reading')).toHaveCount(0);
    await expect(page.locator('.artifact-actions .ant-segmented-item')).toHaveCount(0);
    await expect(journey.locator('.kind-goal')).toContainText('研究退役电池的寿命预测与跨电芯泛化');
    await expect(journey.locator('.kind-search')).toContainText('battery generalization');
    await expect(journey.locator('.kind-paper')).toHaveCount(3);
    await expect(journey.locator('.kind-problem')).toHaveCount(3);
    await expect(journey.locator('.kind-gap')).toHaveCount(1);
    await expect(journey.locator('.react-flow__edge[data-id="action-1:paper-0"]')).toHaveCount(1);
    await expect(
      journey.locator('.react-flow__edge[data-id="paper-0:problem-paper-0"]'),
    ).toHaveCount(1);
    await expect(
      journey.locator('.react-flow__edge').filter({ hasText: 'Gap 提及该文献' }),
    ).toHaveCount(1);
    await expect(journey.locator('.kind-paper').first()).toContainText('已读取 Wiki');
    await journey.locator('.kind-paper').first().click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toContainText('Transformer | transfer');
    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();
    await journey.locator('.kind-search').click();
    await expect(page.getByRole('dialog')).toContainText('Candidate only');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await page.locator('.artifact-content').evaluate((element) => {
      element.scrollTop = 0;
    });
    await expect(page.getByRole('link', { name: '下载文件' })).toHaveAttribute(
      'href',
      /RESEARCH_REPORT/,
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `artifacts/research-journey-${width}.png`, fullPage: true });
  });
}
test('legacy report shows missing trace and gap honestly', async ({ page }) => {
  await page.route('**/api/projects/*/activity?*', (route) =>
    route.fulfill({ json: { events: [], has_more: false } }),
  );
  await open(page, 1512);
  const journey = page.getByLabel('文献研究图谱', { exact: true });
  await expect(journey).toContainText('尚无可用检索回执');
  await expect(journey).toContainText('等待 Agent 形成 Gap 判断');
  await expect(page.locator('.markdown-reading')).toHaveCount(0);
});

test('goal and recorded actions remain visible before the report exists', async ({ page }) => {
  await page.route(/\/api\/projects\/[^/]+\/file\?/, (route) =>
    route.fulfill({ status: 404, json: { detail: '文件尚未生成' } }),
  );
  await open(page, 1512);
  await expect(page.locator('.kind-goal')).toContainText('研究退役电池');
  await expect(page.getByText('报告暂不可用', { exact: true })).toHaveCount(0);
  await expect(page.getByText('报告尚未生成，检索进展将持续显示。')).toBeVisible();
  await expect(page.locator('.kind-goal')).toBeVisible();
  await expect(page.locator('.markdown-reading')).toHaveCount(0);
});

test('missing report stays quiet during searches and loads automatically after it is written', async ({
  page,
}) => {
  let written = false;
  let requests = 0;
  let publish!: () => void;
  const saved = new Promise<void>((resolve) => {
    publish = resolve;
  });
  await page.route(/\/api\/projects\/[^/]+\/file\?/, async (route) => {
    requests++;
    await route.fulfill(
      written
        ? {
            json: {
              kind: 'text',
              path: 'literature/RESEARCH_REPORT.md',
              content: report,
              editable: true,
              sha256: 'written',
            },
          }
        : { status: 404, json: { detail: '文件不存在或不可访问' } },
    );
  });
  await page.route('**/api/projects/*/activity?*', async (route) => {
    const projectId = new URL(route.request().url()).pathname.split('/')[3];
    await route.fulfill({
      json: {
        events: events.map((entry) => ({ ...entry, project_id: projectId })),
        has_more: false,
      },
    });
  });
  await page.route('**/api/projects/*/events?*', async (route) => {
    await saved;
    const projectId = new URL(route.request().url()).pathname.split('/')[3];
    await route.fulfill({
      contentType: 'text/event-stream',
      body: `id: 100\ndata: ${JSON.stringify({ ...event(100, 'file_saved', { path: 'literature/RESEARCH_REPORT.md' }), project_id: projectId })}\n\n`,
    });
  });
  await open(page, 1512);
  await expect(page.getByText('报告尚未生成，检索进展将持续显示。')).toBeVisible();
  await expect(page.locator('.kind-search')).toContainText('battery generalization');
  await expect(page.getByText('报告暂不可用', { exact: true })).toHaveCount(0);
  await expect(page.getByText('文件不存在或不可访问', { exact: true })).toHaveCount(0);
  expect(requests).toBeGreaterThan(0);
  written = true;
  publish();
  await expect(page.locator('.kind-paper')).toHaveCount(3);
  await expect(page.locator('.kind-gap')).toContainText('区间可靠性');
  await expect(page.getByText('报告尚未生成，检索进展将持续显示。')).toHaveCount(0);
});

test('real report failures remain visible and can be retried', async ({ page }) => {
  let failed = true;
  await page.route(/\/api\/projects\/[^/]+\/file\?/, (route) =>
    route.fulfill(
      failed
        ? { status: 500, json: { detail: '报告读取服务异常' } }
        : {
            json: {
              kind: 'text',
              path: 'literature/RESEARCH_REPORT.md',
              content: report,
              editable: true,
              sha256: 'recovered',
            },
          },
    ),
  );
  await open(page, 1512);
  await expect(page.getByText('报告暂不可用', { exact: true })).toBeVisible();
  await expect(page.getByText('报告读取服务异常', { exact: true })).toBeVisible();
  await expect(page.getByText('报告尚未生成，检索进展将持续显示。')).toHaveCount(0);
  failed = false;
  await page.getByRole('button', { name: /重\s*试/, exact: true }).click();
  await expect(page.locator('.kind-paper')).toHaveCount(3);
  await expect(page.getByText('报告暂不可用', { exact: true })).toHaveCount(0);
});

for (const width of [1512, 360]) {
  test(`progress folds and the compact status frees conversation space at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page, width);
    if (width <= 700) await page.getByRole('button', { name: '研究对话', exact: true }).click();
    const conversation = page.getByRole('region', { name: '研究对话', exact: true });
    const initial = (await conversation.boundingBox())!.height;
    await expect(page.locator('.agent-status-bar')).toBeVisible();
    expect((await page.locator('.agent-status-bar').boundingBox())!.height).toBeLessThan(60);
    await expect(page.getByText('研究团队', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: '收起研究进度' }).click();
    await expect(page.getByRole('button', { name: '展开研究进度' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await expect(page.locator('.charge-track-scroll')).toBeHidden();
    expect((await conversation.boundingBox())!.height).toBeGreaterThan(initial);
    await page.getByRole('button', { name: '展开研究进度' }).click();
    await expect(page.locator('.charge-track-scroll')).toBeVisible();
  });
}
