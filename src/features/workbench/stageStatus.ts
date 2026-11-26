import { active, type NodeInfo, type Project } from '../../api/client';

export type StageStatus = 'done' | 'running' | 'review' | 'stopped' | 'failed' | 'pending';

export function stageStatuses(project: Project, nodes: NodeInfo[]) {
  const done = new Set(project.state.history?.map((entry) => entry.node));
  // Improvement recompiles the paper internally. Its successful completion and
  // pdf_ready receipt satisfy compilation even without a standalone compile run.
  if (done.has('improvement') && project.state.paper_status === 'pdf_ready') {
    done.add('paper_compile');
  }
  const coordinated =
    project.status !== 'external_running' && project.runs[0]?.options.action === 'coordinate';
  // Coordinator chats do not run the saved workflow node. A current worker
  // snapshot is evidence of an actual delegated stage, including genuine reruns.
  const worker = project.agents?.find((agent) => agent.is_active && agent.role !== 'main');
  const current = coordinated
    ? String(worker?.phase || '')
    : String(project.progress?.current_node || project.state.current_node || '');
  const running = active(project.status);
  const checkpointNode =
    project.status === 'awaiting_user' ? project.state.expert_checkpoint?.node : undefined;
  const result: Record<string, StageStatus> = {};
  for (const node of nodes) {
    let status: StageStatus = done.has(node.id) ? 'done' : 'pending';
    if (node.id === checkpointNode) status = 'review';
    else if (node.id === current) {
      if (running) status = 'running';
      else if (project.status === 'failed') status = 'failed';
      else if (project.status === 'interrupted') status = 'stopped';
      else if (project.status === 'awaiting_user') status = 'review';
    }
    result[node.id] = status;
  }
  return result;
}
