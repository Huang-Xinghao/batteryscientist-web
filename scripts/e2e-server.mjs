import { Buffer } from 'node:buffer';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = await mkdtemp(join(tmpdir(), 'batteryscientist-e2e-'));
const projects = join(root, 'projects');
const project = join(projects, 'battery-study');
const wiki = join(root, 'wiki');
const battery = join(root, 'battery');
await mkdir(join(wiki, 'papers'), { recursive: true });
await mkdir(join(battery, '电芯'), { recursive: true });
await writeFile(join(wiki, 'index.md'), '# 范式索引\n\n[论文示例](papers/example.md)');
await writeFile(
  join(wiki, 'papers', 'example.md'),
  '---\ntitle: metadata-hidden\nnode_id: paper:example\nmethod: ["Transformer"]\n---\n# 时序预测范式\n\n跨电芯泛化与数据划分证据。\n\n[返回索引](../index.md)',
);
await mkdir(join(wiki, 'ideas'), { recursive: true });
await mkdir(join(wiki, 'graph'), { recursive: true });
await writeFile(
  join(wiki, 'ideas', 'example.md'),
  '---\nnode_id: idea:example\n---\n# 跨电芯迁移思路\n\n与时序预测相关的研究思路。',
);
await writeFile(
  join(wiki, 'graph', 'edges.jsonl'),
  JSON.stringify({
    from: 'idea:example',
    to: 'paper:example',
    type: 'inspired_by',
    evidence: '源于论文',
  }),
);
await writeFile(
  join(battery, '资源库总览.md'),
  '# 电池资源总览\n\n[查看 Tongji 数据集](电芯/Tongji.md)',
);
await writeFile(join(battery, '电芯', 'Tongji.md'), '# Tongji 数据集\n\n寿命标签与容量规范。');
await mkdir(join(wiki, 'figures', 'example'), { recursive: true });
await writeFile(
  join(wiki, 'figures', 'example', 'fig1.md'),
  '# Figure 1\n\nSource: paper:example\nPDF page: 3\n\nFigure 1: 跨电芯容量预测结果与真实值。',
);
await writeFile(
  join(wiki, 'figures', 'example', 'fig1.png'),
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNImJAAAAKkAVGGz9iWAAAAAElFTkSuQmCC',
    'base64',
  ),
);
await mkdir(join(project, 'literature'), { recursive: true });
await writeFile(
  join(project, 'literature', 'RESEARCH_REPORT.md'),
  '# 电池寿命研究\n\n这是用于浏览器测试的隔离报告。\n\n## 研究证据\n\n需要验证跨电芯泛化。\n\n$E = mc^2$\n',
);
await writeFile(
  join(project, 'workflow-state.json'),
  JSON.stringify({
    run_id: 'browser-fixture',
    project_goal: '研究退役电池的寿命预测与跨电芯泛化',
    mode: 'expert',
    status: 'awaiting_user',
    current_node: 'literature',
    history: [{ node: 'literature', timestamp: new Date().toISOString() }],
    expert_checkpoint: {
      node: 'literature',
      summary: '已有证据提示跨电芯泛化值得进一步验证。',
      questions: ['优先研究哪一个泛化问题？'],
      report: 'literature/RESEARCH_REPORT.md',
      files: ['literature/RESEARCH_REPORT.md'],
      status: 'pending',
      next_node: 'data_search',
    },
  }),
);

await mkdir(join(project, 'paper'), { recursive: true });
await mkdir(join(project, 'figures'), { recursive: true });
await writeFile(
  join(project, 'paper', 'main.tex'),
  '\\documentclass{article}\n\\begin{document}\nResearch paper\n\\end{document}\n',
);
await writeFile(join(project, 'paper', 'main.pdf'), '%PDF-1.4\n%%EOF\n');
await writeFile(
  join(project, 'figures', 'test.png'),
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQ0AAAAASUVORK5CYII=',
    'base64',
  ),
);
const python =
  process.env.BATTERYSCIENTIST_RUNTIME_PYTHON || '/data/apps/micromamba/envs/xinghao/bin/python';
const backend =
  process.env.BATTERYSCIENTIST_BACKEND_DIR ||
  fileURLToPath(new URL('../../batteryscientist', import.meta.url));
const child = spawn(python, ['-m', 'batteryscientist.api.app'], {
  cwd: backend,
  stdio: 'inherit',
  env: {
    ...process.env,
    BATTERYSCIENTIST_PROJECT_ROOTS: projects,
    BATTERYSCIENTIST_WEB_DATA: join(root, 'metadata'),
    BATTERYSCIENTIST_API_PORT: process.env.BATTERYSCIENTIST_E2E_API_PORT || '8001',
    BATTERYSCIENTIST_WIKI_ROOT: wiki,
    BATTERYSCIENTIST_BATTERY_ROOT: battery,
  },
});
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
child.on('exit', async (code) => {
  await rm(root, { recursive: true, force: true });
  process.exit(code || 0);
});
