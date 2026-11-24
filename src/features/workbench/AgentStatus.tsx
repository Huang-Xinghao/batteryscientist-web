import { useState } from 'react';
import { Button, Drawer } from 'antd';
import { active, type ActivityEvent, type NodeInfo, type Project } from '../../api/client';
import {
  agentActivity,
  agentNames,
  currentActor,
  eventActor,
  isRole,
  roles,
  type AgentFilter,
} from './agents';
import { activeOperation, activityLabel, operationLabel } from './chat/activity';
import './agent-status.css';

export function AgentStatus({
  project,
  events,
  nodes,
  selected,
  onSelect,
}: {
  project: Project;
  events: ActivityEvent[];
  nodes: NodeInfo[];
  selected: AgentFilter;
  onSelect: (role: AgentFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const running = active(project.status);
  const actor = currentActor(project, events);
  const operation = activeOperation(project);
  const latest = agentActivity(project, events, actor);
  const task = project.agents?.find((agent) => agent.role === actor);
  const status = running
    ? project.pending_questions?.some((question) => question.role === actor)
      ? '等待你的回答'
      : project.status === 'stopping'
        ? '正在保存并停止'
        : operation
          ? operationLabel(operation)
          : activityLabel(latest)
    : project.status === 'awaiting_user'
      ? '等待你审阅'
      : project.status === 'awaiting_results'
        ? '等待实验结果'
        : '等待你的指令';
  // Show concurrent work only when the backend records a running operation for that role.
  const operations = Array.isArray(project.progress.operations) ? project.progress.operations : [];
  const workers = running
    ? [
        ...new Set([
          actor,
          ...operations.flatMap((entry) => {
            const value = entry as Record<string, unknown> | null;
            return value?.status === 'running' && isRole(value.role) ? [value.role] : [];
          }),
        ]),
      ]
    : [];
  const participants = roles.filter(
    (role) =>
      role === actor ||
      (role === 'main' && project.runs.length > 0) ||
      workers.includes(role) ||
      events.some((event) => eventActor(event) === role) ||
      project.agents?.some(
        (agent) =>
          agent.role === role &&
          (agent.task_id || agent.instruction || agent.status === 'completed'),
      ),
  );
  const choose = (role: AgentFilter) => {
    onSelect(role);
    setOpen(false);
  };
  const phase = nodes.find(
    (node) => node.id === (task?.phase || latest?.data.phase || project.state.current_node),
  )?.label;
  return (
    <>
      <div className="agent-status-bar" role="status" aria-label="当前执行进展">
        <button
          type="button"
          className="agent-status-trigger"
          aria-label="查看当前 Agent 任务与记录"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <span className={`agent-status-dot ${running ? 'is-running' : ''}`} aria-hidden="true" />
          <span className="agent-status-text">
            {workers.length ? (
              <>
                <strong>{workers.map((role) => agentNames[role]).join('、')}</strong>
                <span> · {status}</span>
              </>
            ) : (
              <span>{status}</span>
            )}
          </span>
          <span className="agent-status-chevron" aria-hidden="true">
            ▾
          </span>
        </button>
        {selected !== 'follow' && (
          <button type="button" className="agent-history-filter" onClick={() => setOpen(true)}>
            {selected === 'all' ? '全部记录' : `${agentNames[selected]}记录`}
          </button>
        )}
      </div>
      <Drawer title="Agent 任务与执行记录" open={open} onClose={() => setOpen(false)} width={440}>
        <h3>{running ? agentNames[actor] : status}</h3>
        {running && <p>{status}</p>}
        {phase && <p className="muted">{phase}</p>}
        {running && task?.instruction && (
          <p className="agent-task-instruction">{task.instruction}</p>
        )}
        {running && operation && (
          <p className="muted">
            已耗时 {Math.round(Number(operation.elapsed_seconds || 0))} 秒
            {operation.checks_completed ? ` · 已完成 ${operation.checks_completed} 次证据检查` : ''}{' '}
            · 最近活动距今 {Math.round(Number(operation.activity_age_seconds || 0))} 秒
          </p>
        )}
        <div className="agent-record-actions">
          <Button aria-pressed={selected === 'follow'} onClick={() => choose('follow')}>
            跟随当前
          </Button>
          <Button aria-pressed={selected === 'all'} onClick={() => choose('all')}>
            全部记录
          </Button>
        </div>
        <h4>查看执行记录</h4>
        <div className="agent-record-list">
          {participants.map((role) => (
            <Button
              key={role}
              aria-label={`查看${agentNames[role]}`}
              aria-pressed={selected === role}
              onClick={() => choose(role)}
            >
              {agentNames[role]}
              {workers.includes(role) ? ' · 工作中' : ''}
            </Button>
          ))}
        </div>
      </Drawer>
    </>
  );
}
