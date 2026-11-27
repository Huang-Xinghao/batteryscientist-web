import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { animate } from 'motion';
import { prefersReducedMotion } from './motion';
import { ChargeContext, type ChargeOptions } from './chargeContext';
import './charge-transition.css';

type TaskState = { label: string; done: boolean; failed: boolean };
type Phase = 'charging' | 'full' | 'leaving';

const MIN_CHARGE_MS = 1300;
const MAX_WAIT_MS = 5000;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function ChargeTransitionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const [phase, setPhase] = useState<Phase>('charging');
  const [tasks, setTasks] = useState<TaskState[]>([]);
  const busy = useRef(false);

  const start = useCallback(
    async ({ to, from, tasks: work = [] }: ChargeOptions) => {
      if (busy.current) return;
      if (prefersReducedMotion()) {
        await Promise.allSettled(work.map((task) => task.run()));
        navigate(to);
        return;
      }
      busy.current = true;
      setOrigin(from || { x: innerWidth / 2, y: innerHeight / 2 });
      setPhase('charging');
      setTasks(work.map((task) => ({ label: task.label, done: false, failed: false })));
      const settle = (index: number, failed: boolean) =>
        setTasks((list) => list.map((t, i) => (i === index ? { ...t, done: true, failed } : t)));
      // Failed preloads do not block: the page shows its own loading or error state.
      const preload = Promise.allSettled(
        work.map((task, index) =>
          task.run().then(
            () => settle(index, false),
            () => settle(index, true),
          ),
        ),
      );
      await Promise.all([wait(MIN_CHARGE_MS), Promise.race([preload, wait(MAX_WAIT_MS)])]);
      setPhase('full');
      await wait(380);
      navigate(to);
      setPhase('leaving');
      await wait(720);
      setOrigin(null);
      busy.current = false;
    },
    [navigate],
  );

  return (
    <ChargeContext.Provider value={start}>
      {children}
      {origin && <ChargeOverlay origin={origin} phase={phase} tasks={tasks} />}
    </ChargeContext.Provider>
  );
}

function ChargeOverlay({
  origin,
  phase,
  tasks,
}: {
  origin: { x: number; y: number };
  phase: Phase;
  tasks: TaskState[];
}) {
  const root = useRef<HTMLDivElement>(null);
  const percent = useRef<HTMLSpanElement>(null);
  const level = useRef(0);
  const done = tasks.filter((task) => task.done).length;
  const target =
    phase === 'charging' ? Math.min(92, 18 + (74 * (done + 1)) / (tasks.length + 1)) : 100;
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const controls = animate(level.current, target, {
      duration: phase === 'charging' ? 0.9 : 0.32,
      ease: [0.2, 0.9, 0.2, 1],
      onUpdate: (value) => {
        level.current = value;
        element.style.setProperty('--fill', String(value / 100));
        if (percent.current) percent.current.textContent = String(Math.round(value));
      },
    });
    return () => controls.stop();
  }, [target, phase]);
  const status =
    phase !== 'charging'
      ? '充能完成'
      : tasks.find((task) => !task.done)?.label
        ? `正在载入${tasks.find((task) => !task.done)!.label}`
        : '准备工作台';
  return (
    <div
      ref={root}
      className={`charge-overlay is-${phase}`}
      style={{ '--cx': `${origin.x}px`, '--cy': `${origin.y}px` } as React.CSSProperties}
      role="status"
      aria-live="polite"
      aria-label={status}
    >
      <div className="charge-grid" aria-hidden="true" />
      <div className="charge-core">
        <div className="charge-cell" aria-hidden="true">
          <div className="charge-cell-fill">
            <span className="charge-cell-sheen" />
            {Array.from({ length: 8 }, (_, i) => (
              <i key={i} style={{ '--i': i } as React.CSSProperties} />
            ))}
          </div>
          <div className="charge-cell-cap" />
          <svg className="charge-bolt" viewBox="0 0 24 24">
            <path d="M13.5 2 4 13.5h6.5L9.5 22 20 9.5h-6.6z" />
          </svg>
        </div>
        <div className="charge-readout">
          <span ref={percent}>0</span>
          <small>%</small>
        </div>
        <p className="charge-status">{status}</p>
        {tasks.length > 0 && (
          <ul className="charge-tasks">
            {tasks.map((task) => (
              <li
                key={task.label}
                className={task.done ? (task.failed ? 'is-failed' : 'is-done') : ''}
              >
                <span className="charge-task-dot" />
                {task.label}
                <em>{task.done ? (task.failed ? '稍后重试' : '就绪') : '载入中'}</em>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
