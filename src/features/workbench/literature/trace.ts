import type { ActivityEvent } from '../../../api/client';

export interface ResearchContext {
  goal: string;
  events: ActivityEvent[];
  hasOlder: boolean;
  loadingOlder: boolean;
  loadOlder: () => void;
  error: string;
}

function object(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try {
      return object(JSON.parse(value));
    } catch {
      return {};
    }
  }
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function list(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(object) : [];
}
function key(event: ActivityEvent): string {
  return JSON.stringify([
    event.run_id,
    event.data.execution_task_id,
    event.data.task_id,
    event.data.call_id,
  ]);
}
export interface ResearchAction {
  id: string;
  kind: 'search' | 'read';
  query: string;
  time: string;
  status: 'running' | 'done' | 'error';
  resultsAvailable: boolean;
  candidates: { title: string; path: string }[];
  path: string;
}

/** Read only recorded literature tools, preserving the distinction between search and reading. */
export function researchActions(events: ActivityEvent[]): ResearchAction[] {
  const ordered = [...events].sort((a, b) => a.id - b.id);
  const ends = new Map(
    ordered.filter((event) => event.kind === 'tool_end').map((event) => [key(event), event]),
  );
  return ordered.flatMap((event) => {
    const data = event.data;
    if (
      event.kind !== 'tool_start' ||
      !data.call_id ||
      (data.phase !== 'literature' && data.node !== 'literature')
    )
      return [];
    if (!['search_wiki', 'search_papers', 'read_wiki'].includes(String(data.tool))) return [];
    const args = object(data.arguments);
    const end = ends.get(key(event));
    const output = end && !end.data.is_error ? object(end.data.output) : {};
    const candidates = [
      ...list(output.matches),
      ...list(output.related_matches),
      ...list(output.papers),
    ]
      .filter((entry) => typeof entry.title === 'string')
      .map((entry) => ({
        title: String(entry.title),
        path: String(entry.wiki_path ?? entry.doi ?? entry.url ?? ''),
      }));
    return [
      {
        id: `action-${event.id}`,
        kind: data.tool === 'read_wiki' ? ('read' as const) : ('search' as const),
        query: String(args.query ?? args.wiki_path ?? ''),
        path: String(args.wiki_path ?? ''),
        time: event.created_at,
        status: !end
          ? ('running' as const)
          : end.data.is_error
            ? ('error' as const)
            : ('done' as const),
        resultsAvailable: Object.keys(output).length > 0,
        candidates,
      },
    ];
  });
}
