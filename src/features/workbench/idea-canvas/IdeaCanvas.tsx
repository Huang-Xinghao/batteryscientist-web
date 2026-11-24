import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBlocker } from 'react-router-dom';
import {
  Alert,
  App,
  Button,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Input,
  Select,
  Space,
  Spin,
  Tabs,
  Tag,
} from 'antd';
import { MoreOutlined, RedoOutlined, UndoOutlined } from '@ant-design/icons';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
  Panel,
  ReactFlowProvider,
  applyNodeChanges,
  type Connection,
  type Edge,
  type NodeProps,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { active, api, request } from '../../../api/client';
import {
  affected,
  hasRevisionChanges,
  blankModule,
  cleanDraft,
  exportDiscussion,
  fields,
  issues,
  markAffected,
  proposalPath,
  seedCanvas,
  signature,
  type CanvasDraft,
  type CanvasResponse,
  type ContentField,
  type ModuleData,
  type ModuleNode,
} from './model';
import { RevisionProgress } from './RevisionProgress';
import { ProposalOverview, type OverviewNavigation } from './ProposalOverview';
import { seedReview } from './reviewModel';
import './idea-canvas.css';

function Module({ data, selected }: NodeProps<ModuleNode>) {
  return (
    <div className={`idea-module ${selected ? 'selected' : ''} ${data.disabled ? 'disabled' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <strong>{data.title}</strong>
      <p>{data.purpose || '点击补充模块职责与输入输出'}</p>
      <span>{data.disabled ? '已停用' : data.needsReview ? '待核对' : '提案模块'}</span>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
const nodeTypes = { module: Module };

export default function IdeaCanvas(props: {
  projectId: string;
  running: boolean;
  workflowStage?: string;
  onDirtyChange: (dirty: boolean) => void;
  viewSwitch: ReactNode;
}) {
  const client = useQueryClient();
  const [tracking, setTracking] = useState(false);
  const expectedOperation = useRef('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [loadError, setLoadError] = useState('');
  const completedOperation = useRef('');
  const editorDirty = useRef(false);
  const source = useQuery({
    queryKey: ['idea-source', props.projectId],
    queryFn: () => api.file(props.projectId, proposalPath),
    refetchOnWindowFocus: false,
    gcTime: 0,
  });
  const saved = useQuery({
    queryKey: ['idea-canvas', props.projectId],
    queryFn: () => request<CanvasResponse>(`/projects/${props.projectId}/idea-canvas`),
    refetchOnWindowFocus: false,
    gcTime: 0,
    refetchInterval: (query) =>
      tracking || props.running || active(query.state.data?.operation?.status || '') ? 1500 : false,
  });
  const result = saved.data;
  useEffect(() => {
    if (result?.operation && active(result.operation.status)) setTracking(true);
    if (!tracking || !result?.operation || active(result.operation.status)) return;
    const operation = result.operation;
    if (expectedOperation.current && operation.id !== expectedOperation.current) return;
    if (completedOperation.current === operation.id) return;
    completedOperation.current = operation.id;
    expectedOperation.current = '';
    setTracking(false);
    void client.invalidateQueries({ queryKey: ['project', props.projectId] });
    void client.invalidateQueries({ queryKey: ['files', props.projectId] });
    if (operation.action === 'proposal_approve' || operation.status === 'completed') {
      if (editorDirty.current) {
        setLoadError('Agent 已返回结果，你仍有本地修改。请先导出或保存，再重新打开方案查看新版。');
        return;
      }
      source.refetch().then(() => setRefreshVersion((value) => value + 1));
    }
  }, [result, tracking, client, props.projectId, source]);
  if (source.isPending || saved.isPending) return <Spin className="idea-loading" />;
  if (source.isError || saved.isError)
    return (
      <Alert
        type="error"
        message="方案画布加载失败"
        description={(source.error || saved.error)?.message}
        action={
          <Button
            onClick={() => {
              source.refetch();
              saved.refetch();
            }}
          >
            重试
          </Button>
        }
      />
    );
  if (!source.data?.sha256 || !saved.data) return <Empty description="尚无可用的最终研究提案" />;
  return (
    <ReactFlowProvider>
      {loadError && <Alert type="warning" message={loadError} />}
      <CanvasEditor
        key={refreshVersion}
        {...props}
        running={props.running || tracking || active(result?.operation?.status || '')}
        onDirtyChange={(dirty) => {
          editorDirty.current = dirty;
          props.onDirtyChange(dirty);
        }}
        onOperation={(id) => {
          expectedOperation.current = id;
          setTracking(true);
          void saved.refetch();
        }}
        onApplied={async () => {
          await Promise.all([
            source.refetch(),
            saved.refetch(),
            client.invalidateQueries({ queryKey: ['project', props.projectId] }),
            client.invalidateQueries({ queryKey: ['files', props.projectId] }),
            client.invalidateQueries({ queryKey: ['file', props.projectId, proposalPath] }),
          ]);
          setRefreshVersion((value) => value + 1);
        }}
        status={saved.data}
        proposal={source.data.content || ''}
        sourceHash={source.data.sha256}
        initial={saved.data}
      />
    </ReactFlowProvider>
  );
}

function CanvasEditor({
  projectId,
  running,
  workflowStage,
  onDirtyChange,
  proposal,
  sourceHash,
  initial,
  viewSwitch,
  status,
  onOperation,
  onApplied,
}: {
  projectId: string;
  running: boolean;
  workflowStage?: string;
  onDirtyChange: (dirty: boolean) => void;
  proposal: string;
  sourceHash: string;
  initial: CanvasResponse;
  status: CanvasResponse;
  onOperation: (id: string) => void;
  onApplied: () => Promise<void>;
  viewSwitch: ReactNode;
}) {
  const { message, modal } = App.useApp();
  const normalize = (draft: CanvasDraft) => ({
    ...draft,
    review: draft.review || seedReview(proposal, draft.sourceHash),
    nodes: draft.nodes.map((n) => ({ ...n, type: 'module' as const })),
  });
  const [draft, setDraft] = useState<CanvasDraft>(() =>
    normalize(initial.draft || seedCanvas(proposal, sourceHash)),
  );
  const [base, setBase] = useState(() =>
    signature(normalize(initial.draft || seedCanvas(proposal, sourceHash))),
  );
  const [serverStatus, setServerStatus] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [hash, setHash] = useState(initial.sha256);
  const [past, setPast] = useState<CanvasDraft[]>([]);
  const [future, setFuture] = useState<CanvasDraft[]>([]);
  const [selected, setSelected] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<ModuleData>(blankModule());
  const [isNew, setIsNew] = useState(false);
  const [upstream, setUpstream] = useState<string>();
  const [downstream, setDownstream] = useState<string>();
  const [insertEdge, setInsertEdge] = useState<string>();
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [mode, setMode] = useState<'overview' | 'canvas'>('overview');
  const readingPane = useRef<HTMLDivElement>(null);
  const overviewNavigation = useRef<OverviewNavigation>(null);
  const overviewScroll = useRef(0);
  const [reviewFormChanged, setReviewFormChanged] = useState(false);
  const [commentDraftChanged, setCommentDraftChanged] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewTab, setReviewTab] = useState('pending');
  const flow = useRef<ReactFlowInstance<ModuleNode> | null>(null);
  const graph = useRef<HTMLDivElement>(null);
  const dragStart = useRef<CanvasDraft | null>(null);
  const selectedNode = draft.nodes.find((n) => n.id === selected);
  const dirty = signature(draft) !== base;
  const stale = draft.sourceHash !== sourceHash;
  const pending = issues(draft);
  const formChanged =
    open &&
    (isNew
      ? Object.entries(fields).some(([key]) => values[key] !== blankModule()[key])
      : !!selectedNode &&
        Object.entries(fields).some(([key]) => values[key] !== selectedNode.data[key]));
  const hasUnsaved = dirty || formChanged || reviewFormChanged;
  const blocker = useBlocker(hasUnsaved);
  useEffect(() => {
    onDirtyChange(hasUnsaved);
  }, [hasUnsaved, onDirtyChange]);
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (hasUnsaved) event.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsaved]);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    const dialog = modal.confirm({
      title: '离开并放弃未保存的画布修改？',
      onOk: () => blocker.proceed(),
      onCancel: () => blocker.reset(),
    });
    return () => dialog.destroy();
  }, [blocker, modal]);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  useEffect(() => {
    if (!graph.current) return;
    // 展开工作区、折叠导航或调整分栏后重新适配全图，避免节点留在视野外。
    let timer: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => flow.current?.fitView({ padding: 0.15, duration: 150 }), 150);
    });
    observer.observe(graph.current);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [mode]);

  useEffect(() => {
    if (mode === 'overview')
      readingPane.current?.scrollTo({ top: overviewScroll.current, behavior: 'instant' });
  }, [mode]);
  function changeMode(next: 'overview' | 'canvas') {
    if (reviewFormChanged || formChanged) {
      message.info('请先应用或取消正在编辑的内容，再切换视图');
      return;
    }
    if (mode === 'overview' && next === 'canvas')
      overviewScroll.current = readingPane.current?.scrollTop || 0;
    setMode(next);
  }
  function commit(next: CanvasDraft, change: string) {
    setPast((p) => [...p.slice(-39), draft]);
    setFuture([]);
    setDraft({ ...next, changes: [...next.changes, change].slice(-100) });
  }
  function undo() {
    const previous = past.at(-1);
    if (!previous) return;
    setFuture((next) => [draft, ...next]);
    setPast((p) => p.slice(0, -1));
    setDraft(previous);
  }
  function redo() {
    const next = future[0];
    if (!next) return;
    setPast((p) => [...p, draft]);
    setFuture((f) => f.slice(1));
    setDraft(next);
  }
  function details(node: ModuleNode) {
    setSelected(node.id);
    setValues({ ...node.data });
    setEditing(false);
    setIsNew(false);
    setOpen(true);
    setPreview(false);
  }
  function add(edgeId?: string) {
    const edge = draft.edges.find((e) => e.id === edgeId);
    setValues(blankModule());
    setIsNew(true);
    setEditing(true);
    setPreview(false);
    setOpen(true);
    setUpstream(edge?.source);
    setDownstream(edge?.target);
    setInsertEdge(edge?.id);
  }
  function closeDetails() {
    if (formChanged)
      modal.confirm({ title: '放弃这次尚未应用的模块编辑？', onOk: () => setOpen(false) });
    else setOpen(false);
  }
  function applyModule() {
    const id = isNew ? crypto.randomUUID() : selected;
    if (isNew && draft.nodes.length >= 100) {
      message.warning('画布最多保存 100 个模块');
      return;
    }
    const before = draft.nodes.find((n) => n.id === id);
    const data = { ...values, title: values.title.trim(), needsReview: true };
    let next: CanvasDraft = {
      ...draft,
      nodes: isNew
        ? [
            ...draft.nodes,
            {
              id,
              type: 'module',
              position: {
                x: (draft.nodes.length % 3) * 270,
                y: Math.floor(draft.nodes.length / 3) * 190,
              },
              data,
            },
          ]
        : draft.nodes.map((n) => (n.id === id ? { ...n, data } : n)),
    };
    if (isNew) {
      next.edges = next.edges.filter((e) => e.id !== insertEdge);
      for (const [source, target] of [
        [upstream, id],
        [id, downstream],
      ])
        if (source && target) next.edges.push({ id: crypto.randomUUID(), source, target });
    }
    const replacedTarget = draft.edges.find((edge) => edge.id === insertEdge)?.target;
    next = markAffected(next, [
      ...affected(next, id),
      ...(isNew && replacedTarget ? [replacedTarget] : []),
    ]);
    const changed = isNew
      ? '新增模块'
      : '修改' +
        Object.keys(fields)
          .filter((key) => values[key] !== before?.data[key])
          .map((key) => fields[key as ContentField])
          .join('、');
    commit(
      next,
      `${changed}：${data.title}${isNew && insertEdge ? '；已拆分原连接，上下游合同待核对' : '；下游关联待核对'}`,
    );
    setSelected(id);
    setOpen(false);
    setPreview(false);
    message.success('已应用到画布草稿，保存后写入项目');
    if (isNew) setTimeout(() => flow.current?.fitView({ duration: 200, padding: 0.2 }), 50);
  }
  function remove() {
    if (!selectedNode) return;
    const links = draft.edges.filter((e) => e.source === selected || e.target === selected);
    const impacted = affected(draft, selected);
    modal.confirm({
      title: `删除“${selectedNode.data.title}”？`,
      content: (
        <>
          <p>同时移除 {links.length} 条相邻连接，不自动连接两端。可用“撤销”恢复。</p>
          <p>
            需要核对：
            {draft.nodes
              .filter((n) => impacted.includes(n.id))
              .map((n) => n.data.title)
              .join('、') || '当前没有已连接的下游模块'}
          </p>
        </>
      ),
      okText: '删除节点',
      okButtonProps: { danger: true },
      onOk: () => {
        commit(
          markAffected(
            {
              ...draft,
              nodes: draft.nodes.filter((n) => n.id !== selected),
              edges: draft.edges.filter((e) => e.source !== selected && e.target !== selected),
            },
            impacted,
          ),
          `删除模块：${selectedNode.data.title}；移除 ${links.length} 条连接，未自动重连，原提案及相关主张待修订`,
        );
        setSelected('');
        setOpen(false);
      },
    });
  }
  function toggle() {
    if (!selectedNode) return;
    const next = markAffected(
      {
        ...draft,
        nodes: draft.nodes.map((n) =>
          n.id === selected
            ? { ...n, data: { ...n.data, disabled: !n.data.disabled, needsReview: true } }
            : n,
        ),
      },
      affected(draft, selected),
    );
    commit(
      next,
      `${selectedNode.data.disabled ? '恢复' : '停用'}模块：${selectedNode.data.title}；连接保留，启用状态和关联主张待核对`,
    );
    setOpen(false);
  }
  function connect(connection: Connection) {
    if (draft.edges.length >= 300) {
      message.warning('连线数量已达上限');
      return;
    }
    if (
      !connection.source ||
      !connection.target ||
      connection.source === connection.target ||
      draft.edges.some((e) => e.source === connection.source && e.target === connection.target)
    )
      return;
    const next = {
      ...draft,
      edges: [
        ...draft.edges,
        { id: crypto.randomUUID(), source: connection.source, target: connection.target },
      ],
    };
    commit(
      markAffected(next, [connection.target, ...affected(next, connection.target)]),
      `连接：${draft.nodes.find((n) => n.id === connection.source)?.data.title} → ${draft.nodes.find((n) => n.id === connection.target)?.data.title}；输入输出待核对`,
    );
  }
  function edgeActions(edge: Edge) {
    const dialog = modal.confirm({
      title: '调整这条连接',
      content: `${draft.nodes.find((n) => n.id === edge.source)?.data.title} → ${draft.nodes.find((n) => n.id === edge.target)?.data.title}`,
      okText: '插入模块',
      onOk: () => add(edge.id),
      cancelText: '关闭',
      footer: (_, { OkBtn, CancelBtn }) => (
        <>
          <Button
            danger
            onClick={() => {
              dialog.destroy();
              commit(
                markAffected({ ...draft, edges: draft.edges.filter((e) => e.id !== edge.id) }, [
                  edge.target,
                  ...affected(draft, edge.target),
                ]),
                '删除连接；下游输入关系待核对',
              );
            }}
          >
            删除连接
          </Button>
          <CancelBtn />
          <OkBtn />
        </>
      ),
    });
  }
  function download(kind: 'md' | 'json') {
    if (reviewFormChanged || formChanged) {
      message.info('请先应用或取消正在编辑的内容，再导出');
      return;
    }
    const body =
      kind === 'md'
        ? exportDiscussion(draft, proposal)
        : JSON.stringify(cleanDraft(draft), null, 2);
    const url = URL.createObjectURL(
      new Blob([body], {
        type: kind === 'md' ? 'text/markdown;charset=utf-8' : 'application/json',
      }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `idea-canvas-${projectId}.${kind}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function save() {
    if (reviewFormChanged || formChanged) {
      message.info('请先应用或取消正在编辑的内容，再保存草稿');
      return;
    }
    const snapshot = cleanDraft(draft);
    setSaving(true);
    setSaveError('');
    try {
      const result = await request<CanvasResponse>(`/projects/${projectId}/idea-canvas`, {
        method: 'PUT',
        body: JSON.stringify({ sha256: hash, draft: snapshot }),
      });
      setHash(result.sha256);
      setBase(signature(snapshot));
      setServerStatus(result);
      message.success('画布草案已保存到项目');
      return result;
    } catch (error) {
      setSaveError((error as Error).message);
      return null;
    } finally {
      setSaving(false);
    }
  }
  async function reload() {
    const perform = async () => {
      try {
        const [latest, source] = await Promise.all([
          request<CanvasResponse>(`/projects/${projectId}/idea-canvas`),
          api.file(projectId, proposalPath),
        ]);
        if (source.sha256 !== sourceHash) {
          message.info('原提案有新版，请保留草稿后重新打开项目，避免混用版本');
          return;
        }
        const next = normalize(latest.draft || seedCanvas(proposal, sourceHash));
        setDraft(next);
        setBase(signature(next));
        setHash(latest.sha256);
        setServerStatus(latest);
        setPast([]);
        setFuture([]);
        setSaveError('');
      } catch (error) {
        message.error((error as Error).message);
      }
    };
    if (reviewFormChanged || formChanged) {
      message.info('请先应用或取消正在编辑的内容，再重新加载');
      return;
    }
    if (dirty)
      modal.confirm({
        title: '重新加载并放弃当前未保存的画布修改？',
        content: '需要保留时，请先下载 JSON 草稿。',
        onOk: perform,
      });
    else await perform();
  }
  async function submitRevision() {
    if (running || saving || submitting || reviewFormChanged || formChanged || stale) return;
    if (!hasRevisionChanges(draft)) {
      message.info('请先修改方案或添加意见，再提交 Agent 修订');
      return;
    }
    setSubmitting(true);
    setSaveError('');
    try {
      const persisted = dirty || !hash ? await save() : serverStatus;
      if (!persisted) return;
      const operation = await request<{ id: string }>(`/projects/${projectId}/runs`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'proposal_revise',
          proposal_sha256: persisted.sha256,
        }),
      });
      onOperation(operation.id);
      message.success('已提交本轮全部修改，Agent 修订后会回到这里供你复审');
    } catch (error) {
      setSaveError((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  }
  function approve() {
    modal.confirm({
      title: '批准这一版本并进入实验规划？',
      content:
        '将按你当前复审的方案正文生成正式 MD，锁定版本，再交给实验规划 Agent。此操作会调用模型进行实验规划，不会直接执行实验。',
      okText: '批准并进入实验规划',
      onOk: async () => {
        setSubmitting(true);
        try {
          const project = await api.project(projectId);
          const operation = await request<{ id: string }>(`/projects/${projectId}/runs`, {
            method: 'POST',
            body: JSON.stringify({
              action: 'proposal_approve',
              proposal_sha256: hash,
              checkpoint_token: project.checkpoint_token,
            }),
          });
          onOperation(operation.id);
          message.success('批准请求已提交，正在校验版本并交付实验规划');
        } catch (error) {
          setSaveError((error as Error).message);
          throw error;
        } finally {
          setSubmitting(false);
        }
      },
    });
  }
  const revision = serverStatus.revision;
  const hasChanges = hasRevisionChanges(draft);
  const decisionCount = revision?.approved ? 0 : revision?.questions.length || 0;
  const canApprove =
    serverStatus.canApprove &&
    !dirty &&
    !reviewFormChanged &&
    !formChanged &&
    !running &&
    !submitting;
  const canApply =
    serverStatus.canApply &&
    !dirty &&
    !reviewFormChanged &&
    !formChanged &&
    !running &&
    !saving &&
    !submitting;
  function applyRevision() {
    modal.confirm({
      title: '采用修改版作为正式方案？',
      content:
        '将保存当前已修订版本及冻结副本，项目保持完成状态。后续需要实验规划时，可向主控提出要求。',
      okText: '采用修改版',
      async onOk() {
        setSubmitting(true);
        try {
          await request(`/projects/${projectId}/idea-canvas/apply`, {
            method: 'POST',
            body: JSON.stringify({ sha256: hash }),
          });
          message.success('修改版已成为正式方案');
          await onApplied();
        } catch (error) {
          setSaveError((error as Error).message);
        } finally {
          setSubmitting(false);
        }
      },
    });
  }
  const enabled = new Set(draft.nodes.filter((n) => !n.data.disabled).map((n) => n.id));
  const methodGraph = (
    <div className="idea-graph" ref={graph}>
      <ReactFlow<ModuleNode>
        colorMode="dark"
        defaultEdgeOptions={{
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#5b6372', strokeWidth: 1.6 },
        }}
        nodes={draft.nodes}
        edges={draft.edges.map((e) => ({
          ...e,
          hidden: !enabled.has(e.source) || !enabled.has(e.target),
        }))}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={1.6}
        onInit={(instance) => {
          flow.current = instance;
        }}
        deleteKeyCode={null}
        onNodesChange={(changes) =>
          setDraft((current) => ({ ...current, nodes: applyNodeChanges(changes, current.nodes) }))
        }
        onNodeDragStart={() => {
          dragStart.current = draft;
        }}
        onNodeDragStop={(_, node) => {
          const before = dragStart.current;
          dragStart.current = null;
          if (
            before &&
            JSON.stringify(before.nodes.map((n) => n.position)) !==
              JSON.stringify(draft.nodes.map((n) => n.position))
          ) {
            setPast((p) => [...p.slice(-39), before]);
            setFuture([]);
          }
          setSelected(node.id);
        }}
        onNodeClick={(_, node) => details(node)}
        onConnect={connect}
        onEdgeClick={(_, edge) => edgeActions(edge)}
        aria-label="方法模块与连接"
      >
        <Background />
        <Controls showInteractive={false} />
        <Panel position="top-left" className="idea-graph-caption">
          <Tag color={dirty ? 'orange' : 'green'}>
            {dirty ? '未保存' : initial.sha256 || hash ? '项目草案' : '从提案整理'}
          </Tag>
          <span>
            {draft.nodes.length} 个模块 · {draft.edges.length} 条连接
          </span>
        </Panel>
      </ReactFlow>
    </div>
  );
  return (
    <section className={`idea-workspace ${running ? 'is-busy' : ''}`} aria-label="研究方案画布">
      <div className="idea-toolbar" inert={running || submitting}>
        <Space wrap size={6} className="idea-toolbar-views">
          <Button
            type={mode === 'overview' ? 'primary' : 'default'}
            onClick={() => changeMode('overview')}
          >
            方案总览
          </Button>
          <Button
            type={mode === 'canvas' ? 'primary' : 'default'}
            onClick={() => changeMode('canvas')}
          >
            方法画布
          </Button>
          {viewSwitch}
        </Space>
        <Space wrap size={6} className="idea-toolbar-actions">
          {mode === 'canvas' && (
            <Button onClick={() => add()} disabled={draft.nodes.length >= 100}>
              新增模块
            </Button>
          )}
          <Button
            title="撤销"
            aria-label="撤销"
            icon={<UndoOutlined />}
            disabled={!past.length || reviewFormChanged || formChanged}
            onClick={undo}
          />
          <Button
            title="重做"
            aria-label="重做"
            icon={<RedoOutlined />}
            disabled={!future.length || reviewFormChanged || formChanged}
            onClick={redo}
          />
          {mode === 'canvas' && (
            <Button onClick={() => setReviewOpen(true)} aria-expanded={reviewOpen}>
              模块检查{pending.length ? `（${pending.length}）` : ''}
            </Button>
          )}
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                { key: 'md', label: '导出给 Agent' },
                { key: 'json', label: '下载 JSON 草稿' },
                { type: 'divider' },
                { key: 'reload', label: '重新加载' },
                { key: 'rebuild', label: '从提案重建' },
                { type: 'divider' },
                { key: 'help', label: '操作说明' },
              ],
              onClick: ({ key }) => {
                if (key === 'md' || key === 'json') download(key);
                else if (key === 'reload') void reload();
                else if (key === 'rebuild' && !reviewFormChanged && !formChanged)
                  modal.confirm({
                    title: '按当前提案重建画布？',
                    content: '当前画布修改将被替换，可用撤销恢复。保存后才会更新项目草案。',
                    onOk: () => {
                      commit(
                        { ...seedCanvas(proposal, sourceHash), review: draft.review },
                        '按当前提案重建方法画布，保留审阅说明',
                      );
                      setTimeout(() => flow.current?.fitView({ padding: 0.2 }), 50);
                    },
                  });
                else if (key === 'help')
                  modal.info({
                    title: '如何操作方案画布',
                    content: (
                      <>
                        <p>
                          点击模块查看与编辑；拖动空白处平移画布，使用左下角按钮缩放或显示全图。
                        </p>
                        <p>
                          从右侧圆点拖到另一模块左侧圆点建立连线。点击连线可插入模块或删除连接。
                        </p>
                        <p>
                          点击“审阅”查看模块列表、待核对事项和修改记录。模块可以暂时停用，操作支持撤销。
                        </p>
                        <p>编辑后先应用到草稿，再保存画布。保存不会批准方案或开始实验。</p>
                      </>
                    ),
                  });
              },
            }}
          >
            <Button icon={<MoreOutlined />} aria-label="更多画布操作" title="更多画布操作" />
          </Dropdown>
          <Button
            type="primary"
            loading={saving}
            disabled={running || stale || !!formChanged || reviewFormChanged || (!dirty && !!hash)}
            onClick={save}
          >
            {mode === 'overview' ? '保存审阅草稿' : '保存画布'}
          </Button>
        </Space>
      </div>
      {active(status.operation?.status || '') ? (
        <RevisionProgress operation={status.operation} />
      ) : (
        running && (
          <Alert
            type="info"
            showIcon
            message={`项目正在进行${workflowStage ? `：${workflowStage}` : '后续研究'}。当前方案和已生成报告可继续查看。`}
          />
        )
      )}
      {stale && (
        <Alert
          type="warning"
          message="这份画布依据的是旧版提案，请先导出修改并核对新版，当前不能覆盖保存。"
        />
      )}
      {status.operation?.status === 'failed' && !running && (
        <Alert
          type="error"
          message="上次方案操作未完成，草稿仍保留"
          description={status.operation.error}
        />
      )}
      {saveError && (
        <Alert type="error" closable onClose={() => setSaveError('')} message={saveError} />
      )}
      <div
        ref={readingPane}
        className={`idea-reading-pane ${mode === 'canvas' ? 'is-canvas' : ''}`}
      >
        <div className="idea-canvas-view" hidden={mode !== 'canvas'} inert={running || submitting}>
          <Button className="idea-back-overview" onClick={() => changeMode('overview')}>
            ← 返回方案阅读位置
          </Button>
          {mode === 'canvas' && methodGraph}
        </div>
        <div hidden={mode !== 'overview'}>
          <ProposalOverview
            navigationRef={overviewNavigation}
            onCommentDraftChange={setCommentDraftChanged}
            review={draft.review!}
            revision={revision}
            changed={dirty}
            busy={running || submitting}
            onApply={(review, change) => commit({ ...draft, review }, change)}
            onEditingChange={setReviewFormChanged}
            onOpenCanvas={() => changeMode('canvas')}
            nodes={draft.nodes}
            changes={draft.changes}
            onOpenModule={details}
            onExport={() => download('md')}
          />
        </div>
      </div>
      {mode === 'overview' && (
        <footer className="proposal-workflow-actions">
          <div
            className={`proposal-workflow-note ${decisionCount && !running ? 'has-decisions' : ''}`}
          >
            <span>
              {running
                ? active(status.operation?.status || '')
                  ? '方案操作正在处理，完成后会更新本页；可在运行动态查看进度。'
                  : `项目正在进行${workflowStage ? `：${workflowStage}` : '后续研究'}；可通过文件目录或阶段产物查看已生成报告。`
                : commentDraftChanged
                  ? '有一条意见尚未加入本轮，请继续填写并加入。'
                  : revision?.approved
                    ? '已批准版本已锁定。新修改作为草稿保存，不影响已交付方案。'
                    : serverStatus.context === 'historical'
                      ? '当前查看历史提案：可以修订草稿；只有当前精炼检查点可批准交付。'
                      : serverStatus.context === 'auto'
                        ? serverStatus.canApply
                          ? '修改版已就绪。复核后可采用为正式方案，项目保持完成状态。'
                          : '自动模式：修改后提交 Agent 修订。已完成且尚未进入实验规划的方案可采用修改版。'
                        : decisionCount
                          ? `Agent 提出了 ${decisionCount} 个待决问题供你审阅；可补充意见后修订，也可批准当前方案进入实验规划。`
                          : dirty || !revision?.synced
                            ? '集中修改后提交 Agent 统一修订；满意后再批准交付。'
                            : '请复审本轮修改和关联影响，满意后批准进入实验规划。'}
            </span>
            {!!decisionCount && !running && (
              <Button
                type="link"
                className="proposal-locate-decisions"
                onClick={() => {
                  setMode('overview');
                  requestAnimationFrame(() => overviewNavigation.current?.showDecisions());
                }}
              >
                查看待决问题（{decisionCount}） ↑
              </Button>
            )}
          </div>
          <div className="proposal-workflow-buttons">
            <Button
              disabled={running || submitting}
              onClick={() => {
                setMode('overview');
                requestAnimationFrame(() => overviewNavigation.current?.openFeedback());
              }}
            >
              {commentDraftChanged ? '继续填写意见' : '添加修改意见'}
            </Button>
            <Button
              type="primary"
              loading={submitting}
              disabled={
                running ||
                saving ||
                reviewFormChanged ||
                !!formChanged ||
                stale ||
                !hasChanges ||
                (revision?.approved && revision.synced && !dirty)
              }
              onClick={() => void submitRevision()}
            >
              提交 Agent 修订
            </Button>
            {serverStatus.context === 'checkpoint' && (
              <Button aria-label="批准并进入实验规划" disabled={!canApprove} onClick={approve}>
                批准并进入实验规划
              </Button>
            )}
            {serverStatus.context === 'auto' && serverStatus.canApply && (
              <Button disabled={!canApply} onClick={applyRevision}>
                采用修改版
              </Button>
            )}
          </div>
        </footer>
      )}
      <Drawer
        title="方案审阅"
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        width={420}
        className="idea-review-drawer"
      >
        <Tabs
          activeKey={reviewTab}
          onChange={setReviewTab}
          items={[
            {
              key: 'pending',
              label: `待核对 ${pending.length}`,
              children: (
                <div className="idea-review-content">
                  {pending.length ? (
                    <ul>
                      {pending.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>没有检测到结构性待办；方法是否有效仍需要实验验证。</p>
                  )}
                </div>
              ),
            },
            {
              key: 'changes',
              label: '修改记录',
              children: (
                <div className="idea-review-content">
                  {draft.changes.length ? (
                    <ol>
                      {[...draft.changes].reverse().map((change, i) => (
                        <li key={i}>{change}</li>
                      ))}
                    </ol>
                  ) : (
                    <p>尚无人工修改。保存画布不会批准方案或开始实验。</p>
                  )}
                </div>
              ),
            },
            {
              key: 'modules',
              label: `模块 ${draft.nodes.length}`,
              children: (
                <div className="idea-node-list" aria-label="模块快捷入口">
                  {draft.nodes.map((node) => (
                    <Button
                      key={node.id}
                      onClick={() => {
                        setReviewOpen(false);
                        details(node);
                      }}
                    >
                      {node.data.title}
                      {node.data.disabled ? '（停用）' : node.data.needsReview ? '（待核对）' : ''}
                    </Button>
                  ))}
                </div>
              ),
            },
          ]}
        />
      </Drawer>
      <Drawer
        title={isNew ? '新增方法模块' : values.title}
        open={open}
        onClose={closeDetails}
        width={620}
        destroyOnHidden
        extra={
          <Space>
            <Button
              onClick={() => {
                window.speechSynthesis.cancel();
              }}
            >
              停止讲解
            </Button>
          </Space>
        }
      >
        {!isNew && (
          <Space wrap className="idea-detail-actions">
            <Button onClick={() => setEditing(!editing)}>
              {editing ? '阅读说明' : '编辑模块'}
            </Button>
            <Button
              onClick={() => {
                const text = [
                  values.title,
                  values.purpose,
                  values.example,
                  values.steps,
                  values.output,
                ]
                  .filter(Boolean)
                  .join('。');
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'zh-CN';
                window.speechSynthesis.speak(utterance);
              }}
            >
              听模块讲解
            </Button>
            <Button onClick={toggle}>
              {selectedNode?.data.disabled ? '恢复模块' : '暂时停用'}
            </Button>
            <Button danger onClick={remove}>
              删除模块
            </Button>
          </Space>
        )}
        {!editing ? (
          <>
            <div className="idea-detail-lead">
              {values.purpose || '此模块的职责尚待明确，可进入编辑补充。'}
            </div>
            {(['example', 'input', 'steps', 'output', 'parameters', 'limits'] as const).map(
              (key) => (
                <section className="idea-detail-section" key={key}>
                  <h3>{fields[key]}</h3>
                  <p>{values[key] || '待补充，可由你编辑确定。'}</p>
                </section>
              ),
            )}
            {values.sourceContent && (
              <section className="idea-detail-section">
                <h3>从当前提案整理的具体说明</h3>
                <article className="markdown">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{values.sourceContent}</ReactMarkdown>
                </article>
              </section>
            )}
            <section className="idea-detail-section">
              <h3>关联模块</h3>
              <p>
                {draft.nodes
                  .filter((n) => affected(draft, selected).includes(n.id))
                  .map((n) => n.data.title)
                  .join('、') || '尚未连接到下游模块。'}
              </p>
            </section>
            {selectedNode?.data.needsReview && (
              <Button
                onClick={() => {
                  if (!values.purpose || !values.input || !values.steps || !values.output) {
                    message.warning('请先补全职责、输入、处理过程和输出');
                    return;
                  }
                  commit(
                    {
                      ...draft,
                      nodes: draft.nodes.map((n) =>
                        n.id === selected ? { ...n, data: { ...n.data, needsReview: false } } : n,
                      ),
                    },
                    `人工核对：${values.title}`,
                  );
                  setOpen(false);
                }}
              >
                我已核对这个模块
              </Button>
            )}
          </>
        ) : (
          <Form layout="vertical" onFinish={() => setPreview(true)}>
            {isNew && (
              <div className="idea-insertion">
                <Form.Item label="接收哪个模块的输出">
                  <Select
                    aria-label="上游模块"
                    allowClear
                    value={upstream}
                    onChange={setUpstream}
                    options={draft.nodes.map((n) => ({ value: n.id, label: n.data.title }))}
                  />
                </Form.Item>
                <Form.Item label="将输出交给哪个模块">
                  <Select
                    aria-label="下游模块"
                    allowClear
                    value={downstream}
                    onChange={setDownstream}
                    options={draft.nodes.map((n) => ({ value: n.id, label: n.data.title }))}
                  />
                </Form.Item>
                <p>可以先独立新增，再在画布上连接。连接含义与输入输出需一起核对。</p>
              </div>
            )}
            <ModuleFields
              values={values}
              setValues={setValues}
              invalidate={() => setPreview(false)}
            />
            <Button
              type="primary"
              htmlType="submit"
              disabled={!values.title.trim() || (!isNew && !formChanged)}
            >
              预览修改影响
            </Button>
            {preview && (
              <section className="idea-preview">
                <h3>{isNew ? '将新增模块' : '将修改的内容'}</h3>
                {Object.keys(fields)
                  .filter((key) =>
                    isNew ? !!values[key] : values[key] !== selectedNode?.data[key],
                  )
                  .map((key) => (
                    <div key={key}>
                      <strong>{fields[key as ContentField]}</strong>
                      {!isNew && (
                        <p className="idea-before">
                          当前：{String(selectedNode?.data[key] || '未填写')}
                        </p>
                      )}
                      <p>修改后：{String(values[key])}</p>
                    </div>
                  ))}
                <p>
                  影响范围：
                  {isNew
                    ? [upstream, downstream]
                        .filter(Boolean)
                        .map((id) => draft.nodes.find((n) => n.id === id)?.data.title)
                        .join('、') || '当前没有连接'
                    : draft.nodes
                        .filter((n) => affected(draft, selected).includes(n.id))
                        .map((n) => n.data.title)
                        .join('、') || '当前没有连接的下游'}
                </p>
                <p>关联模块会标为待核对，尚不会自动重写它们的方法内容。</p>
                <Button type="primary" onClick={applyModule}>
                  应用到画布草稿
                </Button>
              </section>
            )}
          </Form>
        )}
      </Drawer>
    </section>
  );
}

function ModuleFields({
  values,
  setValues,
  invalidate,
}: {
  values: ModuleData;
  setValues: Dispatch<SetStateAction<ModuleData>>;
  invalidate: () => void;
}) {
  return Object.entries(fields).map(([key, label]) => (
    <Form.Item label={label} key={key} required={key === 'title'}>
      <Input.TextArea
        aria-label={label}
        value={values[key] as string}
        autoSize={{ minRows: key === 'title' ? 1 : 2, maxRows: 10 }}
        maxLength={key === 'title' ? 100 : key === 'steps' ? 20000 : 10000}
        onChange={(event) => {
          setValues((current) => ({ ...current, [key]: event.target.value }));
          invalidate();
        }}
      />
    </Form.Item>
  ));
}
