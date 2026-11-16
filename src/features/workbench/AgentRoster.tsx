import type { ActivityEvent, NodeInfo, Project } from '../../api/client';
import {
  agentActivity,
  isCompacting,
  agentDescriptions,
  agentNames,
  currentActor,
  roles,
  visibleAgent,
  type AgentFilter,
} from './agents';
import './agents.css';

const labels: Record<string, string> = {
  idle: '待命',
  running: '工作中',
  compacting: '正在压缩上下文',
  waiting: '等待角色交付',
  awaiting_user: '等待你审阅',
  completed: '已交付',
  failed: '执行失败',
  interrupted: '已中断',
  stopping: '正在停止',
};

export function AgentRoster({
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
  const actor = currentActor(project, events);
  const running = ['queued', 'running', 'stopping', 'external_running'].includes(project.status);
  const compacting = running && isCompacting(agentActivity(project, events, actor));
  const current = visibleAgent(project, events, selected);
  const chosen = project.agents?.find((agent) => agent.role === current);
  return (
    <div className="agent-roster" aria-label="Agent 协作">
      <div className="agent-roster-heading">
        <strong>{running ? `${agentNames[actor]}正在工作` : '研究团队'}</strong>
        <div>
          <button
            type="button"
            aria-pressed={selected === 'follow'}
            onClick={() => onSelect('follow')}
          >
            跟随当前
          </button>
          <button type="button" aria-pressed={selected === 'all'} onClick={() => onSelect('all')}>
            全部记录
          </button>
        </div>
      </div>
      <div className="agent-role-grid">
        {roles.map((role) => {
          const agent = project.agents?.find((item) => item.role === role);
          const working = running && actor === role;
          const status = working
            ? project.pending_questions?.some((q) => q.role === role)
              ? 'awaiting_user'
              : project.status === 'stopping'
                ? 'stopping'
                : compacting
                  ? 'compacting'
                  : 'running'
            : running && role === 'main'
              ? 'waiting'
              : agent?.status === 'running' || agent?.status === 'stopping'
                ? running
                  ? 'idle'
                  : 'interrupted'
                : agent?.status || 'idle';
          return (
            <button
              type="button"
              key={role}
              className={`agent-role-card ${working ? 'is-working' : ''}`}
              aria-label={`查看${agentNames[role]}`}
              aria-pressed={current === role}
              onClick={() => onSelect(role)}
            >
              <span className="agent-role-title">
                <span className="agent-work-dot" />
                {agentNames[role]}
                <small>{labels[status] || status}</small>
              </span>
              <span className="agent-role-description">{agentDescriptions[role]}</span>
            </button>
          );
        })}
      </div>
      {chosen?.instruction && (
        <p className="agent-current-task" title={chosen.instruction}>
          {nodes.find((node) => node.id === chosen.phase)?.label ||
            agentNames[current as keyof typeof agentNames]}{' '}
          · {chosen.instruction}
        </p>
      )}
      <p className="agent-roster-hint">切换查看各角色的执行记录，研究指令统一交给主控。</p>
    </div>
  );
}
