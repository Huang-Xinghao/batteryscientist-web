import { useEffect, useRef, useState } from 'react';
import { Alert, App, Button, Input, Select, Tooltip } from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckOutlined,
  LoadingOutlined,
  SettingOutlined,
  StopOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  active,
  statusLabels,
  type ActivityEvent,
  type NodeInfo,
  type Project,
  type ProjectFile,
  type UserQuestion,
} from '../../api/client';
import { formatDate } from '../../lib/date';
import { reports } from './stages';
import { TaskQuestion } from './TaskQuestion';
import { AgentRoster } from './AgentRoster';
import {
  agentNames,
  agentActivity,
  visibleAgent,
  currentActor,
  eventActor,
  eventMatches,
  type AgentFilter,
} from './agents';
import {
  activeOperation,
  operationLabel,
  activityLabel,
  conversationEvents,
} from './chat/activity';
import { MessageActions } from './chat/MessageActions';
import { ChatArtifactCard } from './chat/ChatArtifactCard';
import './chat/conversation.css';

function visibleText(value: unknown) {
  return typeof value === 'string'
    ? value.replace(/<think>[\s\S]*?<\/think>|<think>[\s\S]*$/gi, '').trim()
    : '';
}

export function Conversation({
  mode,
  onModeChange,
  project,
  files,
  nodes,
  events,
  connection,
  activityError,
  hasOlder,
  loadingOlder,
  loadOlder,
  onOpen,
  onReviewProposal,
  onSend,
  onAnswer,
  onStop,
  onSettings,
  pending,
}: {
  mode: 'auto' | 'expert';
  onModeChange: (mode: 'auto' | 'expert') => void;
  project: Project;
  files: ProjectFile[];
  nodes: NodeInfo[];
  events: ActivityEvent[];
  connection: string;
  activityError: string;
  hasOlder: boolean;
  loadingOlder: boolean;
  loadOlder: () => Promise<void>;
  onOpen: (path: string) => void;
  onReviewProposal: () => void;
  onSend: (text: string, mode: 'auto' | 'expert') => Promise<void>;
  onAnswer: (question: UserQuestion, answer: string) => Promise<void>;
  onStop: () => void;
  onSettings: () => void;
  pending: boolean;
}) {
  const { modal } = App.useApp();
  const [text, setText] = useState('');
  const [answerDraft, setAnswerDraft] = useState<{ key: string; values: string[] }>({
    key: '',
    values: [],
  });
  const [atBottom, setAtBottom] = useState(true);
  const [agentFilter, setAgentFilter] = useState<AgentFilter>('follow');
  const visibleRole = visibleAgent(project, events, agentFilter);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<import('antd').InputRef>(null);
  const stick = useRef(true);
  const running = active(project.status);
  const checkpoint =
    project.status === 'awaiting_user' ? project.state.expert_checkpoint : undefined;
  const reviewingProposal = checkpoint?.node === 'refine';
  const questions = checkpoint?.questions || [];
  const checkpointKey = JSON.stringify([
    project.runs[0]?.id,
    checkpoint?.node,
    checkpoint?.summary,
    questions,
  ]);
  const answers = answerDraft.key === checkpointKey ? answerDraft.values : [];
  const answered = questions.filter((_, index) => answers[index]?.trim()).length;
  const feedback = checkpoint
    ? [
        ...questions.flatMap((question, index) =>
          answers[index]?.trim()
            ? [`问题 ${index + 1}：${question}\n回答：${answers[index].trim()}`]
            : [],
        ),
        ...(text.trim() ? [answered ? `补充意见：${text.trim()}` : text.trim()] : []),
      ].join('\n\n')
    : text;
  const tooLong = feedback.length > 20000;
  const nodeLabel = (id: unknown) =>
    nodes.find((node) => node.id === id)?.label || String(id || '研究');
  useEffect(() => {
    if (stick.current && scroller.current)
      scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [events, project.status, project.runs.length]);
  async function send() {
    if (pending || tooLong || (!checkpoint && !text.trim())) return;
    try {
      await onSend(feedback, mode);
      setText('');
      setAnswerDraft({ key: '', values: [] });
      stick.current = true;
    } catch {
      // Keep the draft when submission or version validation fails.
    }
  }
  function reuseInstruction(value: string) {
    if (text.trim() && text !== value) {
      modal.confirm({
        title: '替换输入框中未发送的草稿？',
        content: '当前草稿将被这条指令替换。',
        onOk: () => {
          setText(value);
          input.current?.focus();
        },
      });
    } else {
      setText(value);
      input.current?.focus();
    }
  }
  const completedTools = new Set(
    events
      .filter((event) => event.kind === 'tool_end' && event.data.call_id)
      .map(
        (event) =>
          `${event.run_id}:${event.data.phase}:${event.data.iteration}:${event.data.call_id}`,
      ),
  );
  const eventViews = conversationEvents(events).filter((event) => {
    if (!eventMatches(event, visibleRole)) return false;
    if (event.kind === 'conversation_turn' && event.data.run_id) return false;
    if (
      [
        'operation_progress',
        'model_heartbeat',
        'project_registered',
        'file_saved',
        'run_requested',
        'run_started',
        'workflow_start',
        'phase_end',
        'workflow_end',
        'model_start',
        'model_end',
      ].includes(event.kind)
    )
      return false;
    if (
      event.kind === 'tool_start' &&
      completedTools.has(
        `${event.run_id}:${event.data.phase}:${event.data.iteration}:${event.data.call_id}`,
      )
    )
      return false;
    return true;
  });
  const turns = project.runs
    .filter(
      (run) =>
        run.options.action === 'review' ||
        String(run.options.message_prompt || run.options.prompt || '').trim(),
    )
    .map((run) => ({
      key: `user-${run.id}`,
      time: run.created_at,
      text:
        run.options.action === 'review'
          ? String(run.options.answer || '确认当前产物，继续研究。')
          : String(run.options.message_prompt || run.options.prompt),
      label: run.options.action === 'review' ? '审阅反馈' : '研究指令',
    }));
  const timeline = [
    ...turns.map((turn) => ({ ...turn, event: undefined as ActivityEvent | undefined })),
    ...eventViews.map((event) => ({
      key: `event-${event.id}`,
      time: event.created_at,
      event,
      text: '',
      label: '',
    })),
  ].sort((a, b) => a.time.localeCompare(b.time));
  const persistedStages = [
    ...new Set((project.state.history || []).map((entry) => entry.node).filter(Boolean)),
  ];
  const showHistory = !events.some((event) => event.kind === 'node_end');
  const initialPromptShown = turns.some((turn) => turn.text === project.state.project_goal);
  const actor = currentActor(project, events);
  const operation = activeOperation(project);
  const latestActivity = agentActivity(project, events, actor);
  return (
    <section className="conversation-panel" aria-label="研究对话">
      <div className="conversation-heading">
        <span>
          <span className={`connection-dot ${connection === 'connected' ? 'online' : ''}`} />{' '}
          研究对话
        </span>
        <Tooltip
          title={connection === 'connected' ? '执行事件实时同步' : '连接重试中，每 5 秒自动同步'}
        >
          <small>
            {running ? 'Agent 正在工作' : connection === 'connected' ? '实时同步' : '正在同步'}
          </small>
        </Tooltip>
      </div>
      <AgentRoster
        project={project}
        events={events}
        nodes={nodes}
        selected={agentFilter}
        onSelect={setAgentFilter}
      />
      {running && (visibleRole === 'all' || visibleRole === actor) && (
        <div className="live-activity" role="status" aria-label="当前执行进展">
          <span className="activity-indicator">
            <LoadingOutlined spin />
          </span>
          <div>
            <strong>
              {agentNames[actor]} ·{' '}
              {project.status === 'stopping'
                ? '正在保存并停止'
                : operation
                  ? operationLabel(operation)
                  : activityLabel(latestActivity)}
            </strong>
            <small>
              {nodeLabel(latestActivity?.data.phase || project.state.current_node)}
              {latestActivity?.data.iteration ? ` · 第 ${latestActivity.data.iteration} 轮` : ''}
              {latestActivity?.data.waited_seconds
                ? ` · 已等待 ${latestActivity.data.waited_seconds} 秒`
                : ''}
              {operation
                ? ` · 已耗时 ${Math.round(Number(operation.elapsed_seconds || 0))} 秒`
                : ''}
              {operation?.checks_completed
                ? ` · 已完成 ${operation.checks_completed} 次证据检查`
                : ''}
              {operation
                ? ` · 最近活动距今 ${Math.round(Number(operation.activity_age_seconds || 0))} 秒`
                : ''}
              {' · 进展将实时更新'}
            </small>
          </div>
        </div>
      )}
      <div
        className="conversation-scroll"
        ref={scroller}
        onScroll={() => {
          const element = scroller.current!;
          stick.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
          setAtBottom(stick.current);
        }}
      >
        <div className="conversation-messages">
          {hasOlder && (
            <Button
              type="text"
              block
              loading={loadingOlder}
              onClick={async () => {
                const height = scroller.current?.scrollHeight || 0;
                stick.current = false;
                await loadOlder();
                requestAnimationFrame(() => {
                  if (scroller.current)
                    scroller.current.scrollTop += scroller.current.scrollHeight - height;
                });
              }}
            >
              加载更早的执行记录
            </Button>
          )}
          {project.state.project_goal && !initialPromptShown && (
            <details className="research-goal">
              <summary>主控整理的研究目标</summary>
              <p>{project.state.project_goal}</p>
              <small>由主控根据研究指令整理，原始指令保留在对话中。</small>
            </details>
          )}
          {!project.state.project_goal && !timeline.length && (
            <div className="conversation-welcome">
              <span className="agent-symbol">✦</span>
              <h2>从一个研究问题开始</h2>
              <p>
                告诉 Paper Agent
                你想探索什么。分析进度、工具调用和研究输出会出现在这里，阶段产物会汇入右侧工作区。
              </p>
            </div>
          )}
          {showHistory && persistedStages.length > 0 && (
            <article className="chat-message agent-message">
              <div className="message-role">
                <span className="agent-symbol">✦</span> Paper Agent <small>已有研究进展</small>
              </div>
              <p className="history-explanation">
                已载入项目保存的阶段产物。较早运行未记录的对话和模型输出无法还原。
              </p>
              <div className="chat-artifacts">
                {persistedStages.map(
                  (node) =>
                    reports[node!] && (
                      <ChatArtifactCard
                        key={node}
                        projectId={project.id}
                        path={reports[node!]}
                        title={nodeLabel(node)}
                        file={files.find((file) => file.path === reports[node!])}
                        onOpen={onOpen}
                      />
                    ),
                )}
              </div>
            </article>
          )}
          {timeline.map((item) => {
            const event = item.event;
            if (!event)
              return (
                <article key={item.key} className="chat-message user-message">
                  <div className="message-role">
                    你 · {item.label}
                    <time>{formatDate(item.time)}</time>
                  </div>
                  <p>{item.text}</p>
                  <MessageActions
                    content={item.text}
                    onReuse={
                      !running && !pending && !checkpoint
                        ? () => reuseInstruction(item.text)
                        : undefined
                    }
                  />
                </article>
              );
            const data = event.data;
            if (event.kind === 'conversation_turn')
              return (
                <div key={item.key}>
                  <article className="chat-message user-message">
                    <div className="message-role">
                      你<time>{formatDate(item.time)}</time>
                    </div>
                    <p>{String(data.prompt || '')}</p>
                    <MessageActions
                      content={String(data.prompt || '')}
                      onReuse={
                        !running && !pending && !checkpoint
                          ? () => reuseInstruction(String(data.prompt || ''))
                          : undefined
                      }
                    />
                  </article>
                  <article className="chat-message agent-message">
                    <div className="message-role">
                      <span className="agent-symbol">✦</span> Paper Agent
                    </div>
                    <div className="chat-markdown">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {visibleText(data.reply)}
                      </ReactMarkdown>
                    </div>
                    <MessageActions content={visibleText(data.reply)} />
                  </article>
                </div>
              );
            const label = nodeLabel(data.node || data.phase);
            const round = data.iteration ? `第 ${data.iteration} 轮` : '';
            if (event.kind === 'assistant_output') {
              const content = visibleText(data.content);
              return content ? (
                <article key={item.key} className="chat-message agent-message">
                  <div className="message-role">
                    <span className="agent-symbol">✦</span>{' '}
                    {agentNames[eventActor(event) || 'main']}{' '}
                    <small>
                      {label}
                      {data.streaming ? ' · 回复生成中' : ''}
                    </small>
                  </div>
                  <div className="chat-markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                  </div>
                  {data.truncated === true && <small>输出较长，此处展示前 20,000 字符。</small>}
                  <MessageActions content={content} />
                </article>
              ) : null;
            }
            if (event.kind === 'tool_start' || event.kind === 'tool_end') {
              const started = events.find(
                (record) =>
                  record.kind === 'tool_start' &&
                  record.run_id === event.run_id &&
                  record.data.call_id === data.call_id &&
                  record.data.iteration === data.iteration &&
                  record.data.phase === data.phase,
              );
              const working =
                event.kind === 'tool_start' && running && event.run_id === project.runs[0]?.id;
              return (
                <details
                  className={`tool-activity ${data.is_error ? 'has-error' : ''}`}
                  key={item.key}
                >
                  <summary>
                    {working ? (
                      <LoadingOutlined spin />
                    ) : data.is_error ? (
                      <span>!</span>
                    ) : (
                      <CheckOutlined />
                    )}
                    <span>{String(data.tool || '工具调用')}</span>
                    <small>
                      {event.kind === 'tool_end'
                        ? data.is_error
                          ? '执行失败'
                          : '执行完成'
                        : working
                          ? '执行中'
                          : '已记录调用'}
                    </small>
                  </summary>
                  <div className="tool-activity-body">
                    <p>
                      {agentNames[eventActor(event) || 'main']} · {label} · {round}
                    </p>
                    {data.arguments || started?.data.arguments ? (
                      <>
                        <strong>调用参数</strong>
                        <pre>{String(data.arguments || started?.data.arguments)}</pre>
                      </>
                    ) : null}
                    {data.output ? (
                      <>
                        <strong>工具输出</strong>
                        <pre>{visibleText(data.output)}</pre>
                      </>
                    ) : null}
                    {data.truncated === true && <small>输出已截取，完整产物可在工作区查看。</small>}
                  </div>
                </details>
              );
            }
            if (event.kind === 'node_end')
              return (
                <article key={item.key} className="chat-message agent-message">
                  <div className="message-role">
                    <span className="agent-symbol">✦</span>{' '}
                    {agentNames[eventActor(event) || 'main']}{' '}
                    <small>{formatDate(event.created_at)}</small>
                  </div>
                  <p>
                    <strong>{label}</strong>阶段执行完成。
                  </p>
                  {visibleText(data.artifact) && (
                    <p className="stage-excerpt">{visibleText(data.artifact)}</p>
                  )}
                  {reports[String(data.node)] && (
                    <ChatArtifactCard
                      projectId={project.id}
                      path={reports[String(data.node)]}
                      title={label}
                      file={files.find((file) => file.path === reports[String(data.node)])}
                      onOpen={onOpen}
                    />
                  )}
                </article>
              );
            if (event.kind === 'assignment_start' || event.kind === 'assignment_end') {
              const assignment = data.assignment as Record<string, unknown> | undefined;
              const role = event.kind === 'assignment_start' ? eventActor(event) : undefined;
              return (
                <div className="agent-handoff" key={item.key}>
                  <strong>
                    {event.kind === 'assignment_start'
                      ? `主控 → ${agentNames[role || 'main']}`
                      : '角色 → 主控 · 已交接'}
                  </strong>
                  <p>
                    {event.kind === 'assignment_start'
                      ? `${nodeLabel(assignment?.node)} · ${String(assignment?.instruction || '')}`
                      : statusLabels[String(data.status)] || String(data.status || '已交付')}
                  </p>
                </div>
              );
            }
            const labels: Record<string, string> = {
              herdr_submitted: `${label} · 已交给 Herdr 执行`,
              herdr_display_error: 'Herdr 状态显示异常，任务仍以执行回执为准',
              node_start: `开始${label}`,
              wiki_resumed: '已恢复 Wiki 来源、阅读进度和审阅记录',
              context_compacting: '正在压缩上下文',
              working_context_compacted: '上下文压缩完成，继续执行',
              model_start: `${label} · 正在分析 ${round}`,
              model_end: `${label} · 已完成本轮分析`,
              node_progress: `${label} · ${String(data.stage || '更新进度')}`,
              validation_failed: '产物校验需要修正',
              model_error: '模型请求失败',
              workflow_error: '研究执行失败',
              run_finished: `本次运行${statusLabels[String(data.status)] || '已结束'}`,
              stop_requested: '正在停止研究',
            };
            if (!labels[event.kind]) return null;
            return (
              <div key={item.key} className={`execution-step ${data.error ? 'has-error' : ''}`}>
                <span className="step-dot" />
                <div>
                  {agentNames[eventActor(event) || 'main']} · {labels[event.kind]}
                  {data.error ? <p>{String(data.error)}</p> : null}
                </div>
                <time>{formatDate(event.created_at)}</time>
              </div>
            );
          })}
          {checkpoint && (
            <article className="chat-message agent-message checkpoint-message">
              <div className="message-role">
                <span className="agent-symbol">✦</span> Paper Agent <small>等待你的判断</small>
              </div>
              <div className="review-heading">
                <h3>{reviewingProposal ? '请审阅研究方案' : '一起确定下一步'}</h3>
                {!reviewingProposal && questions.length > 0 && (
                  <span>
                    已回答 {answered} / {questions.length}
                  </span>
                )}
              </div>
              <p className="review-summary">{checkpoint.summary}</p>
              {reviewingProposal ? (
                <>
                  <p>
                    在方案总览中集中修改，提交 Agent
                    统一修订并检查关联影响；满意后再批准进入实验规划。
                  </p>
                  <Button onClick={onReviewProposal}>打开方案审阅</Button>
                </>
              ) : (
                <div className="review-question-list">
                  {questions.map((question, index) => (
                    <div
                      className={`review-question ${answers[index]?.trim() ? 'answered' : ''}`}
                      key={index}
                    >
                      <label htmlFor={`review-answer-${index}`}>
                        <span className="review-question-number">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span>{question}</span>
                        {answers[index]?.trim() && (
                          <CheckOutlined className="review-answer-check" />
                        )}
                      </label>
                      <Input.TextArea
                        id={`review-answer-${index}`}
                        placeholder="写下你的想法、选择或具体要求…"
                        value={answers[index] || ''}
                        onChange={(event) => {
                          const values = [...answers];
                          values[index] = event.target.value;
                          setAnswerDraft({ key: checkpointKey, values });
                        }}
                        autoSize={{ minRows: 3, maxRows: 8 }}
                        maxLength={20000}
                        disabled={running || pending}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                            event.preventDefault();
                            void send();
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
              {!reviewingProposal && questions.length > 0 && (
                <p className="review-note">
                  可只回答你关心的问题，留空表示接受当前建议。填写后在下方统一提交。
                </p>
              )}
            </article>
          )}
          {(project.pending_questions || []).map((question) => (
            <TaskQuestion
              key={question.id}
              question={question}
              stopping={project.status === 'stopping'}
              onAnswer={onAnswer}
            />
          ))}
          {running && (
            <div className="agent-working">
              <LoadingOutlined spin />
              <span>
                {project.pending_questions?.length
                  ? '等待你的回答'
                  : nodeLabel(project.state.current_node)}{' '}
                · {String(project.progress.tool || project.progress.phase || '研究执行中')}
              </span>
            </div>
          )}
          {pending && !running && (
            <div className="agent-working">
              <LoadingOutlined spin />
              <span>{checkpoint ? '正在提交回答…' : '正在理解你的请求…'}</span>
            </div>
          )}
          {!running && (project.runs[0]?.error || project.state.error) && (
            <Alert
              type="error"
              showIcon
              message="上次运行需要处理"
              description={project.runs[0]?.error || project.state.error}
            />
          )}
          {activityError && (
            <Alert
              type="warning"
              showIcon
              message="执行记录暂时未同步，正在重试"
              description={activityError}
            />
          )}
        </div>
      </div>
      {!atBottom && (
        <Button
          className="jump-to-latest"
          shape="circle"
          icon={<ArrowDownOutlined />}
          aria-label="跳到最新消息"
          onClick={() => {
            stick.current = true;
            scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
          }}
        />
      )}
      <div className="composer-area">
        {reviewingProposal ? (
          <>
            <Button type="primary" block onClick={onReviewProposal}>
              前往方案审阅
            </Button>
            <p className="composer-hint">修改、Agent 修订、复审和批准都在同一页完成。</p>
          </>
        ) : (
          <>
            {checkpoint && (
              <div className="review-composer-label">
                <span>
                  补充意见 <small>选填</small>
                </span>
                <span>{answered ? `${answered} 个回答待提交` : '审阅后可直接确认'}</span>
              </div>
            )}
            {tooLong && (
              <Alert
                type="warning"
                message="回答与补充意见合计不能超过 20,000 字，请精简后提交。"
              />
            )}
            <div className={`chat-composer ${pending ? 'is-submitting' : ''}`}>
              <Input.TextArea
                ref={input}
                aria-label={checkpoint ? '专家反馈' : '研究指令'}
                placeholder={
                  checkpoint
                    ? '输入你的回答或修改意见；留空表示接受当前产物并继续。'
                    : project.state.project_goal
                      ? '提问、修改指定产物，或继续中断的任务…'
                      : '描述你的研究问题、已有资料和预期成果…'
                }
                value={text}
                onChange={(event) => setText(event.target.value)}
                autoSize={{ minRows: 2, maxRows: 6 }}
                maxLength={20000}
                disabled={pending}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                    event.preventDefault();
                    void send();
                  }
                }}
              />
              <div className="composer-tools">
                <div>
                  <Select
                    aria-label="对话协作方式"
                    size="small"
                    value={mode}
                    disabled={running || !!checkpoint}
                    onChange={onModeChange}
                    options={[
                      { value: 'expert', label: '专家模式' },
                      { value: 'auto', label: '自动模式' },
                    ]}
                  />
                  <Tooltip title="起始节点、模型和运行参数">
                    <Button
                      type="text"
                      size="small"
                      icon={<SettingOutlined />}
                      aria-label="协作方式设置"
                      disabled={running || !!checkpoint}
                      onClick={onSettings}
                    />
                  </Tooltip>
                </div>
                {running && (
                  <Button
                    size="small"
                    danger
                    icon={<StopOutlined />}
                    disabled={project.status === 'external_running'}
                    onClick={onStop}
                  >
                    停止运行
                  </Button>
                )}
                {
                  <Button
                    type="primary"
                    shape={checkpoint ? 'default' : 'circle'}
                    aria-label={
                      checkpoint
                        ? feedback.trim()
                          ? '提交意见并继续'
                          : '确认并继续'
                        : '发送研究指令'
                    }
                    icon={<ArrowUpOutlined />}
                    loading={pending}
                    disabled={tooLong || (!checkpoint && !text.trim())}
                    onClick={() => void send()}
                  >
                    {checkpoint ? (feedback.trim() ? '提交回答并继续' : '确认并继续') : null}
                  </Button>
                }
              </div>
            </div>
            <p className="composer-hint">
              {running
                ? project.status === 'external_running'
                  ? '任务由终端启动，请在原终端管理。'
                  : '任务在后台持续运行，关闭页面后仍会继续。'
                : checkpoint
                  ? '审阅右侧产物后提交反馈，或留空确认并继续。'
                  : 'Ctrl / ⌘ + Enter 发送 · 研究会调用模型与工具'}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
