import { active, type ActivityEvent, type Project } from '../../api/client';
import { agentActivity, agentNames, currentActor, isRole } from './agents';
import { activeOperation, activityLabel, operationLabel } from './chat/activity';
import './agent-status.css';

export function AgentStatus({ project, events }: { project: Project; events: ActivityEvent[] }) {
  const running = active(project.status);
  const actor = currentActor(project, events);
  const operation = activeOperation(project);
  const latest = agentActivity(project, events, actor);
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
  return (
    <div className="agent-status-bar" role="status" aria-label="当前执行进展">
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
    </div>
  );
}
