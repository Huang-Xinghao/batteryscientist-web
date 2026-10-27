import { expect, test } from '@playwright/test';
import { artifactCategory } from '../src/features/workbench/artifactCategories';

test('keeps figure sources and images together across project directories', () => {
  for (const path of [
    'figures/table_1_main.tex',
    'figures/latex_includes.tex',
    'figures/figure_3_results.pdf',
    'figures/figure_plan.md',
    'figures/render.py',
    'paper/figures/figure1.pdf',
    'paper/images/overview.PNG',
    'results/final/6_summary/figure3_results.png',
    'experiment-runs/run1/plot.jpg',
    'misc/preview.tiff',
    'misc/preview.webp',
  ])
    expect(artifactCategory(path), path).toBe('figures');
  for (const path of [
    'paper/main.tex',
    'paper/sections/method.tex',
    'paper/main.pdf',
    'paper/build/main.pdf',
    'main.pdf',
    'paper/references.bib',
  ])
    expect(artifactCategory(path), path).toBe('paper');
  for (const path of [
    'papers/arxiv/2605.27044.pdf',
    'references/source.pdf',
    'literature/papers/source.pdf',
  ])
    expect(artifactCategory(path), path).toBe('references');
  expect(artifactCategory('results/metrics.csv')).toBe('data');
  expect(artifactCategory('experiment-runs/run1/output.log')).toBe('logs');
  expect(artifactCategory('literature/RESEARCH_REPORT.md')).toBe('reports');
  expect(artifactCategory('scripts/render.py')).toBe('code');
  expect(artifactCategory('misc/archive.zip')).toBe('other');
});
