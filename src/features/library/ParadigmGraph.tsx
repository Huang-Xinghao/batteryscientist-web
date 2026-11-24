import { useMemo, useState } from 'react';
import { Alert, Button, Empty, Input, Skeleton } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationNodeDatum,
} from 'd3-force';
import { api, type ParadigmGraph as GraphData } from '../../api/client';
import '@xyflow/react/dist/style.css';
import './graph.css';

const categories = [
  { id: 'papers', name: '论文', color: '#8f80ff', symbol: '论' },
  { id: 'ideas', name: '研究思路', color: '#3de0c4', symbol: '思' },
  { id: 'experiments', name: '实验', color: '#ffb547', symbol: '验' },
  { id: 'claims', name: '论断', color: '#7cc8ff', symbol: '证' },
];
const relations: Record<string, string> = {
  inspired_by: '启发自',
  tested_by: '通过实验验证',
  supports: '支持',
  contradicts: '存在矛盾',
  extends: '扩展',
  supersedes: '替代',
  shares_method: '共享方法',
  addresses_same_problem: '研究相同问题',
  may_apply_to: '可能适用于',
  derived_from: '源自',
};
type GraphNode = Node<
  {
    title: string;
    category: string;
    highlighted: boolean;
    muted: boolean;
    path: string;
    open: () => void;
  },
  'paradigm'
>;
function ParadigmNode({ data }: NodeProps<GraphNode>) {
  const type = categories.find((c) => c.id === data.category) || categories[0];
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`打开文档：${data.title}`}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          data.open();
        }
      }}
      className={`paradigm-node ${data.highlighted ? 'highlighted' : ''} ${data.muted ? 'muted' : ''}`}
      style={{ '--node-color': type.color } as React.CSSProperties}
    >
      <Handle type="target" position={Position.Left} />
      <span className="paradigm-node-symbol">{type.symbol}</span>
      <span className="paradigm-node-text">
        <small>{type.name}</small>
        <strong title={data.title}>{data.title.replace(/^Paper-reported:\s*/, '')}</strong>
      </span>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
const nodeTypes = { paradigm: ParadigmNode };

function layout(data: GraphData) {
  type Point = SimulationNodeDatum & { id: string };
  const points: Point[] = data.nodes.map((n, i) => ({
    id: n.id,
    x: Math.cos(i * 2.399) * 380,
    y: Math.sin(i * 2.399) * 380,
  }));
  const links = data.edges.map((e) => ({ source: e.source, target: e.target }));
  const simulation = forceSimulation(points)
    .force(
      'link',
      forceLink<Point, (typeof links)[number]>(links)
        .id((n) => n.id)
        .distance(230)
        .strength(0.45),
    )
    .force('charge', forceManyBody().strength(-650))
    .force('collide', forceCollide(105).iterations(3))
    .force('x', forceX(0).strength(0.035))
    .force('y', forceY(0).strength(0.05))
    .stop();
  for (let i = 0; i < 260; i++) simulation.tick();
  return new Map(points.map((p) => [p.id, { x: p.x || 0, y: p.y || 0 }]));
}

