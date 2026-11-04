import { useEffect, useState } from 'react';
import { Spin } from 'antd';
import type { CanvasResponse } from './model';

const stages = [
  ['preparing', '整理修改'],
  ['waiting_model', '等待模型'],
  ['receiving', '接收修订'],
  ['validating', '核对完整性'],
  ['saving', '保存方案'],
  ['ready', '等待复审'],
] as const;

export function RevisionProgress({ operation }: { operation: CanvasResponse['operation'] }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const started = operation?.createdAt ? Date.parse(operation.createdAt) : NaN;
  const elapsed = Number.isFinite(started) ? Math.max(0, Math.floor((now - started) / 1000)) : null;
  const index = stages.findIndex(([key]) => key === operation?.progress?.stage);
  const revising = operation?.action === 'proposal_revise';
  const stage =
    operation?.status === 'queued'
      ? '等待任务开始'
      : revising
        ? stages[index]?.[1] || '正在准备修订'
        : operation?.action === 'proposal_approve'
          ? '锁定方案并生成实验计划'
          : '正在处理项目任务';
  const updated = operation?.progress?.updatedAt
    ? Date.parse(operation.progress.updatedAt)
    : started;
  const quiet = Number.isFinite(updated) && now - updated > 60000;
  return (
    <section className="proposal-progress" aria-label="方案任务进度" aria-busy="true">
      <div className="proposal-progress-heading">
        <strong role="status">
          <Spin size="small" /> {stage}
        </strong>
        <span>
          {elapsed === null
            ? '等待进度更新'
            : `已等待 ${Math.floor(elapsed / 60)} 分 ${elapsed % 60} 秒`}
        </span>
      </div>
      {revising && (
        <ol aria-label="修订阶段">
          {stages.map(([key, title], step) => (
            <li
              key={key}
              className={step === index ? 'is-current' : step < index ? 'is-done' : ''}
              aria-current={step === index ? 'step' : undefined}
            >
              <span aria-hidden="true">{step < index ? '✓' : step + 1}</span>
              {title}
            </li>
          ))}
        </ol>
      )}
      <p>
        {operation?.progress?.receivedChars
          ? `已接收 ${operation.progress.receivedChars.toLocaleString()} 个字符。`
          : ''}
        {quiet
          ? '超过 1 分钟没有新的阶段消息，仍在等待服务响应；可在运行动态查看或停止。'
          : '完成后自动更新本页。当前方案可阅读，修改暂时暂停。'}
      </p>
    </section>
  );
}
