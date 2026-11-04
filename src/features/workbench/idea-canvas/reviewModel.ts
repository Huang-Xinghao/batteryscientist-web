import { seedSourceHash } from './timeSetSeed';

export type ReviewSection = {
  id: string;
  title: string;
  summary: string;
  details: string;
  focus: boolean;
  edited: boolean;
};
export type ProposalReview = { sections: ReviewSection[]; feedback: string };

// 只读取真实标题和正文。通用提案保留原有组织，不用前端猜测研究结论。
export function proposalSections(source: string) {
  const sections: { title: string; body: string }[] = [];
  let current = { title: '方案说明', body: '' };
  let fence: string | undefined;
  for (const line of source.split('\n')) {
    const delimiter = line.match(/^\s*(`{3,}|~{3,})/);
    if (delimiter) {
      if (!fence) fence = delimiter[1][0];
      else if (delimiter[1][0] === fence) fence = undefined;
    }
    const heading = !fence && line.match(/^##\s+(.+?)\s*#*$/);
    if (heading) {
      if (current.body.trim()) sections.push({ ...current, body: current.body.trim() });
      current = { title: heading[1], body: '' };
    } else current.body += line + '\n';
  }
  if (current.body.trim()) sections.push({ ...current, body: current.body.trim() });
  return sections;
}

function excerpt(body: string) {
  const line = body.split('\n').find((line) => line.trim() && !/^\s*[#>|`~]/.test(line)) || '';
  const plain = line
    .replace(/^\s*(?:[-*]|\d+\.)\s*/, '')
    .replace(/[*`]/g, '')
    .trim();
  return plain.length > 190 ? plain.slice(0, 190) + '…' : plain || '展开查看提案中的具体说明。';
}

export function seedReview(source: string, sourceHash: string): ProposalReview {
  const sections = proposalSections(source);
  if (sourceHash === seedSourceHash) {
    // 仅用于已核对的这份真实提案；不会套用到其他研究。
    const items = [
      {
        title: '这项研究要回答什么',
        source: ['问题锚点'],
        summary:
          '用 Tongji 电池早期数据预测官方寿命。真正要回答的是：已有健康状态信息之外，松弛曲线还能提供多少可复现的预测增量？',
        focus: false,
      },
      {
        title: '准备怎样做',
        source: ['提议的方法'],
        summary:
          '按真实时间而非采样点数汇总松弛曲线，结合早期健康信息预测寿命，并用有限删点约束检验采样稳健性。方法优势目前是待证假设。',
        focus: false,
      },
      {
        title: '为什么值得尝试，依据到哪里',
        source: ['方法核心论点', '文献依据与近邻差异'],
        summary:
          '现有核查发现采样密度和观测跨度随实验组变化，因此尝试真实时间加权。集合编码有文献依据，但不能据此认定它在该电池任务上有效；近邻文献仍有全文缺口。',
        focus: false,
      },
      {
        title: '关键取舍：怎样才算方法成立',
        source: ['可证伪性与结论合同（不是具体实验清单）', '贡献焦点'],
        summary:
          '必须面对强健康对照和简单统计融合。只胜过弱基线不足以证明方法必要；如果没有额外增益，应保留负结果或不确定结论。',
        focus: true,
      },
      {
        title: '关键取舍：研究边界与下一步分工',
        source: ['交付下一阶段的实现边界', '数据集'],
        summary:
          '保留官方标签和 108 芯主队列，只用允许的早期信息；短观测不外推，不扩展到实车或未来工况。超参数、种子、预算和运行顺序交给实验规划，不能擅自换核心方法。',
        focus: true,
      },
    ];
    return {
      sections: items.map((item, index) => ({
        id: `review-${index}`,
        title: item.title,
        summary: item.summary,
        focus: item.focus,
        edited: false,
        details: sections
          .filter((s) => item.source.includes(s.title))
          .map((s) => `## ${s.title}\n\n${s.body}`)
          .join('\n\n'),
      })),
      feedback: '',
    };
  }
  return {
    sections: sections
      .filter((s) => s.title !== '方案说明' || sections.length === 1)
      .slice(0, 30)
      .map((section, index) => ({
        id: `review-${index}`,
        title: section.title,
        summary: excerpt(section.body),
        details: section.body,
        focus: /边界|风险|取舍|可证伪|失败|未决|不确定|限制/.test(section.title),
        edited: false,
      })),
    feedback: '',
  };
}

export function exportReview(review?: ProposalReview) {
  if (!review) return '';
  return (
    '\n\n## 方案总览与人工修订\n\n' +
    review.sections
      .map(
        (s) =>
          `### ${s.title}${s.edited ? '（人工已修改，待与正式提案合并）' : ''}\n\n${s.summary}\n\n${s.details}`,
      )
      .join('\n\n') +
    '\n\n## 给 Agent 的补充意见\n\n' +
    (review.feedback || '暂无补充意见。')
  );
}
