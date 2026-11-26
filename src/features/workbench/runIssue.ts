import type { Project } from '../../api/client';

/** A conversation task can finish while a prior full-stage failure is unresolved. */
export function runIssue(project: Pick<Project, 'runs' | 'state'>) {
  const latest = project.runs[0];
  if (latest && ['queued', 'running', 'stopping'].includes(latest.status)) return undefined;
  if (latest?.error) {
    return { type: 'error' as const, message: '本次运行需要处理', description: latest.error };
  }
  const error = project.state.error;
  if (!error || !['failed', 'partial', 'awaiting_results'].includes(project.state.status || ''))
    return undefined;
  if (latest?.status === 'completed' && project.state.status === 'failed') {
    return {
      type: 'warning' as const,
      message: '本次任务已完成，完整阶段仍待恢复',
      description: `上次整阶段运行的错误：${error}。普通任务完成不会自动改变整阶段状态；可通过“继续研究”恢复该阶段。`,
    };
  }
  return {
    type: project.state.status === 'failed' ? ('error' as const) : ('warning' as const),
    message: '当前阶段需要处理',
    description: error,
  };
}
