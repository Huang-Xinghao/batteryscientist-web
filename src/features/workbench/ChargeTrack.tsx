import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { active, type NodeInfo, type Project } from '../../api/client';
import { burstFrom } from '../../components/fx/burst';
import './charge-track.css';

export type StageStatus = 'done' | 'running' | 'review' | 'stopped' | 'failed' | 'pending';

const statusText: Record<StageStatus, string> = {
  done: '已完成',
  running: '进行中',
  review: '等你审阅',
  stopped: '已中断',
  failed: '失败',
  pending: '',
};

// Stage ownership mirrors batteryscientist/agent/stages.py.
const groups = [
  { label: '构思 Agent', nodes: ['literature', 'data_search', 'ideas', 'refine'] },
  { label: '实验 Agent', nodes: ['experiment_plan', 'experiment_bridge'] },
  {
    label: '论文 Agent',
    nodes: ['paper_plan', 'paper_figure', 'paper_write', 'paper_compile', 'improvement'],
  },
];

function stageStatuses(project: Project, nodes: NodeInfo[]) {
  const done = new Set(project.state.history?.map((entry) => entry.node));
  const current = String(project.progress?.current_node || project.state.current_node || '');
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

/**
 * The research pipeline drawn as a segmented battery cell: finished stages charge
 * with the brand gradient, the running stage streams current, and the stage that
 * waits for the user glows amber. Each segment opens that stage's deliverable.
 */
export function ChargeTrack({
  project,
  nodes,
  selected,
  onPick,
}: {
  project: Project;
  nodes: NodeInfo[];
  selected?: string;
  onPick: (node: string) => void;
}) {
  const statuses = stageStatuses(project, nodes);
  const doneCount = Object.values(statuses).filter((s) => s === 'done').length;
  const liveIndex = nodes.findIndex((node) => ['running', 'review'].includes(statuses[node.id]));
  const running = liveIndex >= 0 && statuses[nodes[liveIndex].id] === 'running';
  const segments = useRef<Record<string, HTMLButtonElement | null>>({});
  const previousDone = useRef<number | null>(null);
  const [bump, setBump] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  // Celebrate a stage that just finished while the page was open.
  useEffect(() => {
    if (previousDone.current !== null && doneCount > previousDone.current) {
      const finished = [...nodes].reverse().find((node) => statuses[node.id] === 'done');
      if (finished) burstFrom(segments.current[finished.id], { count: 54, power: 0.8 });
      setBump((value) => value + 1);
    }
    previousDone.current = doneCount;
  }, [doneCount, nodes, statuses]);

  const summary =
    liveIndex >= 0
      ? `${nodes[liveIndex].label}${statusText[statuses[nodes[liveIndex].id]]}`
      : doneCount === nodes.length && nodes.length
        ? '全部阶段已完成'
        : '尚未开始';
  return (
    <section className={`charge-track ${collapsed ? 'is-collapsed' : ''}`} aria-label="研究进度">
      <div className="charge-track-heading">
        <h2>研究进度</h2>
        <p>
          已完成 <strong>{doneCount}</strong> / {nodes.length}，{summary}
        </p>
        <button
          type="button"
          className="workbench-fold"
          aria-label={collapsed ? '展开研究进度' : '收起研究进度'}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? '展开 ▾' : '收起 ▴'}
        </button>
        {bump > 0 && (
          <span key={bump} className="charge-bump" aria-hidden="true">
            +1 阶段完成
          </span>
        )}
      </div>
      <div className="charge-track-scroll" hidden={collapsed}>
        <div className="charge-track-body">
          <div className="charge-cell">
            <div className="charge-groups" aria-hidden="true">
              {groups.map((group) => (
                <span key={group.label} style={{ gridColumn: `span ${group.nodes.length}` }}>
                  {group.label}
                </span>
              ))}
            </div>
            <div
              className="charge-segments"
              style={{ gridTemplateColumns: `repeat(${nodes.length || 11}, minmax(0, 1fr))` }}
            >
              {nodes.map((node, index) => {
                const status = statuses[node.id];
                return (
                  <button
                    key={node.id}
                    ref={(element) => {
                      segments.current[node.id] = element;
                    }}
                    type="button"
                    className={`charge-stage is-${status} ${selected === node.id ? 'is-selected' : ''}`}
                    aria-label={`${node.label}，${statusText[status] || '未开始'}`}
                    aria-current={selected === node.id ? 'step' : undefined}
                    onClick={() => onPick(node.id)}
                    style={
                      {
                        '--d': `${index * 0.07}s`,
                        '--p': `${nodes.length > 1 ? (index / (nodes.length - 1)) * 100 : 0}%`,
                      } as CSSProperties
                    }
                  >
                    <span className="charge-seg">
                      <span className="charge-fill" />
                    </span>
                    <span className="charge-label">{node.label}</span>
                    <span className="charge-state">{statusText[status]}</span>
                  </button>
                );
              })}
              {running && (
                <span
                  className="charge-spark"
                  aria-hidden="true"
                  style={
                    {
                      '--to': `${((liveIndex + 0.5) / nodes.length) * 100}%`,
                    } as CSSProperties
                  }
                />
              )}
            </div>
          </div>
          <span className={`charge-cap ${running ? 'is-live' : ''}`} aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
