import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';

interface MarkdownNode {
  type: string;
  depth?: number;
  url?: string;
  value?: string;
  children?: MarkdownNode[];
  position?: { start: { offset?: number }; end: { offset?: number } };
}

export interface LiteraturePaper {
  id: string;
  title: string;
  problem: string;
  method: string;
  scenario: string;
  sources: string[];
  fields: { label: string; markdown: string }[];
}

function text(node: MarkdownNode): string {
  if (node.type === 'html') return ' ';
  return node.value ?? node.children?.map(text).join('') ?? '';
}

/** Derive a view from the report, without creating a second source of truth. */
export function parseLiteratureReport(content: string): LiteraturePaper[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(content);
  const papers: LiteraturePaper[] = [];
  for (const block of tree.children) {
    if (block.type !== 'table' || block.children.length < 2) continue;
    const labels = block.children[0].children.map((cell) => text(cell).trim());
    const titleIndex = labels.findIndex((label) => /论文|paper|title/i.test(label));
    if (titleIndex < 0 || !labels.some((label) => /方法|method/i.test(label))) continue;
    const problemIndex = labels.findIndex((label) => /解决的问题|研究问题|problem/i.test(label));
    const methodIndex = labels.findIndex((label) => /方法|method/i.test(label));
    const scenarioIndex = labels.findIndex((label) => /研究场景|scenario|setting/i.test(label));
    for (const row of block.children.slice(1)) {
      const title = text(row.children[titleIndex] ?? { type: 'text' }).trim();
      if (!title) continue;
      const fields = labels.map((label, index) => {
        const cell = row.children[index];
        // GFM cell positions include table delimiters; child spans contain only content.
        const start = cell?.children[0]?.position?.start.offset;
        const end = cell?.children.at(-1)?.position?.end.offset;
        return {
          label,
          markdown:
            start !== undefined && end !== undefined ? content.slice(start, end).trim() : '',
        };
      });
      papers.push({
        id: `paper-${papers.length}`,
        title,
        problem:
          problemIndex < 0 ? '' : text(row.children[problemIndex] ?? { type: 'text' }).trim(),
        method: text(row.children[methodIndex] ?? { type: 'text' }).trim(),
        scenario: text(row.children[scenarioIndex] ?? { type: 'text' }).trim(),
        sources: row.children.flatMap((cell) => links(cell)),
        fields,
      });
    }
  }
  return papers;
}

function links(node: MarkdownNode): string[] {
  return [
    ...(node.type === 'link' && node.url ? [node.url] : []),
    ...(node.children ?? []).flatMap(links),
  ];
}

export interface ReportSection {
  id: string;
  title: string;
  markdown: string;
  text: string;
}

/** Preserve existing report sections, including subheadings and evidence links. */
export function reportSections(content: string): ReportSection[] {
  const blocks = unified().use(remarkParse).use(remarkGfm).parse(content).children;
  return blocks.flatMap((block, index) => {
    if (block.type !== 'heading' || block.depth !== 2) return [];
    const next = blocks
      .slice(index + 1)
      .find((entry) => entry.type === 'heading' && entry.depth <= 2);
    const start = block.position?.end.offset ?? 0;
    const end = next?.position?.start.offset ?? content.length;
    const body = blocks
      .slice(index + 1)
      .filter((entry) => (entry.position?.start.offset ?? 0) < end);
    return [
      {
        id: `section-${index}`,
        title: text(block),
        markdown: content.slice(start, end).trim(),
        text: body.map(text).join('\n'),
      },
    ];
  });
}

export function gapEvidence(section: ReportSection, papers: LiteraturePaper[]): string[] {
  return mentionedPapers(section.text, section.markdown, papers).map((paper) => paper.id);
}

function mentionedPapers(value: string, markdown: string, papers: LiteraturePaper[]) {
  value = value.toLocaleLowerCase();
  return papers.filter((paper) => {
    // Only explicit identifiers, source links or named titles establish evidence edges.
    const title = paper.title.replace(/[,，(（]\s*(?:19|20)\d{2}.*$/, '').trim();
    const alias = paper.title.match(/^([A-Z]{1,3}\d+)\b/i)?.[1];
    return (
      (title.length >= 5 && value.includes(title.toLocaleLowerCase())) ||
      paper.sources.some((source) => markdown.includes(source)) ||
      (!!alias && new RegExp(`\\b${alias}\\b`, 'i').test(value))
    );
  });
}

export interface PaperRelation {
  id: string;
  source: string;
  target: string;
  evidence: { label: string; section: string; markdown: string }[];
}

/** Use explicitly grouped comparisons in the existing report, never similarity guesses. */
export function paperRelations(content: string, papers: LiteraturePaper[]): PaperRelation[] {
  const blocks = unified().use(remarkParse).use(remarkGfm).parse(content).children;
  const relations = new Map<string, PaperRelation>();
  const headings = new Map<number, string>();
  const add = (block: MarkdownNode, label: string, section: string) => {
    const markdown = content.slice(block.position?.start.offset, block.position?.end.offset);
    const mentions = mentionedPapers(text(block), markdown, papers);
    for (let i = 0; i < mentions.length; i++) {
      for (const target of mentions.slice(i + 1)) {
        const source = mentions[i];
        const id = `relation:${source.id}:${target.id}`;
        const relation = relations.get(id) || {
          id,
          source: source.id,
          target: target.id,
          evidence: [],
        };
        if (!relation.evidence.some((entry) => entry.markdown === markdown)) {
          relation.evidence.push({ label, section, markdown });
        }
        relations.set(id, relation);
      }
    }
  };
  for (const block of blocks) {
    if (block.type === 'heading') {
      for (const depth of headings.keys()) if (depth >= block.depth!) headings.delete(depth);
      headings.set(block.depth!, text(block));
      continue;
    }
    const section = [...headings.values()].join(' / ');
    // Scope narrowly: a shared citation in a gap, risk list or bibliography
    // does not by itself establish a paper-to-paper relationship.
    if (
      !/领域图谱|文献关系|论文关系|方法谱系|关系分析|方法对比|paper relationships|method comparisons/i.test(
        section,
      )
    )
      continue;
    if (block.type === 'list') {
      for (const item of block.children || []) {
        const paragraph = item.children?.find((child) => child.type === 'paragraph');
        const label = paragraph?.children?.find((child) => child.type === 'strong');
        if (label) add(item, text(label).replace(/[：:]$/, ''), section);
      }
    } else if (block.type === 'paragraph') {
      add(block, headings.get(3) || headings.get(2) || '报告对比', section);
    }
  }
  return [...relations.values()];
}
