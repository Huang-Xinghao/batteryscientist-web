import type { ReactNode } from 'react';
import type { ActivityEvent } from '../../../api/client';

/** Friendly names for the tools agents call most; anything else shows its own name. */
const toolNames: Record<string, string> = {
  search_wiki: '检索范式库',
  read_wiki: '阅读范式库条目',
  search_literature: '检索文献',
  read_paper: '阅读论文',
  read_project_file: '读取项目文件',
  read: '读取文件',
  write: '写入文件',
  edit: '修改文件',
  edit_project_markdown: '修改文档',
  ls: '查看目录',
  find: '查找文件',
  grep: '搜索内容',
  bash: '运行命令',
  delegate_stage: '派发任务',
  get_project_context: '查看项目状态',
  request_user_decision: '向你提问',
  laboratory_snapshot: '读取实验设备',
  skill: '加载技能说明',
};

export function toolName(tool: unknown) {
  const name = String(tool || '工具');
  return toolNames[name] || name;
}

/** The most telling argument of a call: what was searched, read or run. */
function argumentHint(raw: unknown) {
  if (!raw) return '';
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      for (const key of ['query', 'path', 'pattern', 'command', 'name', 'node', 'instruction']) {
        if (typeof record[key] === 'string' && record[key]) return String(record[key]);
      }
    }
  } catch {
    /* Arguments are shown raw in the step details. */
  }
  return '';
}

export type Step = {
  key: string;
  status: 'running' | 'done' | 'error';
  title: string;
  hint?: string;
  detail?: ReactNode;
  time: string;
};

/** Builds one step per tool call (start and end merged) or per other process event. */
export function toolStep(
  event: ActivityEvent,
  start: ActivityEvent | undefined,
  live: boolean,
): Step {
  const data = event.data;
  const finished = event.kind === 'tool_end';
  return {
    key: `step-${event.id}`,
    status: finished ? (data.is_error ? 'error' : 'done') : live ? 'running' : 'done',
    title: toolName(data.tool),
    hint: argumentHint(data.arguments || start?.data.arguments),
    time: (start || event).created_at,
  };
}
