import { Alert, Button, Tag } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import type { ReviewQuote } from './QuoteFeedback';
import type { RevisionInfo } from './model';
import type { ReviewSection } from './reviewModel';

export function RevisionPanel({
  revision,
  changed,
  sections,
  onOpenSection,
  busy,
  onDecide,
}: {
  revision: RevisionInfo | null | undefined;
  changed: boolean;
  sections: ReviewSection[];
  onOpenSection: (id: string, origin: HTMLButtonElement, label: string) => void;
  busy: boolean;
  onDecide: (quote: ReviewQuote) => void;
}) {
  if (!revision) return null;
  const stale = !revision.synced || changed;
  const titles = new Map(sections.map((section) => [section.id, section.title]));
  function links(ids: string[], label: string) {
    const valid = [...new Set(ids)].filter((id) => titles.has(id));
    if (!valid.length) return null;
    return (
      <nav className="proposal-section-links" aria-label={`${label}涉及的章节`}>
        <span>涉及章节</span>
        {valid.map((id) => (
          <button
            type="button"
            key={id}
            onClick={(event) => onOpenSection(id, event.currentTarget, label)}
          >
            {titles.get(id)} <span aria-hidden="true">↗</span>
          </button>
        ))}
      </nav>
    );
  }
  return (
    <section
      className="proposal-section proposal-revision"
      aria-label="Agent 本轮修订"
      data-review-context="Agent 本轮修订"
    >
      <div className="proposal-section-heading">
        <h2>Agent 本轮修订</h2>
        <Tag color={stale ? 'orange' : revision.approved ? 'green' : 'blue'}>
          {stale ? '你又做了修改' : revision.approved ? '已批准版本' : '等待你复审'}
        </Tag>
      </div>
      <p>{revision.summary}</p>
      {stale && (
        <Alert
          type="info"
          message="以下是上一轮修订记录。当前新增修改尚未统一，请提交下一轮修订。"
        />
      )}
      {!!revision.questions.length && (
        <section className="proposal-decisions" tabIndex={-1} aria-label="待决策问题">
          <h3>这些问题需要你决定</h3>
          <p>点击“填写决定”，或选中文字添加到对话，写好后统一提交修订。</p>
          {revision.questions.map((question, index) => (
            <article
              className="proposal-decision-card"
              key={question.id}
              data-review-context={`待决问题 ${index + 1}`}
            >
              <div className="proposal-decision-heading">
                <span className="proposal-decision-number">
                  待你决定 · {String(index + 1).padStart(2, '0')}
                </span>
                <Button
                  icon={<EditOutlined />}
                  aria-label="填写决定"
                  className="proposal-decision-write"
                  disabled={busy}
                  onClick={() =>
                    onDecide({ title: `待决问题 ${index + 1}`, text: question.question })
                  }
                >
                  填写决定
                </Button>
              </div>
              <p>{question.question}</p>
              {links(question.sectionIds, `待决问题 ${index + 1}`)}
            </article>
          ))}
        </section>
      )}
      {!!revision.impacts.length && (
        <div className="proposal-impact-list">
          <h3>
            改了什么、影响哪里 <span>（{revision.impacts.length} 项，按需展开）</span>
          </h3>
          {revision.impacts.map((impact, index) => (
            <details
              className="proposal-revision-item"
              key={index}
              data-review-context={impact.title}
            >
              <summary>
                <Tag color={impact.kind === 'direct' ? 'blue' : 'gold'}>
                  {impact.kind === 'direct' ? '直接修改' : '关联影响'}
                </Tag>
                <span>{impact.title}</span>
              </summary>
              <p>{impact.detail}</p>
              {links(impact.sectionIds, impact.title)}
            </details>
          ))}
        </div>
      )}
      {!!revision.diff?.length && (
        <details className="proposal-details">
          <summary>对照提交前后的表述（{revision.diff.length} 处）</summary>
          {revision.diff.map((item) => (
            <article className="proposal-revision-item" key={item.id}>
              <h3>{item.title}</h3>
              <p className="proposal-previous">提交时：{item.beforeSummary || '新增部分'}</p>
              <p>修订后：{item.afterSummary || '已移除，相关内容请查看统一方案'}</p>
              {item.detailChanged && <p>具体内容也已调整，点击章节查看。</p>}
              {item.afterSummary && links([item.id], `表述对照：${item.title}`)}
            </article>
          ))}
        </details>
      )}
      {revision.approved && (
        <p>
          正式版本已锁定：<code>{revision.formalHash?.slice(0, 12)}</code>
          。后续修改形成新草稿，不会改变已交付版本。
        </p>
      )}
    </section>
  );
}
