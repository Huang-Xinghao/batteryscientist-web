import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Dropdown, Skeleton, Space, Tabs, Tooltip } from 'antd';
import {
  FileTextOutlined,
  FolderOpenOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { useParams, useSearchParams } from 'react-router-dom';
import { active, api, type NodeInfo, type RunInput, type UserQuestion } from '../../api/client';
import { Artifact } from './Artifact';
import { ChargeTrack } from './ChargeTrack';
import { ArtifactDirectory } from './ArtifactDirectory';
import { Conversation } from './Conversation';
import { FigureGallery } from './FigureGallery';
import { RunDialog } from './RunDialog';
import { reports } from './stages';
import { stageArtifacts, artifactStage } from './artifactStages';
import { useActivity } from './useActivity';

export function Workbench({ nodes }: { nodes: NodeInfo[] }) {
  const { id = '' } = useParams();
  // A project owns its drafts, open files and conversation scroll position.
  return <ProjectWorkbench key={id} id={id} nodes={nodes} />;
}

function ProjectWorkbench({ id, nodes }: { id: string; nodes: NodeInfo[] }) {
  const [searchParams] = useSearchParams();
  const ideaCanvasOpen = ['idea-canvas', 'idea-review'].includes(searchParams.get('view') || '');
  const { message, modal } = App.useApp();
  const client = useQueryClient();
  const activity = useActivity(id);
  // Live events refresh these queries as things change; polling is only a
  // fallback, fast while the event stream is down and a slow heartbeat otherwise.
  const live = activity.connection === 'connected';
  const project = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.project(id),
    // Runs started from a terminal change state without events, so keep a
    // moderate check while a run is active.
    refetchInterval: (query) =>
      !live ? 4000 : active(query.state.data?.status || '') ? 8000 : 30000,
  });
  const files = useQuery({
    queryKey: ['files', id],
    queryFn: () => api.files(id),
    refetchInterval: live ? 60000 : 10000,
  });
  const [selectedFile, setSelectedFile] = useState(ideaCanvasOpen ? reports.refine : '');
  const [selectedNode, setSelectedNode] = useState(ideaCanvasOpen ? 'refine' : '');
  const [runOpen, setRunOpen] = useState(false);
  const [mode, setMode] = useState<'auto' | 'expert'>('expert');
  useEffect(() => {
    if (project.data?.state.mode === 'auto' || project.data?.state.mode === 'expert')
      setMode(project.data.state.mode);
  }, [project.data?.state.mode]);
  const [tab, setTab] = useState('report');
  const [mobilePane, setMobilePane] = useState(ideaCanvasOpen ? 'workspace' : 'conversation');
  const [maximized, setMaximized] = useState(false);
  const [reviewRequest, setReviewRequest] = useState(ideaCanvasOpen ? 1 : 0);
  const [chatWidth, setChatWidth] = useState(38);
  const [userResized, setUserResized] = useState(false);
  const dirtyRef = useRef(false);
  const layoutRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef(false);
  const run = useMutation({
    mutationFn: (values: RunInput) => api.run(id, values),
    onSuccess: (result) => {
      setRunOpen(false);
      activity.refresh();
      client.invalidateQueries({ queryKey: ['project', id] });
      client.invalidateQueries({ queryKey: ['projects'] });
      if ('id' in result) message.success('运行请求已提交');
    },
    onError: (reason: Error) => {
      message.error(reason.message);
      client.invalidateQueries({ queryKey: ['project', id] });
    },
  });
  const sendMessage = useMutation({
    mutationFn: (body: { prompt: string; mode: 'auto' | 'expert' }) => api.message(id, body),
    onSuccess: (result) => {
      activity.refresh();
      client.invalidateQueries({ queryKey: ['project', id] });
      client.invalidateQueries({ queryKey: ['projects'] });
      if ('id' in result) message.success('任务已提交');
    },
    onError: (reason: Error) => message.error(reason.message),
  });
  const stop = useMutation({
    mutationFn: () => api.stop(id),
    onSuccess: () => {
      message.success('已请求停止，正在保存执行状态');
      client.invalidateQueries({ queryKey: ['project', id] });
    },
    onError: (reason: Error) => message.error(reason.message),
  });
  function stopRun() {
    modal.confirm({
      title: '停止当前运行？',
      content:
        '将通知本轮主控和角色任务取消，并保留已保存的产物。收到执行回执后确认结果；结果不明时需先核查。',
      okText: '停止运行',
      okButtonProps: { danger: true },
      onOk: () => stop.mutateAsync(),
    });
  }
  function openFile(path: string, node?: string) {
    if (path === file) {
      if (node) setSelectedNode(node);
      setTab('report');
      setMobilePane('workspace');
      return;
    }
    const open = () => {
      dirtyRef.current = false;
      setSelectedFile(path);
      if (node) setSelectedNode(node);
      setTab('report');
      setMobilePane('workspace');
    };
    if (dirtyRef.current && path !== file)
      modal.confirm({ title: '放弃未保存的修改？', onOk: open });
    else open();
  }
  function pickStage(node: string) {
    const path = node === 'paper_write' ? 'paper/main.pdf' : reports[node];
    if (node === 'literature' || files.data?.files.some((entry) => entry.path === path)) {
      openFile(path, node);
      return;
    }
    const label = nodes.find((item) => item.id === node)?.label || node;
    message.info(`${label}还没有产物，前一阶段完成后才会执行。`);
  }
  if (project.isPending)
    return (
      <div className="page">
        <Skeleton active paragraph={{ rows: 12 }} />
      </div>
    );
  if (project.isError || !project.data)
    return (
      <div className="page">
        <Alert
          type="error"
          showIcon
          message="项目加载失败"
          description={(project.error as Error)?.message}
          action={<Button onClick={() => project.refetch()}>重试</Button>}
        />
      </div>
    );
  const p = project.data;
  const running = active(p.status);
  const checkpoint = p.status === 'awaiting_user' ? p.state.expert_checkpoint : undefined;
  const fileList = files.data?.files || [];
  const deliverables = stageArtifacts(fileList);
  const currentNode =
    selectedNode ||
    (p.runs[0]?.options.action === 'revise' ? String(p.progress.current_node || '') : '') ||
    p.state.current_node ||
    nodes[0]?.id;
  const completedNodes = new Set(p.state.history?.map((entry) => entry.node));
  // Keep the automatic model handoff visible while downstream work runs.
  // Explicit file selections still take precedence; completed papers open normally.
  const showAutoProposal =
    p.state.mode === 'auto' &&
    running &&
    completedNodes.has('refine') &&
    !completedNodes.has('paper_write') &&
    fileList.some((entry) => entry.path === reports.refine);
  const stageFile =
    checkpoint?.node === currentNode
      ? checkpoint.report
      : showAutoProposal
        ? reports.refine
        : reports[currentNode];
  const defaultFile = stageFile === 'paper/main.tex' ? 'paper/main.pdf' : stageFile;
  const file =
    selectedFile ||
    (defaultFile === reports.literature || fileList.some((entry) => entry.path === defaultFile)
      ? defaultFile
      : deliverables.find((entry) => artifactStage(entry.path) === currentNode)?.path || '');
  const latexOpen = /\.tex$/i.test(file) && tab === 'report';
  const paperFocus = tab === 'report' && (latexOpen || /^paper\/.*\.pdf$/i.test(file));
  const proposalFocus = file === reports.refine;
  const visibleChatWidth = latexOpen && !userResized ? 28 : chatWidth;
  const phase = nodes.find((node) => node.id === currentNode);
  async function send(text: string, mode: 'auto' | 'expert') {
    if (dirtyRef.current) {
      message.warning('请先保存产物修改，再提交研究指令');
      throw new Error('unsaved');
    }
    if (checkpoint) {
      const values: RunInput = {
        action: 'review',
        answer: text,
        checkpoint_token: p.checkpoint_token,
      };
      await new Promise<void>((resolve, reject) => {
        modal.confirm({
          title: text.trim() ? '提交意见并继续研究？' : '确认当前产物并继续？',
          content: '系统将校验当前产物版本，并根据反馈继续研究。',
          onOk: async () => {
            try {
              await run.mutateAsync(values);
              resolve();
            } catch (reason) {
              reject(reason);
              throw reason;
            }
          },
          onCancel: () => reject(new Error('cancelled')),
        });
      });
    } else {
      const result = await sendMessage.mutateAsync({ prompt: text, mode });
      if ('accepted' in result && !result.accepted) {
        message.info(result.reply);
        throw new Error('not accepted');
      }
    }
  }
  return (
    <div className="workbench-page">
      <ChargeTrack
        project={p}
        nodes={nodes}
        selected={
          Object.keys(reports).find((node) => reports[node] === file && node === currentNode) ||
          Object.keys(reports).find((node) => reports[node] === file)
        }
        onPick={pickStage}
      />
      <nav className="mobile-pane-nav" aria-label="工作台视图">
        <Button
          aria-label="研究对话"
          type={mobilePane === 'conversation' ? 'primary' : 'text'}
          icon={<MessageOutlined />}
          onClick={() => {
            setMobilePane('conversation');
            setMaximized(false);
          }}
        >
          研究对话
        </Button>
        <Button
          aria-label="产物工作区"
          type={mobilePane === 'workspace' ? 'primary' : 'text'}
          icon={<FolderOpenOutlined />}
          onClick={() => setMobilePane('workspace')}
        >
          产物工作区
        </Button>
      </nav>
      <div
        ref={layoutRef}
        className={`research-layout pane-${mobilePane} ${maximized ? 'workspace-maximized' : ''} ${latexOpen ? 'latex-open' : ''} ${paperFocus ? 'paper-focus' : ''} ${proposalFocus ? 'proposal-focus' : ''}`}
        style={{ '--chat-width': `${visibleChatWidth}%` } as CSSProperties}
      >
        <Conversation
          mode={mode}
          onModeChange={setMode}
          project={p}
          files={fileList}
          nodes={nodes}
          events={activity.events}
          connection={activity.connection}
          activityError={activity.error}
          hasOlder={activity.hasOlder}
          loadingOlder={activity.loadingOlder}
          loadOlder={activity.loadOlder}
          onOpen={openFile}
          onReviewProposal={() => {
            if (dirtyRef.current) {
              message.info('请先应用并保存，或撤销当前修改，再查看方案');
              return;
            }
            openFile(reports.refine, 'refine');
            setReviewRequest((value) => value + 1);
          }}
          onAnswer={async (question: UserQuestion, answer: string) => {
            if (dirtyRef.current) throw new Error('请先保存或撤销产物修改，再回答问题');
            try {
              await api.answerQuestion(id, question, answer);
              message.success('回答已送回原任务，正在继续');
            } finally {
              client.invalidateQueries({ queryKey: ['project', id] });
            }
          }}
          onSend={send}
          onStop={stopRun}
          onSettings={() => setRunOpen(true)}
          pending={run.isPending || sendMessage.isPending}
        />
        <div
          className="workspace-resizer"
          role="separator"
          aria-label="调整工作区宽度"
          aria-orientation="vertical"
          aria-valuemin={25}
          aria-valuemax={55}
          aria-valuenow={visibleChatWidth}
          tabIndex={0}
          onKeyDown={(event) => {
            if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
              event.preventDefault();
              setUserResized(true);
              setChatWidth(() =>
                Math.min(55, Math.max(25, visibleChatWidth + (event.key === 'ArrowLeft' ? -2 : 2))),
              );
            }
          }}
          onPointerDown={(event) => {
            setUserResized(true);
            dragRef.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!dragRef.current || !layoutRef.current) return;
            const bounds = layoutRef.current.getBoundingClientRect();
            setChatWidth(
              Math.min(55, Math.max(25, ((event.clientX - bounds.left) / bounds.width) * 100)),
            );
          }}
          onPointerUp={(event) => {
            dragRef.current = false;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => {
            dragRef.current = false;
          }}
        >
          <span />
        </div>
        <section className="workspace-panel" aria-label="产物工作区">
          <div className="workspace-panel-header">
            <div>
              <FolderOpenOutlined />
              <h2>{proposalFocus ? '研究方案' : '工作区'}</h2>
              <span className="workspace-file-count">{deliverables.length} 个产物</span>
            </div>
            <Space size={4}>
              <Tooltip title={maximized ? '恢复对话与工作区' : '展开工作区'}>
                <Button
                  type="text"
                  size="small"
                  aria-label={maximized ? '恢复分栏' : '展开工作区'}
                  icon={maximized ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                  onClick={() => setMaximized(!maximized)}
                />
              </Tooltip>
            </Space>
          </div>
          <Tabs
            activeKey={tab}
            onChange={setTab}
            className="workspace-tabs"
            items={[
              {
                key: 'report',
                label: '产物',
                children: (
                  <>
                    <div className="file-selector">
                      {paperFocus && (
                        <Dropdown
                          trigger={['click']}
                          menu={{
                            items: [{ key: 'figures', label: '图片画廊' }],
                            onClick: ({ key }) => setTab(key),
                          }}
                        >
                          <Button
                            type="text"
                            size="small"
                            aria-label="文件与产物"
                            title="文件与产物"
                            icon={<FolderOpenOutlined />}
                          />
                        </Dropdown>
                      )}
                      <ArtifactDirectory
                        files={deliverables}
                        value={file}
                        onChange={(path) => openFile(path)}
                        truncated={files.data?.truncated}
                      />
                      {paperFocus && (
                        <Button
                          type="text"
                          size="small"
                          aria-label={maximized ? '恢复分栏' : '展开工作区'}
                          title={maximized ? '恢复分栏' : '展开工作区'}
                          icon={maximized ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                          onClick={() => setMaximized(!maximized)}
                        />
                      )}
                    </div>
                    {files.isError && (
                      <Alert
                        type="warning"
                        message="文件目录加载失败"
                        action={
                          <Button size="small" onClick={() => files.refetch()}>
                            重试
                          </Button>
                        }
                      />
                    )}
                    <Artifact
                      key={`${id}:${file}`}
                      reviewRequest={reviewRequest}
                      collaborationMode={p.state.mode === 'auto' ? 'auto' : 'expert'}
                      projectId={id}
                      onOpen={openFile}
                      research={{
                        goal: p.state.project_goal || '',
                        events: activity.events,
                        error: activity.error,
                      }}
                      path={file}
                      running={running}
                      live={live}
                      workflowStage={
                        nodes.find(
                          (node) => node.id === (p.progress.current_node || p.state.current_node),
                        )?.label
                      }
                      files={fileList}
                      onDirtyChange={(dirty) => {
                        dirtyRef.current = dirty;
                      }}
                    />
                  </>
                ),
              },
              {
                key: 'figures',
                label: '图片',
                children: <FigureGallery projectId={id} files={deliverables} />,
              },
            ]}
          />
          <footer className="workspace-status">
            <FileTextOutlined />
            <span>{phase?.label || '研究产物'}</span>
            <span>
              {p.state.mode === 'expert'
                ? '专家模式'
                : p.state.mode === 'auto'
                  ? '自动模式'
                  : '待配置'}
            </span>
          </footer>
        </section>
      </div>
      <RunDialog
        mode={mode}
        onModeChange={setMode}
        open={runOpen}
        onClose={() => setRunOpen(false)}
        onRun={(values) => {
          if (dirtyRef.current) {
            message.warning('请先保存产物修改，再启动研究');
            return;
          }
          run.mutate(values);
        }}
        pending={run.isPending}
        project={p}
        nodes={nodes}
      />
    </div>
  );
}
