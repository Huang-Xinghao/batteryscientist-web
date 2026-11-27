import type { ProjectFile } from '../../api/client';
import { reports } from './stages';

export const artifactStages = [
  { id: 'literature', label: '文献研究' },
  { id: 'data_search', label: '数据检索' },
  { id: 'ideas', label: '创意生成' },
  { id: 'refine', label: '研究精炼' },
  { id: 'experiment_plan', label: '实验规划' },
  { id: 'experiment_bridge', label: '实验执行' },
  { id: 'paper_plan', label: '论文规划' },
  { id: 'paper_figure', label: '论文绘图' },
  { id: 'paper_write', label: '论文写作' },
  { id: 'paper_compile', label: '编译交付' },
  { id: 'improvement', label: '审阅改进' },
];

/** Classify existing deliverables for display; physical files stay in place. */
export function artifactStage(path: string): string | undefined {
  const p = path.replaceAll('\\', '/').toLowerCase();
  if (!/\.(md|tex|bib|pdf|png|jpe?g|webp|gif|svg)$/i.test(p)) return;
  if (
    /(?:^|\/)(?:\.[^/]+|node_modules|__pycache__|templates?|archives?|previews?|cache|tmp|temp|checkpoints?)(?:\/|$)/.test(
      p,
    )
  )
    return;
  const exact = Object.entries(reports).find(([, report]) => report.toLowerCase() === p);
  if (exact) return exact[0];
  if (/^literature\//.test(p) || /^(references|papers)\//.test(p)) return 'literature';
  if (/^data[-_]search\//.test(p)) return 'data_search';
  if (/^idea[-_]stage\//.test(p)) return 'ideas';
  if (/^refine[-_]logs\//.test(p)) {
    if (/experiment_plan/.test(p)) return 'experiment_plan';
    if (/experiment|code_review/.test(p)) return 'experiment_bridge';
    return 'refine';
  }
  if (/^(experiments?|results?|smoke-results|experiment-runs)\//.test(p))
    return 'experiment_bridge';
  if (/^(figures?|images?|plots?|charts?)\//.test(p)) return 'paper_figure';
  if (/^paper\//.test(p)) {
    if (/\.(png|jpe?g|webp|gif|svg)$/.test(p)) return 'paper_figure';
    if (/review|improvement|revision/.test(p)) return 'improvement';
    if (/delivery|\.pdf$/.test(p)) return 'paper_compile';
    return 'paper_write';
  }
  if (/paper[_-]?plan/.test(p)) return 'paper_plan';
  if (/\.pdf$/.test(p)) return 'paper_compile';
  if (/\.(png|jpe?g|webp|gif|svg)$/.test(p)) return 'paper_figure';
  // Unattributed root notes and repository documentation are not stage outputs.
}

export function stageArtifacts(files: ProjectFile[]) {
  return files.filter((file) => artifactStage(file.path));
}
