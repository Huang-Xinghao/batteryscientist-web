import { useState } from 'react';
import { Alert, Button, Input, Space } from 'antd';
import type { UserQuestion } from '../../api/client';

export function TaskQuestion({
  question,
  stopping,
  onAnswer,
}: {
  question: UserQuestion;
  stopping: boolean;
  onAnswer: (question: UserQuestion, answer: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const disabled = stopping || sending || submitted || !question.live;
  async function submit() {
    if (disabled || !draft.trim()) return;
    setSending(true);
    setError('');
    try {
      await onAnswer(question, draft.trim());
      setSubmitted(true);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSending(false);
    }
  }
  return (
    <article className="review-card" aria-label="任务提问">
      <h3>{question.role === 'main' ? '主控' : question.role} 需要你回答</h3>
      <p style={{ whiteSpace: 'pre-wrap' }}>{question.question}</p>
      <p className="muted">回答将送回提出问题的原任务，继续当前执行。</p>
      <Space wrap>
        {(question.options || []).map((option) => (
          <Button key={option} disabled={disabled} onClick={() => setDraft(option)}>
            {option}
          </Button>
        ))}
      </Space>
      <Input.TextArea
        aria-label="任务回答"
        value={draft}
        disabled={disabled}
        placeholder="输入你的选择或补充说明"
        maxLength={20000}
        autoSize={{ minRows: 2, maxRows: 8 }}
        onChange={(event) => setDraft(event.target.value)}
      />
      {error && <Alert type="error" message={error} />}
      {!question.live && (
        <Alert type="warning" message="原提问未保持运行，请回到主控核查并继续。" />
      )}
      <Button
        type="primary"
        disabled={disabled || !draft.trim()}
        loading={sending}
        onClick={() => void submit()}
      >
        {stopping ? '任务正在停止' : submitted ? '已送回原任务' : '回答并继续原任务'}
      </Button>
    </article>
  );
}
