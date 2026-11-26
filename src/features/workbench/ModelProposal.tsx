import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Input, Spin } from 'antd';
import { CheckCircleFilled, EditOutlined, InboxOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useBlocker } from 'react-router-dom';
import { active, api, request, type ProposalOverview } from '../../api/client';
import type { components } from '../../api/schema';
import './model-proposal.css';

type Overview = ProposalOverview;
type ReviewArchive = components['schemas']['ReviewArchiveView'];

export default function ModelProposal({
  projectId,
  onDirtyChange,
}: {
  projectId: string;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const client = useQueryClient();
  const { message, modal } = App.useApp();
  const project = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.project(projectId),
    refetchInterval: 4000,
  });
  const overview = useQuery({
    queryKey: ['proposal-overview', projectId],
    queryFn: () => request<Overview>(`/projects/${projectId}/proposal-overview`),
    refetchInterval: active(project.data?.status || '') ? 4000 : false,
  });
  const checkpoint =
    project.data?.status === 'awaiting_user' &&
    project.data.state.mode === 'expert' &&
    project.data.state.expert_checkpoint?.node === 'refine'
      ? project.data.state.expert_checkpoint
      : null;
  const questions = checkpoint?.questions || [];
  const key = JSON.stringify([overview.data?.sha256, project.data?.checkpoint_token, questions]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setAnswers({});
    setError('');
  }, [key]);
  const dirty = Object.values(answers).some((answer) => !!answer.trim());
  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);
  const blocker = useBlocker(dirty);
  async function submit(accept: boolean, answer?: string) {
    if (!project.data || !overview.data || !checkpoint) return;
    setBusy(true);
    setError('');
    try {
      // Bind the answer to the displayed formal file, not a stale cached version.
      const current = await api.file(projectId, 'refine-logs/FINAL_PROPOSAL.md');
      if (current.sha256 !== overview.data.sha256) {
        await overview.refetch();
        throw new Error('方案已更新，请查看新版后回答');
      }
      await api.run(projectId, {
        action: 'review',
        checkpoint_token: project.data.checkpoint_token,
        answer:
          answer ??
          (accept
            ? ''
            : questions
                .map((question, i) => `问题：${question}\n回答：${answers[i] || ''}`)
                .join('\n\n')),
      });
      setAnswers({});
      await client.invalidateQueries({ queryKey: ['project', projectId] });
      message.success(
        answer ? '已交给 Agent 修订方案' : accept ? '已确认方案，继续下一步' : '回答已提交',
      );
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  /**
   * A draft left by the former proposal-review page blocks approval. It is moved to
   * refine-logs/archive/ (never deleted); then either continue with the current
   * proposal or hand the archived opinions to the Agent for a revision.
   */
  async function resolveDraft(withAgent: boolean) {
    setBusy(true);
    setError('');
    let archived: string[];
    try {
      archived = (
        await request<ReviewArchive>(`/projects/${projectId}/idea-canvas/archive`, {
          method: 'POST',
        })
      ).archived;
      await overview.refetch();
    } catch (reason) {
      setError((reason as Error).message);
      setBusy(false);
      return;
    }
    setBusy(false);
    await submit(
      !withAgent,
      withAgent
        ? `请读取已归档的方案审阅草稿（${archived.join('、')}），把其中尚未写入正文的修改意见整合进 refine-logs/FINAL_PROPOSAL.md，然后重新提交方案供我审阅。`
        : undefined,
    );
  }
  function confirmArchive() {
    modal.confirm({
      title: '归档草稿并按当前方案继续？',
      content:
        '草稿会移到 refine-logs/archive/ 下保留，不会删除；草稿里尚未写入正文的修改不会生效。',
      okText: '归档并继续',
      onOk: () => resolveDraft(false),
    });
  }
  if (overview.isPending) return <Spin className="editor-loading" />;
  if (overview.isError)
    return <Alert type="error" message="方案加载失败" description={overview.error.message} />;
  const data = overview.data;
  const pending = data.pendingReview;
  const draftDetails = pending
    ? [
        pending.unreadable && '草稿文件无法读取',
        pending.changes > 0 && `${pending.changes} 条修改记录`,
        pending.editedSections > 0 && `${pending.editedSections} 个章节被改过`,
        pending.hasFeedback && '有一段修改意见',
        pending.hasRevision && '有一次 Agent 修订尚未批准',
      ].filter(Boolean)
    : [];
  return (
    <section className="model-proposal" aria-label="模型方案">
      {blocker.state === 'blocked' && (
        <Alert
          type="warning"
          message="回答尚未提交"
          action={
            <>
              <Button onClick={() => blocker.reset()}>继续填写</Button>
              <Button onClick={() => blocker.proceed()}>放弃回答并离开</Button>
            </>
          }
        />
      )}
      <h2>模型架构</h2>
      {data.diagram ? (
        <pre className="model-architecture" aria-label="模型架构图">
          {data.diagram}
        </pre>
      ) : (
        <p>当前正式方案未包含架构图。</p>
      )}
      {(
        [
          ['模型输入', data.input],
          ['模型架构', data.architecture],
          ['模型输出', data.output],
        ] as const
      ).map(([title, body]) => (
        <section key={title} className="model-description">
          <h3>{title}</h3>
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
            {body
              .replace(/```[^\n]*\n([\s\S]*?)```/g, (block, code: string) =>
                code.trim() === data.diagram ? '' : block,
              )
              .trim() || '当前正式方案未单独说明。'}
          </ReactMarkdown>
        </section>
      ))}
      {checkpoint && (
        <section className="model-questions" aria-label="方案问题">
          <h3>需要你确认的问题</h3>
          {questions.map((question, index) => (
            <label key={question}>
              {question}
              <Input.TextArea
                aria-label={question}
                rows={3}
                value={answers[index] || ''}
                onChange={(event) => setAnswers({ ...answers, [index]: event.target.value })}
                disabled={busy}
              />
            </label>
          ))}
          {pending ? (
            <div className="proposal-draft-card" role="region" aria-label="未处理的方案审阅草稿">
              <h4>
                <EditOutlined aria-hidden /> 有一份方案审阅草稿还没处理
              </h4>
              <p>
                这是之前在方案审阅里留下的修改
                {draftDetails.length ? `（${draftDetails.join('，')}）` : ''}
                。继续之前需要先处理它，选一种方式：
              </p>
              <div className="proposal-draft-actions">
                <Button
                  type="primary"
                  data-burst
                  icon={<EditOutlined aria-hidden />}
                  loading={busy}
                  disabled={busy || pending.unreadable}
                  onClick={() => void resolveDraft(true)}
                >
                  让 Agent 按草稿修订方案
                </Button>
                <Button
                  icon={<InboxOutlined aria-hidden />}
                  disabled={busy}
                  onClick={confirmArchive}
                >
                  归档草稿，按当前方案继续
                </Button>
              </div>
              <small>两种方式都会先把草稿移到 refine-logs/archive/ 保留，不会删除。</small>
            </div>
          ) : (
            !questions.length && <p>是否按以上模型方案继续？</p>
          )}
          {error && <Alert type="error" message={error} />}
          {!pending && !!questions.length && (
            <Button
              type="primary"
              loading={busy}
              disabled={busy || questions.some((_, index) => !answers[index]?.trim())}
              onClick={() => void submit(false)}
            >
              提交回答
            </Button>
          )}
          {!pending && (
            <Button
              type={questions.length ? 'default' : 'primary'}
              size="large"
              data-burst
              icon={<CheckCircleFilled aria-hidden />}
              loading={busy}
              disabled={busy || Object.values(answers).some((answer) => answer.trim())}
              onClick={() => void submit(true)}
            >
              按此方案继续
            </Button>
          )}
        </section>
      )}
    </section>
  );
}
