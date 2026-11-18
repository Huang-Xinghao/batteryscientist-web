import type { components } from './schema';
type Schemas = components['schemas'];
export type NodeInfo = Schemas['NodeView'];
export type Checkpoint = Schemas['CheckpointView'];
export type WorkflowState = Schemas['WorkflowView'];
export type Run = Schemas['RunView'];
export type Project = Schemas['ProjectView'];
export type UserQuestion = Schemas['QuestionView'];
export type ProjectFile = { path: string; size: number; modified: number };
export type FileContent = {
  kind: 'text' | 'binary';
  path: string;
  content?: string;
  sha256?: string;
  editable?: boolean;
};
export type RunInput = import('./schema').components['schemas']['RunCreate'];
export type Health = Schemas['HealthView'];
export type BtsSnapshot = Schemas['BtsSnapshotView'];
export type BtsChannel = Schemas['BtsChannelView'];
export type BtsDevice = Schemas['BtsDeviceView'];
export type ActivityEvent = {
  id: number;
  project_id: string;
  run_id: string | null;
  kind: string;
  data: Record<string, unknown>;
  created_at: string;
};
export type ActivityPage = { events: ActivityEvent[]; has_more: boolean };
export type LibraryKind = 'paradigms' | 'battery';
export type LibraryEntry = {
  path: string;
  title: string;
  category: string;
  excerpt: string;
  modified: number;
};
export type LibraryIndex = {
  available: boolean;
  items: LibraryEntry[];
  categories: { id: string; count: number }[];
  total: number;
  matched: number;
  truncated: boolean;
};
export type ParadigmGraph = {
  available: boolean;
  truncated: boolean;
  nodes: (LibraryEntry & { id: string; tags: string[] })[];
  edges: { source: string; target: string; type: string; evidence: string }[];
};
export type LibraryFigure = {
  id: string;
  image_path: string;
  paper_id: string;
  paper_title: string;
  paper_path: string | null;
  label: string;
  page: number | null;
  caption: string;
};
export type LibraryFigures = {
  available: boolean;
  items: LibraryFigure[];
  total: number;
  truncated: boolean;
};
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') {
      window.dispatchEvent(new Event('session-expired'));
    }
    let detail = `请求失败 (${response.status})`;
    try {
      const data = await response.json();
      detail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
    } catch {
      /* Non-JSON errors, e.g. reverse proxy unavailable. */
    }
    throw new ApiError(response.status, detail);
  }
  return response.json() as Promise<T>;
}
export const api = {
  landSnapshot: (signal?: AbortSignal) => request<BtsSnapshot>('/laboratory/land', { signal }),
  btsSnapshot: (signal?: AbortSignal) => request<BtsSnapshot>('/laboratory/bts', { signal }),
  paradigmGraph: () => request<ParadigmGraph>('/libraries/paradigms/graph'),
  paradigmFigures: () => request<LibraryFigures>('/libraries/paradigms/figures'),
  library: (kind: LibraryKind, q = '', category = '') =>
    request<LibraryIndex>(`/libraries/${kind}?${new URLSearchParams({ q, category })}`),
  libraryDocument: (kind: LibraryKind, path: string) =>
    request<LibraryEntry & { content: string }>(
      `/libraries/${kind}/document?${new URLSearchParams({ path })}`,
    ),
  libraryAsset: (kind: LibraryKind, path: string) =>
    `/api/libraries/${kind}/asset?${new URLSearchParams({ path })}`,
  health: () => request<Health>('/health'),
  projects: () => request<Project[]>('/projects'),
  project: (id: string) => request<Project>(`/projects/${id}`),
  create: (body: { name: string; path?: string }) =>
    request<Project>('/projects', { method: 'POST', body: JSON.stringify(body) }),
  run: (id: string, body: RunInput) =>
    request<{ id: string } | { intent: 'chat' | 'clarify'; reply: string }>(
      `/projects/${id}/runs`,
      { method: 'POST', body: JSON.stringify(body) },
    ),
  message: (id: string, body: { prompt: string; mode: 'auto' | 'expert' }) =>
    request<
      | { id: string }
      | { intent: 'chat'; reply: string }
      | { intent: 'status'; reply: string; accepted: false }
    >(`/projects/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  answerQuestion: (id: string, question: UserQuestion, answer: string) =>
    request<{ status: string }>(`/projects/${id}/questions/${question.id}/answer`, {
      method: 'POST',
      body: JSON.stringify({ task_id: question.task_id, answer }),
    }),
  stop: (id: string) => request(`/projects/${id}/stop`, { method: 'POST' }),
  files: (id: string) =>
    request<{ files: ProjectFile[]; truncated: boolean }>(`/projects/${id}/files`),
  file: (id: string, path: string) =>
    request<FileContent>(`/projects/${id}/file?${new URLSearchParams({ path })}`),
  save: (id: string, path: string, content: string, sha256: string) =>
    request<FileContent>(`/projects/${id}/file?${new URLSearchParams({ path })}`, {
      method: 'PUT',
      body: JSON.stringify({ content, sha256 }),
    }),
  log: (id: string) => request<{ content: string }>(`/projects/${id}/log`),
  activity: (id: string, cursor: { before?: number; after?: number; role?: string } = {}) =>
    request<ActivityPage>(
      `/projects/${id}/activity?${new URLSearchParams(
        Object.entries(cursor).map(([key, value]) => [key, String(value)]),
      )}`,
    ),
  download: (id: string, path: string) =>
    `/api/projects/${id}/download?${new URLSearchParams({ path })}`,
};
export const active = (status: string) =>
  ['queued', 'running', 'stopping', 'external_running'].includes(status);
export const statusLabels: Record<string, string> = {
  external_running: '终端运行中',
  idle: '尚未启动',
  queued: '等待启动',
  running: '运行中',
  stopping: '正在停止',
  interrupted: '已中断',
  awaiting_user: '等待审阅',
  awaiting_results: '等待实验结果',
  completed: '已完成',
  failed: '运行失败',
};
