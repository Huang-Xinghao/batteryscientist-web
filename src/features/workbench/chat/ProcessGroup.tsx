import { useEffect, useState } from 'react';
import { CheckOutlined, CloseOutlined, LoadingOutlined, RightOutlined } from '@ant-design/icons';
import { useNow } from './useNow';
import type { Step } from './steps';

function duration(from: string, to: number) {
  const seconds = Math.max(0, Math.round((to - new Date(from).getTime()) / 1000));
  if (seconds < 60) return `${seconds} 秒`;
  return `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`;
}

/**
 * Consecutive tool calls and progress notes between two messages, folded into one
 * block. While live it stays open and shows the current step; once finished it
 * collapses to a one-line summary that can be expanded step by step.
 */
export function ProcessGroup({
  steps,
  live,
  endedAt,
}: {
  steps: Step[];
  live: boolean;
  endedAt?: string;
}) {
  const [open, setOpen] = useState(live);
  const [openStep, setOpenStep] = useState<string>();
  const now = useNow(live);
  useEffect(() => {
    // Open while work is happening, fold away when it is done.
    setOpen(live);
  }, [live]);
  const errors = steps.filter((step) => step.status === 'error').length;
  const current = [...steps].reverse().find((step) => step.status === 'running');
  const names = [...new Set(steps.map((step) => step.title))];
  const elapsed = duration(
    steps[0].time,
    live ? now : new Date(endedAt || steps[steps.length - 1].time).getTime(),
  );
  return (
    <section
      className={`process-group ${live ? 'is-live' : ''} ${errors ? 'has-error' : ''}`}
      aria-label="执行过程"
    >
      <button
        type="button"
        className="process-summary"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="process-icon" aria-hidden="true">
          {live ? <LoadingOutlined spin /> : errors ? <CloseOutlined /> : <CheckOutlined />}
        </span>
        <span className="process-title">
          {live ? (
            <>
              <span className="shiny-text">
                {current ? `正在${current.title}` : '正在分析结果'}
              </span>
              {current?.hint ? <em>{current.hint}</em> : null}
            </>
          ) : (
            <>
              已完成 {steps.length} 步
              <em>
                {names.slice(0, 3).join('、')}
                {names.length > 3 ? ' 等' : ''}
              </em>
            </>
          )}
        </span>
        <span className="process-meta">
          {errors ? <span className="process-error-count">{errors} 步出错</span> : null}
          {live ? `第 ${steps.length} 步 · ` : ''}
          {elapsed}
        </span>
        <RightOutlined className={`process-chevron ${open ? 'is-open' : ''}`} aria-hidden="true" />
      </button>
      <div className={`process-body ${open ? 'is-open' : ''}`}>
        <ol className="process-steps">
          {steps.map((step) => (
            <li key={step.key} className={`process-step is-${step.status}`}>
              <button
                type="button"
                className="process-step-row"
                aria-expanded={openStep === step.key}
                disabled={!step.detail}
                onClick={() => setOpenStep(openStep === step.key ? undefined : step.key)}
              >
                <span className="process-step-dot" aria-hidden="true">
                  {step.status === 'running' ? (
                    <LoadingOutlined spin />
                  ) : step.status === 'error' ? (
                    <CloseOutlined />
                  ) : (
                    <CheckOutlined />
                  )}
                </span>
                <span className="process-step-title">{step.title}</span>
                {step.hint ? <span className="process-step-hint">{step.hint}</span> : null}
              </button>
              {openStep === step.key && step.detail ? (
                <div className="process-step-detail">{step.detail}</div>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
