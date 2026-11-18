import type { Edge, Node } from '@xyflow/react';
import { seedSourceHash, timeSetDetails } from './timeSetSeed';
import { exportReview, type ProposalReview } from './reviewModel';

export const proposalPath = 'refine-logs/FINAL_PROPOSAL.md';
export const fields = {
  title: '模块名称',
  purpose: '它解决什么问题',
  input: '需要哪些输入',
  steps: '具体怎样处理',
  output: '交给下游什么',
  parameters: '关键设置',
  limits: '哪些事情还不能确定',
  example: '用一个例子理解',
} as const;
export type ContentField = keyof typeof fields;
export type ModuleData = Record<ContentField, string> & {
  sourceContent: string;
  disabled: boolean;
  needsReview: boolean;
  [key: string]: unknown;
};
export type ModuleNode = Node<ModuleData, 'module'>;
export type CanvasDraft = {
  version: 1;
  sourceHash: string;
  nodes: ModuleNode[];
  edges: Edge[];
  changes: string[];
  review?: ProposalReview;
};
export type RevisionInfo = {
  id: string;
  summary: string;
  impacts: { kind: 'direct' | 'related'; title: string; detail: string; sectionIds: string[] }[];
  questions: { id: string; question: string; sectionIds: string[] }[];
  diff: {
    id: string;
    title: string;
    beforeSummary: string;
    afterSummary: string;
    detailChanged: boolean;
  }[];
  synced: boolean;
  approved: boolean;
  formalHash?: string;
  frozenPath?: string;
};
export type CanvasResponse = {
  sha256: string;
  sourceHash: string;
  draft: CanvasDraft | null;
  revision?: RevisionInfo | null;
  operation?: {
    id: string;
    action: string;
    status: string;
    error?: string | null;
    createdAt?: string;
    finishedAt?: string | null;
    progress?: { stage: string; receivedChars: number; updatedAt: string };
  } | null;
  canApprove?: boolean;
  canApply?: boolean;
  context?: 'checkpoint' | 'auto' | 'historical' | 'unavailable';
};

export function hasRevisionChanges(draft: CanvasDraft) {
  if (draft.review?.feedback.trim() || draft.review?.sections.some((section) => section.edited))
    return true;
  const lastRevision = draft.changes.reduce(
    (last, change, index) => (change.startsWith('Agent 统一修订：') ? index : last),
    -1,
  );
  return draft.changes
    .slice(lastRevision + 1)
    .some((change) => change !== '已按提案标题整理候选模块，模块职责与连接关系待人工核对。');
}

export function blankModule(title = '新模块'): ModuleData {
  return {
    title,
    purpose: '',
    input: '',
    steps: '',
    output: '',
    parameters: '',
    limits: '',
    example: '',
    sourceContent: '',
    disabled: false,
    needsReview: true,
  };
}