export function ParadigmGraph({
  selected,
  onOpen,
  refresh,
}: {
  selected: string;
  onOpen: (path: string) => void;
  refresh: number;
}) {
  return (
    <ReactFlowProvider>
      <GraphBrowser selected={selected} onOpen={onOpen} refresh={refresh} />
    </ReactFlowProvider>
  );
}
function GraphBrowser({
  selected,
  onOpen,
  refresh,
}: {
  selected: string;
  onOpen: (path: string) => void;
  refresh: number;
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [focus, setFocus] = useState('');
  const flow = useReactFlow();
  const graph = useQuery({ queryKey: ['paradigm-graph', refresh], queryFn: api.paradigmGraph });
  const positions = useMemo(() => (graph.data ? layout(graph.data) : new Map()), [graph.data]);
  const matching = useMemo(
    () =>
      new Set(
        graph.data?.nodes
          .filter(
            (n) =>
              (!category || n.category === category) &&
              (!search.trim() ||
                `${n.title} ${n.excerpt} ${n.tags.join(' ')}`
                  .toLocaleLowerCase()
                  .includes(search.trim().toLocaleLowerCase())),
          )
          .map((n) => n.id),
      ),
    [graph.data, category, search],
  );
  const selectedId = graph.data?.nodes.find((n) => n.path === selected)?.id;
  const active = focus || selectedId;
  const neighbors = new Set(active ? [active] : []);
  graph.data?.edges.forEach((e) => {
    if (e.source === active || e.target === active) {
      neighbors.add(e.source);
      neighbors.add(e.target);
    }
  });
  const nodes: GraphNode[] =
    graph.data?.nodes.map((n) => ({
      id: n.id,
      type: 'paradigm',
      position: positions.get(n.id) || { x: 0, y: 0 },
      ariaLabel: `打开${categories.find((c) => c.id === n.category)?.name || '文档'}：${n.title}`,
      selected: n.id === active,
      data: {
        title: n.title,
        category: n.category,
        path: n.path,
        open: () => onOpen(n.path),
        highlighted: n.id === active,
        muted: !matching.has(n.id) || (!!active && !neighbors.has(n.id)),
      },
    })) || [];
  const edges =
    graph.data?.edges.map((e, i) => {
      const highlighted = e.source === active || e.target === active;
      return {
        id: `edge-${i}`,
        source: e.source,
        target: e.target,
        label: highlighted ? relations[e.type] || e.type : undefined,
        style: {
          stroke: highlighted ? '#b9afff' : '#3a4150',
          strokeWidth: highlighted ? 2 : 1.1,
          opacity:
            (!active || highlighted) && matching.has(e.source) && matching.has(e.target)
              ? 0.85
              : 0.12,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#5b6372' },
        labelStyle: { fill: '#c3c9d4', fontSize: 11 },
        labelBgStyle: { fill: '#161920', fillOpacity: 0.95 },
      };
    }) || [];
  function locate(id: string) {
    setFocus(id);
    void flow.fitView({ nodes: [{ id }], duration: 450, maxZoom: 1.25 });
  }
  return (
    <section className="paradigm-map" aria-label="范式关系图谱">
      <div className="paradigm-map-toolbar">
        <div>
          <span className="eyebrow">KNOWLEDGE ATLAS</span>
          <h2>探索研究之间的连接</h2>
          <p>
            {graph.data?.nodes.length ?? '—'} 个节点 · {graph.data?.edges.length ?? '—'} 条关系
          </p>
        </div>
        <Input
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setFocus('');
          }}
          allowClear
          placeholder="搜索论文、思路或方法"
          aria-label="搜索图谱"
        />
      </div>
      <div className="paradigm-map-legend" aria-label="图谱类型筛选">
        <button
          className={!category ? 'selected' : ''}
          onClick={() => {
            setCategory('');
            setFocus('');
          }}
        >
          全部
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            className={category === c.id ? 'selected' : ''}
            onClick={() => {
              setCategory(category === c.id ? '' : c.id);
              setFocus('');
            }}
          >
            <i style={{ background: c.color }} />
            {c.name}
            <span>{graph.data?.nodes.filter((n) => n.category === c.id).length || 0}</span>
          </button>
        ))}
        <span className="paradigm-map-hint">点击节点阅读 · 拖动平移 · 滚轮缩放</span>
      </div>
      {graph.isPending ? (
        <Skeleton active className="graph-loading" paragraph={{ rows: 10 }} />
      ) : graph.isError ? (
        <Alert
          type="error"
          message="图谱加载失败"
          action={
            <Button aria-label="重试图谱" onClick={() => void graph.refetch()}>
              重试
            </Button>
          }
        />
      ) : !graph.data?.nodes.length ? (
        <Empty description="暂无图谱节点，添加研究条目后将在这里展示。" />
      ) : (
        <div className="paradigm-canvas">
          <ReactFlow
            colorMode="dark"
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
            minZoom={0.15}
            maxZoom={2}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            onNodeClick={(_, node) => {
              setFocus(node.id);
              onOpen(node.data.path);
            }}
            onPaneClick={() => setFocus('')}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} color="#2a303b" gap={22} size={1} />
            <Controls showInteractive={false} fitViewOptions={{ padding: 0.15 }} />
            <MiniMap
              bgColor="#161920"
              maskColor="rgba(8, 9, 12, 0.72)"
              pannable
              zoomable
              nodeColor={(node) =>
                categories.find((c) => c.id === node.data.category)?.color || '#97a0af'
              }
            />
          </ReactFlow>
          {(search || category) && (
            <div className="graph-search-results" aria-label="图谱搜索结果">
              <strong>{matching.size} 个匹配节点</strong>
              {graph.data.nodes
                .filter((n) => matching.has(n.id))
                .map((n) => (
                  <div key={n.id}>
                    <button
                      title="在图谱中定位"
                      onClick={() => locate(n.id)}
                      className="graph-locate"
                    >
                      ◎
                    </button>
                    <button onClick={() => onOpen(n.path)}>{n.title}</button>
                  </div>
                ))}
              {!matching.size && <p>换个关键词或类型试试。</p>}
            </div>
          )}
          <div className="graph-caption">连线来自电池范式库已记录的研究关系</div>
        </div>
      )}
      {graph.data?.truncated && <Alert type="info" message="当前图谱仅展示部分条目。" />}
    </section>
  );
}
