import type { ActivityEvent } from '../../../api/client';

function responseKey(event: ActivityEvent) {
  const d = event.data;
  return JSON.stringify([event.run_id, d.session_id, d.task_id, d.role, d.phase, d.iteration]);
}

// Stream only public response text. A persisted response replaces its deltas;
// a reset discards partial text from an abandoned request attempt.
export function conversationEvents(events: ActivityEvent[]): ActivityEvent[] {
  const finished = new Set(events.filter((e) => e.kind === 'assistant_output').map(responseKey));
  // A coordinator receipt is an assistant result, never a user prompt. Usually
  // its text is already present in the streamed response; retain a fallback for
  // histories where that response is not loaded.
  const replies = new Set(
    events
      .filter((event) => event.kind === 'assistant_output' && event.data.phase === 'coordinator')
      .map((event) => JSON.stringify([event.run_id, String(event.data.content || '').trim()])),
  );
  const streams = new Map<string, ActivityEvent>();
  const result: ActivityEvent[] = [];
  for (const event of events) {
    const key = responseKey(event);
    if (event.kind === 'conversation_turn' && event.data.intent === 'coordinator_result') {
      const content = String(event.data.reply || '').trim();
      if (content && !replies.has(JSON.stringify([event.run_id, content]))) {
        result.push({
          ...event,
          kind: 'assistant_output',
          data: { role: 'main', phase: 'coordinator', content },
        });
      }
    } else if (event.kind === 'assistant_stream_start') {
      streams.delete(key);
    } else if (event.kind === 'assistant_delta') {
      if (finished.has(key) || typeof event.data.content !== 'string') continue;
      const previous = streams.get(key);
      streams.set(key, {
        ...event,
        id: previous?.id || event.id,
        kind: 'assistant_output',
        data: {
          ...event.data,
          content: String(previous?.data.content || '') + event.data.content,
          streaming: true,
        },
      });
    } else result.push(event);
  }
  return [...result, ...streams.values()].sort((a, b) => a.id - b.id);
}

export function activityLabel(event?: ActivityEvent): string {
  if (!event) return '正在准备任务';
  const tool = String(event.data.tool || '工具');
  switch (event.kind) {
    case 'operation_progress':
      return operationLabel(event.data);
    case 'context_compacting':
      return '正在压缩上下文';
    case 'working_context_compacted':
    case 'context_prepared':
      return '上下文已准备好，继续分析任务';
    case 'tool_start':
      return `正在执行 ${tool}`;
    case 'tool_end':
      return event.data.is_error ? '工具执行遇到问题，正在处理' : '工具已完成，正在分析结果';
    case 'assistant_delta':
      return '正在生成回复';
    case 'model_heartbeat':
      return event.data.context_compacting ? '正在压缩上下文' : '正在分析当前任务';
    case 'model_start':
      return '正在分析当前任务';
    case 'model_end':
      return '正在处理模型回复';
    case 'user_question':
      return '等待你的回答';
    case 'model_error':
      return '模型请求遇到问题';
    case 'role_task_start':
      return '已接收任务，正在准备';
    default:
      return '正在整理结果与下一步';
  }
}

export function operationLabel(operation: Record<string, unknown>): string {
  const stages: Record<string, string> = {
    preparing: '正在准备',
    checking_parser: '正在检查 PDF 解析环境',
    parsing_pdf: '正在解析 PDF 正文与版面',
    reading_structure: '正在读取 PDF 结构化内容',
    grouping_figures: '正在提取与分组图片',
    using_cached_parse: '正在复用 PDF 解析缓存',
    preparing_sources: '正在整理原文证据',
    starting_reviewer: '正在启动独立审阅',
    reviewing: '正在审阅材料',
    checking_evidence: '审阅者正在核查证据',
    writing_report: '正在生成审阅报告',
    finalizing: '正在整理审阅结果',
    validating_report: '正在校验并保存审阅报告',
    finished: '审阅已结束',
  };
  return stages[String(operation.stage)] || '正在处理材料';
}

export function activeOperation(project: import('../../../api/client').Project) {
  const operations = project.progress.operations;
  return Array.isArray(operations)
    ? operations
        .filter(
          (value): value is Record<string, unknown> =>
            !!value && typeof value === 'object' && value.status === 'running',
        )
        .at(-1)
    : undefined;
}
