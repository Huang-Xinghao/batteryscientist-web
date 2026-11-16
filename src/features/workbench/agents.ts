import type { ActivityEvent, Project } from '../../api/client';
import { activeOperation } from './chat/activity';

export const roles = [
  'main',
  'idea_generator',
  'experiment',
  'paper_writer',
  'wiki_agent',
] as const;
export type AgentRole = (typeof roles)[number];
export type AgentFilter = AgentRole | 'all' | 'follow';
export const agentNames: Record<AgentRole, string> = {
  main: '主控 Agent',
  idea_generator: '构思 Agent',
  experiment: '实验 Agent',
  paper_writer: '论文 Agent',
  wiki_agent: 'Wiki Agent',
};
export const agentDescriptions: Record<AgentRole, string> = {
  main: '协调、派单与审阅',
  idea_generator: '文献、数据与研究方案',
  experiment: '实验规划、实现与执行',
  paper_writer: '图表、写作与论文改进',
  wiki_agent: '论文与研究成果整理入库',
};
const phaseRoles: Record<string, AgentRole> = {
  coordinator: 'main',
  literature: 'idea_generator',
  data_search: 'idea_generator',
  ideas: 'idea_generator',
  research_ideas: 'idea_generator',
  refine: 'idea_generator',
  research_refine: 'idea_generator',
  experiment_plan: 'experiment',
  experiment_bridge: 'experiment',
  paper_plan: 'paper_writer',
  paper_figure: 'paper_writer',
  paper_write: 'paper_writer',
  paper_compile: 'paper_writer',
  improvement: 'paper_writer',
  wiki: 'wiki_agent',
};
export function isRole(value: unknown): value is AgentRole {
  return roles.includes(value as AgentRole);
}
export function eventActor(event: ActivityEvent): AgentRole | undefined {
  const data = event.data;
  if (event.kind === 'assignment_start') {
    const assignment = data.assignment as Record<string, unknown> | undefined;
    return isRole(assignment?.role) ? assignment.role : undefined;
  }
  if (event.kind === 'assignment_end' || event.kind === 'conversation_turn') return 'main';
  if (isRole(data.role)) return data.role;
  return phaseRoles[String(data.phase || data.node || '')];
}
export function eventMatches(event: ActivityEvent, role: AgentRole | 'all') {
  if (role === 'all') return true;
  if (['assignment_start', 'assignment_end'].includes(event.kind)) {
    const assignment = event.data.assignment as Record<string, unknown> | undefined;
    return role === 'main' || role === (assignment?.role || event.data.role);
  }
  const actor = eventActor(event);
  return actor
    ? actor === role
    : ['run_finished', 'stop_requested', 'workflow_error'].includes(event.kind);
}
export function currentActor(project: Project, events: ActivityEvent[]): AgentRole {
  if (!['queued', 'running', 'stopping', 'external_running'].includes(project.status))
    return 'main';
  const operation = activeOperation(project);
  if (isRole(operation?.role)) return operation.role;
  const snapshot = project.agents?.find((agent) => agent.is_active);
  // Terminal work has no current web run; earlier web events describe an older job.
  if (project.status === 'external_running') return isRole(snapshot?.role) ? snapshot.role : 'main';
  const run = project.runs[0]?.id;
  const live = events.filter((event) => !run || event.run_id === run);
  for (const event of live.slice().reverse()) {
    if (
      ![
        'assignment_start',
        'assignment_end',
        'role_task_start',
        'context_compacting',
        'working_context_compacted',
        'model_start',
        'tool_start',
        'assistant_output',
        'assistant_delta',
        'user_question',
      ].includes(event.kind)
    )
      continue;
    const actor = eventActor(event);
    if (actor) return actor;
  }
  return isRole(snapshot?.role) ? snapshot.role : 'main';
}

export function visibleAgent(project: Project, events: ActivityEvent[], selected: AgentFilter) {
  if (selected !== 'follow') return selected;
  return ['queued', 'running', 'stopping', 'external_running'].includes(project.status)
    ? currentActor(project, events)
    : 'all';
}

export function agentActivity(project: Project, events: ActivityEvent[], actor: AgentRole) {
  return [...events]
    .reverse()
    .find(
      (event) =>
        event.run_id === project.runs[0]?.id &&
        eventActor(event) === actor &&
        [
          'operation_progress',
          'context_compacting',
          'working_context_compacted',
          'context_prepared',
          'model_start',
          'model_end',
          'model_heartbeat',
          'assistant_delta',
          'assistant_output',
          'tool_start',
          'tool_end',
          'role_task_start',
          'user_question',
          'model_error',
        ].includes(event.kind),
    );
}

export function isCompacting(event?: ActivityEvent) {
  return (
    event?.kind === 'context_compacting' ||
    (event?.kind === 'model_heartbeat' && event.data.context_compacting === true)
  );
}