export function seedCanvas(source: string, sourceHash: string): CanvasDraft {
  if (sourceHash === seedSourceHash) {
    const positions: Record<string, { x: number; y: number }> = {
      input: { x: 0, y: 170 },
      control: { x: 260, y: 0 },
      relax: { x: 260, y: 230 },
      time: { x: 520, y: 230 },
      stats: { x: 780, y: 230 },
      fusion: { x: 780, y: 0 },
      consistency: { x: 510, y: 430 },
    };
    const nodes: ModuleNode[] = Object.entries(timeSetDetails).map(([id, data]) => ({
      id,
      type: 'module',
      position: positions[id],
      data: { ...data, sourceContent: '', disabled: false, needsReview: false },
    }));
    const pairs = [
      ['input', 'control'],
      ['input', 'relax'],
      ['relax', 'time'],
      ['time', 'stats'],
      ['control', 'fusion'],
      ['stats', 'fusion'],
      ['consistency', 'fusion'],
    ];
    return {
      version: 1,
      sourceHash,
      nodes,
      edges: pairs.map(([source, target]) => ({ id: `${source}-${target}`, source, target })),
      changes: [],
    };
  }
  // 通用提案只按真实标题拆分候选模块，不把文档先后顺序假定成数据流。
  const lines = source.split('\n');
  let fenced = false;
  const headings: { title: string; line: number; level: number }[] = [];
  lines.forEach((line, index) => {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (fenced) return;
    const match = line.match(/^(#{2,4})\s+(.+)/);
    if (match) headings.push({ title: match[2], line: index, level: match[1].length });
  });
  const level = [4, 3, 2].find((level) => headings.filter((h) => h.level === level).length >= 2);
  const selected = level
    ? headings.filter((h) => h.level === level).slice(0, 40)
    : [{ title: '方法方案', line: -1, level: 1 }];
  const nodes: ModuleNode[] = selected.map((heading, index) => {
    const end =
      headings.find((h) => h.line > heading.line && h.level <= heading.level)?.line ?? lines.length;
    const body = lines
      .slice(heading.line + 1, end)
      .join('\n')
      .trim();
    return {
      id: `section-${index}`,
      type: 'module',
      position: { x: (index % 3) * 270, y: Math.floor(index / 3) * 190 },
      data: {
        ...blankModule(heading.title.replace(/^\d+[.、．]\s*/, '').slice(0, 100)),
        sourceContent: body,
      },
    };
  });
  return {
    version: 1,
    sourceHash,
    nodes,
    edges: [],
    changes: ['已按提案标题整理候选模块，模块职责与连接关系待人工核对。'],
  };
}

// 丢弃图编辑库的选中、测量等临时属性，服务端只保存方法内容和位置。
export function cleanDraft(draft: CanvasDraft): CanvasDraft {
  return {
    ...draft,
    nodes: draft.nodes.map(({ id, position, data }) => ({ id, type: 'module', position, data })),
    edges: draft.edges.map(({ id, source, target }) => ({ id, source, target })),
  };
}
export function signature(draft: CanvasDraft) {
  const clean = cleanDraft(draft);
  return JSON.stringify({
    ...clean,
    nodes: clean.nodes.map(({ id, position, data }) => ({ id, position, data })),
  });
}

export function affected(draft: CanvasDraft, start: string): string[] {
  const found = new Set<string>();
  const queue = [start];
  while (queue.length) {
    const id = queue.shift()!;
    for (const edge of draft.edges.filter((e) => e.source === id)) {
      if (edge.target !== start && !found.has(edge.target)) {
        found.add(edge.target);
        queue.push(edge.target);
      }
    }
  }
  return [...found];
}
export function markAffected(draft: CanvasDraft, ids: string[]) {
  const pending = new Set(ids);
  return {
    ...draft,
    nodes: draft.nodes.map((n) =>
      pending.has(n.id) ? { ...n, data: { ...n.data, needsReview: true } } : n,
    ),
  };
}
export function issues(draft: CanvasDraft) {
  const enabled = new Set(draft.nodes.filter((n) => !n.data.disabled).map((n) => n.id));
  const edges = draft.edges.filter((e) => enabled.has(e.source) && enabled.has(e.target));
  return draft.nodes
    .filter((n) => enabled.has(n.id))
    .flatMap((n) => {
      const result: string[] = [];
      if (n.data.needsReview) result.push(`${n.data.title}：内容或关联关系待核对`);
      if (!n.data.purpose || !n.data.input || !n.data.steps || !n.data.output)
        result.push(`${n.data.title}：职责、输入、处理或输出尚未补全`);
      if (enabled.size > 1 && !edges.some((e) => e.source === n.id || e.target === n.id))
        result.push(`${n.data.title}：尚未连接到其他启用模块`);
      return result;
    });
}
export function exportDiscussion(draft: CanvasDraft, proposal: string) {
  const names = new Map(draft.nodes.map((n) => [n.id, n.data.title]));
  return (
    '# 研究方案审阅与修订要求\n\n状态：人工修改草案，尚未批准进入实验规划。\n来源：' +
    proposalPath +
    '\n原提案 SHA256：' +
    draft.sourceHash +
    '\n\n## 给 Agent 的任务\n\n根据下列人工修改的方案说明、补充意见、方法模块与连接审查修改意图，说明研究主张、验证条件和输入输出的关联影响，再提出统一的正式提案修订稿。若摘要、细节与方法图不一致，须明确列出冲突并提请决策，不得擅自忽略人工修改。停用模块退出当前方法路径。不得把此草稿视为批准或直接启动实验。\n\n## 修改记录\n\n' +
    (draft.changes.map((c) => '- ' + c).join('\n') || '暂无。') +
    '\n\n## 待核对事项\n\n' +
    (issues(draft)
      .map((c) => '- ' + c)
      .join('\n') || '未检测到结构性待办；这不代表科学假设已经验证。') +
    exportReview(draft.review) +
    '\n\n## 当前连接\n\n' +
    (draft.edges
      .map(
        (e) =>
          '- ' +
          names.get(e.source) +
          ' → ' +
          names.get(e.target) +
          (draft.nodes.some((n) => (n.id === e.source || n.id === e.target) && n.data.disabled)
            ? '（因模块停用，当前不生效）'
            : ''),
      )
      .join('\n') || '尚无连接。') +
    '\n\n## 模块定义\n\n' +
    draft.nodes
      .map(
        (n) =>
          '### ' +
          n.data.title +
          (n.data.disabled ? '（已停用）' : '') +
          '\n\n' +
          Object.entries(fields)
            .filter(([key]) => key !== 'title')
            .map(([key, label]) => '**' + label + '**\n\n' + (n.data[key] || '待补充'))
            .join('\n\n') +
          (n.data.sourceContent ? '\n\n#### 整理依据\n\n' + n.data.sourceContent : ''),
      )
      .join('\n\n') +
    '\n\n## 原始提案（保留依据，以上变更尚未合并）\n\n' +
    proposal
  );
}
