import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { Button, Input, Space, Tag } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { RevisionPanel } from './RevisionPanel';
import { QuoteFeedback, type QuoteComposer } from './QuoteFeedback';
import type { ModuleNode, RevisionInfo } from './model';
import type { ProposalReview, ReviewSection } from './reviewModel';
import './overview.css';

export type OverviewNavigation = { showDecisions: () => void; openFeedback: () => void };

export function ProposalOverview({
  review,
  onApply,
  onEditingChange,
  onOpenCanvas,
  nodes,
  changes,
  onOpenModule,
  onExport,
  revision,
  changed,
  busy,
  navigationRef,
  onCommentDraftChange,
}: {
  review: ProposalReview;
  onApply: (review: ProposalReview, change: string) => void;
  onEditingChange: (dirty: boolean) => void;
  onOpenCanvas: () => void;
  nodes: ModuleNode[];
  changes: string[];
  onOpenModule: (node: ModuleNode) => void;
  onExport: () => void;
  revision?: RevisionInfo | null;
  changed: boolean;
  busy: boolean;
  navigationRef: Ref<OverviewNavigation>;
  onCommentDraftChange: (dirty: boolean) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const quoteComposer = useRef<QuoteComposer>(null);
  const [quoteDirty, setQuoteDirty] = useState(false);
  useEffect(() => onCommentDraftChange(quoteDirty), [quoteDirty, onCommentDraftChange]);
  const [location, setLocation] = useState<{
    id: string;
    origin: HTMLButtonElement;
    scrollTop: number;
    label: string;
  } | null>(null);
  useImperativeHandle(navigationRef, () => ({
    openFeedback: () => quoteComposer.current?.open(),
    showDecisions() {
      setLocation(null);
      // 等待视图切换和返回栏移除，定位问题区时不影响未应用的编辑。
      requestAnimationFrame(() => {
        const target = root.current?.querySelector<HTMLElement>('.proposal-decisions');
        const pane = root.current?.closest('.idea-reading-pane');
        if (!target || !pane) return;
        target.focus({ preventScroll: true });
        pane.scrollTo({
          top:
            pane.scrollTop +
            target.getBoundingClientRect().top -
            pane.getBoundingClientRect().top -
            18,
          behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        });
      });
    },
  }));
  function openSection(id: string, origin: HTMLButtonElement, label: string) {
    const target = root.current?.querySelector<HTMLElement>(
      `[id="proposal-section-${CSS.escape(id)}"]`,
    );
    const pane = root.current?.closest('.idea-reading-pane');
    if (!target || !pane) return;
    setLocation({ id, origin, label, scrollTop: pane.scrollTop });
    const details = target.querySelector('details');
    if (details) details.open = true;
    // 等待返回栏占位后再定位，只滚动审阅容器，避免把整个工作区卷走。
    requestAnimationFrame(() => {
      target.focus({ preventScroll: true });
      const offset =
        (root.current?.querySelector('.proposal-return-bar')?.getBoundingClientRect().height ||
          64) + 18;
      pane.scrollTo({
        top:
          pane.scrollTop +
          target.getBoundingClientRect().top -
          pane.getBoundingClientRect().top -
          offset,
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      });
    });
  }
  function returnToOrigin() {
    if (!location) return;
    const pane = root.current?.closest('.idea-reading-pane');
    const previous = location;
    setLocation(null);
    requestAnimationFrame(() => {
      pane?.scrollTo({ top: previous.scrollTop, behavior: 'instant' });
      previous.origin.focus({ preventScroll: true });
    });
  }
  const [editing, setEditing] = useState<ReviewSection | null>(null);
  const [feedback, setFeedback] = useState(review.feedback);
  useEffect(() => setFeedback(review.feedback), [review.feedback]);
  const original = review.sections.find((s) => s.id === editing?.id);
  const formDirty =
    quoteDirty ||
    feedback !== review.feedback ||
    (!!editing && (editing.summary !== original?.summary || editing.details !== original?.details));
  useEffect(() => {
    onEditingChange(formDirty);
    return () => onEditingChange(false);
  }, [formDirty, onEditingChange]);
  const primary = review.sections.filter((s) => !s.focus);
  const focus = review.sections.filter((s) => s.focus);
  const affected = nodes.filter((n) => n.data.needsReview && !n.data.disabled);
  const modified = review.sections.filter((s) => s.edited);
  function section(item: ReviewSection) {
    return (
      <article
        id={`proposal-section-${item.id}`}
        className={`proposal-card ${item.focus ? 'is-focus' : ''} ${location?.id === item.id ? 'is-located' : ''}`}
        tabIndex={-1}
        aria-label={item.title}
        data-review-context={item.title}
        key={item.id}
      >
        <div className="proposal-card-heading">
          <h3>{item.title}</h3>
          {item.edited && <Tag color="orange">人工修改</Tag>}
        </div>
        {editing?.id === item.id ? (
          <div className="proposal-inline-editor">
            <label htmlFor={`summary-${item.id}`}>重点表述</label>
            <Input.TextArea
              id={`summary-${item.id}`}
              value={editing.summary}
              disabled={busy}
              maxLength={3000}
              autoSize={{ minRows: 3, maxRows: 7 }}
              onChange={(e) => setEditing({ ...editing, summary: e.target.value })}
            />
            <label htmlFor={`detail-${item.id}`}>具体内容与依据</label>
            <Input.TextArea
              id={`detail-${item.id}`}
              value={editing.details}
              disabled={busy}
              maxLength={80000}
              autoSize={{ minRows: 4, maxRows: 12 }}
              onChange={(e) => setEditing({ ...editing, details: e.target.value })}
            />
            <Space wrap>
              <Button
                type="primary"
                disabled={busy || !editing.summary.trim()}
                onClick={() => {
                  onApply(
                    {
                      ...review,
                      sections: review.sections.map((s) =>
                        s.id === editing.id ? { ...editing, edited: true } : s,
                      ),
                    },
                    `修改方案说明：${item.title}；研究主张与方法关联待 Agent 核查`,
                  );
                  setEditing(null);
                }}
              >
                应用这处修改
              </Button>
              <Button onClick={() => setEditing(null)}>取消编辑</Button>
            </Space>
          </div>
        ) : (
          <>
            <p className="proposal-card-summary">{item.summary}</p>
            <div className="proposal-card-actions">
              <Button
                type="link"
                size="small"
                disabled={busy || !!editing}
                onClick={() => setEditing({ ...item })}
              >
                修改这一部分
              </Button>
              <Button
                type="link"
                size="small"
                disabled={busy}
                onClick={() =>
                  quoteComposer.current?.open({ title: item.title, text: item.summary })
                }
              >
                提修改意见
              </Button>
            </div>
            <details className="proposal-details">
              <summary>展开依据与细节</summary>
              <article className="markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {item.details || '当前提案未给出进一步说明。'}
                </ReactMarkdown>
              </article>
            </details>
          </>
        )}
      </article>
    );
  }
  return (
    <div ref={root} className="proposal-overview" aria-label="方案审阅总览">
      {location && (
        <div className="proposal-return-bar" role="navigation" aria-label="章节定位导航">
          <span>来自：{location.label}</span>
          <Button size="small" onClick={returnToOrigin}>
            返回刚才的修订意见 ↑
          </Button>
        </div>
      )}
      <header className="proposal-overview-heading">
        <div>
          <span className="proposal-eyebrow">最终研究提案 · 审阅草稿</span>
          <h2>先看全貌，再决定怎么改</h2>
          <p>先理解目标和核心办法，再看关键取舍；细节在原处展开，方法图随时可看。</p>
          <p>选中文字可“添加到对话”，在原处提出修改意见。</p>
        </div>
      </header>
      <RevisionPanel
        revision={revision}
        changed={changed}
        sections={review.sections}
        onOpenSection={openSection}
        busy={busy}
        onDecide={(quote) => quoteComposer.current?.open(quote)}
      />
      <div className="proposal-card-grid">{primary.slice(0, 2).map(section)}</div>
      {focus.length > 0 && (
        <section className="proposal-section">
          <div className="proposal-section-heading">
            <h2>重点看这些取舍</h2>
            <span>来自提案已有选择，可直接修改</span>
          </div>
          <div className="proposal-card-grid">{focus.map(section)}</div>
        </section>
      )}
      {primary.length > 2 && (
        <section className="proposal-section">
          <div className="proposal-card-grid">{primary.slice(2).map(section)}</div>
        </section>
      )}
      <section className="proposal-section proposal-method-section">
        <div className="proposal-section-heading">
          <div>
            <h2>方法怎样连起来</h2>
            <span>{nodes.length} 个模块 · 可查看、编辑或增删</span>
          </div>
          <Button disabled={busy} onClick={onOpenCanvas}>
            打开方法画布 ↗
          </Button>
        </div>
      </section>
      {(modified.length > 0 || affected.length > 0 || changes.length > 0) && (
        <section className="proposal-section proposal-impact">
          <h2>本轮修改与关联影响</h2>
          {modified.length > 0 && (
            <>
              <p>已修改：{modified.map((s) => s.title).join('、')}。</p>
              <p>
                这些修改尚未统一到方案正文与方法图。集中提交后，Agent 会检查关联影响并交还你复审。
              </p>
            </>
          )}
          {affected.length > 0 && (
            <>
              <p>以下模块受内容或连接调整影响，点击即可检查：</p>
              <Space wrap>
                {affected.map((node) => (
                  <Button
                    disabled={busy}
                    size="small"
                    key={node.id}
                    onClick={() => onOpenModule(node)}
                  >
                    {node.data.title}
                  </Button>
                ))}
              </Space>
            </>
          )}
          <details className="proposal-details">
            <summary>查看修改记录（{changes.length}）</summary>
            <ol>
              {[...changes].reverse().map((change, i) => (
                <li key={i}>{change}</li>
              ))}
            </ol>
          </details>
        </section>
      )}
      <section className="proposal-section proposal-feedback">
        <h2>还有哪些地方要改</h2>
        <p>写下你的要求，和已编辑的内容一起交给 Agent；不必逐个确认所有模块。</p>
        <Input.TextArea
          aria-label="方案修改意见"
          value={feedback}
          disabled={busy}
          maxLength={10000}
          onChange={(e) => setFeedback(e.target.value)}
          autoSize={{ minRows: 3, maxRows: 8 }}
          placeholder="例如：保留当前研究目标，但先用简单统计方法验证是否存在增量，再决定是否值得引入复杂编码器。"
        />
        <Space wrap>
          <Button
            disabled={busy || feedback === review.feedback}
            onClick={() =>
              onApply({ ...review, feedback }, '更新方案修改意见；待 Agent 修订正式提案')
            }
          >
            加入本轮修改
          </Button>
          <Button disabled={formDirty} onClick={onExport}>
            导出修订要求
          </Button>
        </Space>
        <p className="proposal-handoff-note">
          将意见加入本轮修改后，点击下方“提交 Agent
          修订”。可以反复修改、复审；保存和修订都不会启动实验。
        </p>
      </section>
      <QuoteFeedback
        root={root}
        composerRef={quoteComposer}
        feedback={feedback}
        busy={busy}
        onDirtyChange={setQuoteDirty}
        onAppend={(next, title) => {
          setFeedback(next);
          onApply({ ...review, feedback: next }, `加入引用修改意见：${title}`);
        }}
      />
    </div>
  );
}
