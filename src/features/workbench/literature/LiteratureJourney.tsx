import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Drawer } from 'antd';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  useReactFlow,
  useNodesInitialized,
  useStore,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatDate } from '../../../lib/date';
import { gapEvidence, parseLiteratureReport, reportSections } from './report';
import { researchActions, type ResearchContext } from './trace';
import '@xyflow/react/dist/style.css';
import './literature.css';

type Kind = 'goal' | 'search' | 'paper' | 'problem' | 'gap' | 'scope';
type Data = { kind: Kind; title: string; subtitle?: string };
type ResearchNode = Node<Data, 'research'>;
const labels: Record<Kind, string> = {
  goal: '用户问题 / Goal',
  search: '文献检索',
  paper: '选用文献',
  problem: '已解决的问题',
  gap: '研究 Gap',
  scope: '调研范围',
};
function ResearchCard({ data, selected }: NodeProps<ResearchNode>) {
  return (
    <div className={`research-map-card kind-${data.kind} ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <small>{labels[data.kind]}</small>
      <strong title={data.title}>{data.title}</strong>
      {data.subtitle && <span>{data.subtitle}</span>}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
const nodeTypes = { research: ResearchCard };
// Fitting never shrinks cards below a readable size; large maps scroll instead,
// and the zoom controls still allow zooming further out.
const fitOptions = { minZoom: 0.45, maxZoom: 0.8, padding: 0.08 };
function FitCanvas() {
  const { fitView } = useReactFlow();
  const initialized = useNodesInitialized();
  const width = useStore((state) => state.width);
  const height = useStore((state) => state.height);
  const viewportReady = useStore((state) => !!state.panZoom);
  useEffect(() => {
    if (!viewportReady || !width || !height) return;
    // Wait for the mobile pane's visibility/layout transition before fitting.
    const timer = setTimeout(() => void fitView(fitOptions), 150);
    return () => clearTimeout(timer);
  }, [fitView, initialized, viewportReady, width, height]);
  return null;
}
function Markdown({ children }: { children: string }) {
  return (
    <div className="research-detail markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{ a: (props) => <a {...props} target="_blank" rel="noopener noreferrer" /> }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
export default function LiteratureJourney({
  content,
  research,
  reportLoading,
  reportWaiting,
  reportError,
  retryReport,
}: {
  content: string;
  research?: ResearchContext;
  reportLoading: boolean;
  reportWaiting: boolean;
  reportError: string;
  retryReport: () => void;
}) {
  const papers = useMemo(() => parseLiteratureReport(content), [content]);
  const sections = useMemo(() => reportSections(content), [content]);
  const actions = useMemo(() => researchActions(research?.events ?? []), [research?.events]);
  const searches = actions.filter((action) => action.kind === 'search');
  const scope = sections.find((section) => /研究范围|证据覆盖|research scope/i.test(section.title));
  const gaps = sections.filter(
    (section) =>
      /\bgaps?\b|研究缺口|领域缺口/i.test(section.title) &&
      !/重要|意义|importance|why/i.test(section.title),
  );
  const importance = sections.find((section) =>
    /为什么.*gap|缺口.*重要|importance/i.test(section.title),
  );
  const [selected, setSelected] = useState<string>();
  const nodes: ResearchNode[] = [];
  const edges: Edge[] = [];
  const add = (
    id: string,
    kind: Kind,
    title: string,
    column: number,
    row: number,
    subtitle?: string,
  ) => {
    nodes.push({
      id,
      type: 'research',
      position: { x: column * 430, y: row * 200 },
      data: { kind, title, subtitle },
      ariaLabel: `${labels[kind]}：${title}`,
    });
  };
  const link = (source: string, target: string, label: string, structural = false) => {
    edges.push({
      id: `${source}:${target}`,
      source,
      target,
      label,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#8492a6' },
      style: {
        stroke: '#8492a6',
        strokeWidth: 1.4,
        ...(structural ? { strokeDasharray: '6 5' } : {}),
      },
      labelStyle: { fill: 'var(--ink-2)', fontSize: 11 },
      labelBgStyle: { fill: 'var(--surface)' },
    });
  };
  const center = Math.max(papers.length - 1, searches.length - 1, 0) / 2;
  // Stages without nodes take no column, so a sparse map stays compact and readable.
  const stages: Kind[] = [
    'goal',
    'scope',
    ...(searches.length ? (['search'] as const) : []),
    ...(papers.length ? (['paper', 'problem'] as const) : []),
    'gap',
  ];
  const column = (kind: Kind) => stages.indexOf(kind);
  add('goal', 'goal', research?.goal || '尚未记录研究 Goal', 0, center);
  add('scope', 'scope', scope?.text || '等待 Agent 整理调研范围', 1, center);
  link('goal', 'scope', '围绕目标调研', true);
  searches.forEach((action, index) => {
    add(
      action.id,
      'search',
      action.query || '检索词未记录',
      column('search'),
      index,
      `${action.status === 'done' ? '已完成' : action.status === 'error' ? '失败' : '暂无完成回执'} · ${action.candidates.length} 条已记录结果`,
    );
    link('scope', action.id, '检索', true);
  });
  papers.forEach((paper, index) => {
    const reads = actions.filter(
      (action) =>
        action.kind === 'read' &&
        action.status === 'done' &&
        action.path &&
        paper.sources.some(
          (source) => source === action.path || source.endsWith(`/${action.path}`),
        ),
    );
    add(
      paper.id,
      'paper',
      paper.title,
      column('paper'),
      index,
      reads.length ? '已读取 Wiki · 报告选用' : '报告选用',
    );
    const matches = searches.filter((action) =>
      action.candidates.some(
        (candidate) =>
          (candidate.title.length >= 5 &&
            paper.title.toLowerCase().includes(candidate.title.toLowerCase())) ||
          (candidate.path &&
            paper.sources.some(
              (source) => source === candidate.path || source.endsWith(`/${candidate.path}`),
            )),
      ),
    );
    if (matches.length) matches.forEach((action) => link(action.id, paper.id, '检索命中'));
    else link('scope', paper.id, '报告选用', true);
    add(
      `problem-${paper.id}`,
      'problem',
      paper.problem || '报告尚未填写解决的问题',
      column('problem'),
      index,
    );
    link(paper.id, `problem-${paper.id}`, '解决');
  });
  gaps.forEach((gap, index) => {
    const evidence = gapEvidence(gap, papers);
    add(
      gap.id,
      'gap',
      gap.text || '报告尚未填写 Gap',
      column('gap'),
      center + index,
      evidence.length ? `${evidence.length} 篇文献被明确提及` : '报告未明确关联具体论文',
    );
    if (evidence.length) evidence.forEach((id) => link(`problem-${id}`, gap.id, 'Gap 提及该文献'));
    else link('scope', gap.id, '报告综合判断', true);
  });
  if (!gaps.length) {
    add('gap-pending', 'gap', '等待 Agent 形成 Gap 判断', column('gap'), center);
    link('scope', 'gap-pending', '待归纳', true);
  }
  const detail = nodes.find((node) => node.id === selected);
  const paperId = selected?.startsWith('problem-') ? selected.slice(8) : selected;
  const paper = papers.find((entry) => entry.id === paperId);
  const gap = gaps.find((entry) => entry.id === selected);
  const action = searches.find((entry) => entry.id === selected);
  return (
    <section className="literature-view research-journey" aria-label="文献研究图谱">
      <div className="literature-toolbar">
        <strong>Goal → 检索 → 文献 → 已解决问题 → Gap</strong>
        {research?.hasOlder && (
          <Button loading={research.loadingOlder} onClick={research.loadOlder}>
            加载更早检索
          </Button>
        )}
      </div>
      <p className="literature-caption">
        拖动平移、滚轮缩放，点击节点查看详情。实线为明确对应，虚线为报告组织关系。
      </p>
      {reportLoading && <p className="literature-caption">正在加载报告…</p>}
      {reportWaiting && <p className="literature-caption">报告尚未生成，检索进展将持续显示。</p>}
      {reportError && (
        <Alert
          type="warning"
          message="报告暂不可用"
          description={reportError}
          action={<Button onClick={retryReport}>重试</Button>}
        />
      )}
      {research?.error && (
        <Alert type="warning" message="检索事件暂不可用" description={research.error} />
      )}
      <div className="research-map">
        <ReactFlow
          key={`${papers.length}:${searches.length}:${gaps.length}`}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => setSelected(node.id)}
          nodesDraggable={false}
          nodesConnectable={false}
          edgesFocusable={false}
          colorMode="dark"
          fitView
          fitViewOptions={fitOptions}
          minZoom={0.03}
        >
          <FitCanvas />
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      {!searches.length && (
        <p className="literature-caption">尚无可用检索回执，按报告展示已选文献。</p>
      )}
      <Drawer
        title={detail ? labels[detail.data.kind] : ''}
        open={!!detail}
        onClose={() => setSelected(undefined)}
        width={520}
      >
        {detail && (
          <h3>
            {detail.data.kind === 'gap' ? gap?.title || detail.data.title : detail.data.title}
          </h3>
        )}
        {paper ? (
          paper.fields.map((field, index) => (
            <section key={index}>
              <h4>{field.label}</h4>
              <Markdown>{field.markdown || '报告未填写'}</Markdown>
            </section>
          ))
        ) : gap ? (
          <>
            <Markdown>{gap.markdown}</Markdown>
            {importance && (
              <>
                <h4>为什么这个 Gap 重要</h4>
                <Markdown>{importance.markdown}</Markdown>
              </>
            )}
          </>
        ) : action ? (
          <>
            <p>{formatDate(action.time)}</p>
            {action.candidates.map((candidate, index) => (
              <p key={index}>
                {candidate.title}
                <br />
                <small>{candidate.path}</small>
              </p>
            ))}
            {!action.resultsAvailable && <p>返回结果未完整记录。</p>}
          </>
        ) : selected === 'scope' && scope ? (
          <Markdown>{scope.markdown}</Markdown>
        ) : (
          <p>{detail?.data.title}</p>
        )}
      </Drawer>
    </section>
  );
}
