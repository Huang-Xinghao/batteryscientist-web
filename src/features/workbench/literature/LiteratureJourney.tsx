import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Drawer } from 'antd';
import {
  Background,
  BaseEdge,
  Controls,
  Handle,
  MarkerType,
  Position,
  Panel,
  ReactFlow,
  useReactFlow,
  useStore,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatDate } from '../../../lib/date';
import { gapEvidence, paperRelations, parseLiteratureReport, reportSections } from './report';
import { researchActions, type ResearchContext } from './trace';
import '@xyflow/react/dist/style.css';
import './literature.css';

type Kind = 'goal' | 'search' | 'paper' | 'problem' | 'gap' | 'scope';
type Data = { kind: Kind; title: string; subtitle?: string };
type ResearchNode = Node<Data, 'research'>;
const labels: Record<Kind, string> = {
  goal: '研究目标（主控整理）',
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
      {data.kind === 'paper' && (
        <>
          <Handle
            id="relation-source"
            type="source"
            position={Position.Left}
            style={{ top: '70%' }}
          />
          <Handle
            id="relation-target"
            type="target"
            position={Position.Left}
            style={{ top: '30%' }}
          />
        </>
      )}
    </div>
  );
}
const nodeTypes = { research: ResearchCard };
function PaperRelationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  style,
  label,
  labelStyle,
  labelBgStyle,
  interactionWidth,
}: EdgeProps) {
  const lane = Math.min(sourceX, targetX) - 90 - Number(data?.lane || 0) * 28;
  return (
    <BaseEdge
      id={id}
      path={`M${sourceX},${sourceY} C${lane},${sourceY} ${lane},${targetY} ${targetX},${targetY}`}
      style={style}
      label={label}
      labelX={(sourceX + targetX) / 8 + lane * 0.75}
      labelY={(sourceY + targetY) / 2}
      labelStyle={labelStyle}
      labelBgStyle={labelBgStyle}
      interactionWidth={interactionWidth}
    />
  );
}
const edgeTypes = { paperRelation: PaperRelationEdge };
function FitCanvas({ ready }: { ready: boolean }) {
  const { fitView, setCenter, getNode } = useReactFlow();
  const width = useStore((state) => state.width);
  const height = useStore((state) => state.height);
  const viewportReady = useStore((state) => !!state.panZoom);
  const positioned = useRef('');
  const canNavigate = ready && viewportReady;
  const focusGoal = () => {
    const goal = getNode('goal');
    if (goal) void setCenter(goal.position.x + 160, goal.position.y + 85, { zoom: 1 });
  };
  useEffect(() => {
    if (!canNavigate || !width || !height) return;
    const size = `${width}:${height}`;
    if (positioned.current === size) return;
    positioned.current = size;
    // Dimensions also update when the mobile workspace becomes visible.
    const goal = getNode('goal');
    if (goal) void setCenter(goal.position.x + 160, goal.position.y + 85, { zoom: 1 });
  }, [getNode, setCenter, canNavigate, width, height]);
  return (
    <Panel position="top-right" className="research-map-views">
      <Button disabled={!canNavigate} onClick={focusGoal}>
        回到目标
      </Button>
      <Button
        disabled={!canNavigate}
        onClick={() => {
          const paper = getNode('paper-0');
          if (paper) void setCenter(paper.position.x + 160, paper.position.y + 85, { zoom: 1 });
        }}
      >
        定位文献
      </Button>
      <Button disabled={!canNavigate} onClick={() => void fitView({ maxZoom: 1, padding: 0.08 })}>
        查看全图
      </Button>
    </Panel>
  );
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
  const relations = useMemo(() => paperRelations(content, papers), [content, papers]);
  const sections = useMemo(() => reportSections(content), [content]);
  const actions = useMemo(() => researchActions(research?.events ?? []), [research?.events]);
  const searches = actions.filter((action) => action.kind === 'search');
  const scope = sections.find((section) => /研究范围|证据覆盖|research scope/i.test(section.title));
  const scopeIntro = scope?.text
    .split('\n')
    .find((line) => line.trim() && !/^\d+(?:\.\d+)*\s/.test(line.trim()))
    ?.trim();
  const scopeSummary = scopeIntro
    ? `${scopeIntro.slice(0, 56)}${scopeIntro.length > 56 ? '…' : ''}`
    : '等待 Agent 整理调研范围';
  const gaps = sections.filter(
    (section) =>
      /\bgaps?\b|研究缺口|领域缺口/i.test(section.title) &&
      !/重要|意义|importance|why/i.test(section.title),
  );
  const importance = sections.find((section) =>
    /为什么.*gap|缺口.*重要|importance/i.test(section.title),
  );
  const [selected, setSelected] = useState<string>();
  const drawerContent = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selected) drawerContent.current?.focus();
  }, [selected]);
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
      width: 320,
      height: 170,
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
  add(
    'goal',
    'goal',
    research?.goal || '尚未记录研究 Goal',
    0,
    center,
    '主控依据研究指令整理，非用户原文',
  );
  add('scope', 'scope', scopeSummary, 1, center, scope ? '点击查看完整范围与证据边界' : undefined);
  link('goal', 'scope', '围绕目标调研', true);
  searches.forEach((action, index) => {
    add(
      action.id,
      'search',
      action.query || '检索词未记录',
      2,
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
      3,
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
    add(`problem-${paper.id}`, 'problem', paper.problem || '报告尚未填写解决的问题', 4, index);
    link(paper.id, `problem-${paper.id}`, '解决');
  });
  relations.forEach((relation, index) => {
    edges.push({
      id: relation.id,
      type: 'paperRelation',
      data: { lane: index },
      source: relation.source,
      target: relation.target,
      sourceHandle: 'relation-source',
      targetHandle: 'relation-target',
      label: relation.evidence[0].label,
      className: 'paper-relation',
      style: { stroke: '#b9afff', strokeWidth: 2.2 },
      labelStyle: { fill: '#d5ceff', fontSize: 13 },
      labelBgStyle: { fill: 'var(--surface)' },
      interactionWidth: 24,
      focusable: true,
      ariaLabel: `论文关系：${relation.evidence[0].label}，点击查看报告依据`,
    });
  });
  gaps.forEach((gap, index) => {
    const evidence = gapEvidence(gap, papers);
    add(
      gap.id,
      'gap',
      gap.text || '报告尚未填写 Gap',
      5,
      center + index,
      evidence.length ? `${evidence.length} 篇文献被明确提及` : '报告未明确关联具体论文',
    );
    if (evidence.length) evidence.forEach((id) => link(`problem-${id}`, gap.id, 'Gap 提及该文献'));
    else link('scope', gap.id, '报告综合判断', true);
  });
  if (!gaps.length) {
    add('gap-pending', 'gap', '等待 Agent 形成 Gap 判断', 5, center);
    link('scope', 'gap-pending', '待归纳', true);
  }
  const detail = nodes.find((node) => node.id === selected);
  const relation = relations.find((entry) => entry.id === selected);
  const paperId = selected?.startsWith('problem-') ? selected.slice(8) : selected;
  const paper = papers.find((entry) => entry.id === paperId);
  const gap = gaps.find((entry) => entry.id === selected);
  const action = searches.find((entry) => entry.id === selected);
  return (
    <section className="literature-view research-journey" aria-label="文献研究图谱">
      <div className="literature-toolbar">
        <strong>Goal → 检索 → 文献 → 已解决问题 → Gap</strong>
        {!!relations.length && <span>论文间关系 {relations.length} 条</span>}
      </div>
      <p className="literature-caption">
        默认按清晰字号显示，拖动浏览、滚轮缩放。点击节点或紫色论文连线查看详情。紫线为报告归纳的论文关系，灰色虚线为报告组织关系。
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
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={(_, node) => setSelected(node.id)}
          onEdgeClick={(_, edge) => {
            if (relations.some((entry) => entry.id === edge.id)) setSelected(edge.id);
          }}
          nodesDraggable={false}
          nodesConnectable={false}
          edgesFocusable={false}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          minZoom={0.03}
        >
          <FitCanvas ready={!reportLoading} />
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      {!searches.length && (
        <p className="literature-caption">尚无可用检索回执，按报告展示已选文献。</p>
      )}
      <Drawer
        title={relation ? '论文关系与依据' : detail ? labels[detail.data.kind] : ''}
        open={!!detail || !!relation}
        onClose={() => setSelected(undefined)}
        width={520}
        afterOpenChange={(open) => {
          if (open) drawerContent.current?.focus();
        }}
      >
        <div ref={drawerContent} tabIndex={-1} style={{ outline: 'none' }}>
          {detail && (
            <h3>
              {detail.data.kind === 'gap' ? gap?.title || detail.data.title : detail.data.title}
            </h3>
          )}
          {relation ? (
            <>
              <h3>{papers.find((entry) => entry.id === relation.source)?.title}</h3>
              <p>与</p>
              <h3>{papers.find((entry) => entry.id === relation.target)?.title}</h3>
              <p className="muted">以下关系来自研究报告的归纳，不代表论文间存在引用或继承关系。</p>
              {relation.evidence.map((entry, index) => (
                <section key={index}>
                  <h4>{entry.label}</h4>
                  <p className="muted">来源：{entry.section}</p>
                  <Markdown>{entry.markdown}</Markdown>
                </section>
              ))}
            </>
          ) : paper ? (
            <>
              {paper.fields.map((field, index) => (
                <section key={index}>
                  <h4>{field.label}</h4>
                  <Markdown>{field.markdown || '报告未填写'}</Markdown>
                </section>
              ))}
              {relations.some(
                (entry) => entry.source === paper.id || entry.target === paper.id,
              ) && (
                <section>
                  <h4>与其他论文的关系</h4>
                  {relations
                    .filter((entry) => entry.source === paper.id || entry.target === paper.id)
                    .map((entry) => (
                      <p key={entry.id}>
                        <Button
                          type="link"
                          className="paper-relation-link"
                          onClick={() => setSelected(entry.id)}
                        >
                          {entry.evidence[0].label} ·{' '}
                          {
                            papers.find(
                              (other) =>
                                other.id ===
                                (entry.source === paper.id ? entry.target : entry.source),
                            )?.title
                          }
                        </Button>
                      </p>
                    ))}
                </section>
              )}
            </>
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
        </div>
      </Drawer>
    </section>
  );
}
