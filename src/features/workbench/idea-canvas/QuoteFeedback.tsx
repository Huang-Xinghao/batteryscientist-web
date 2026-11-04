import { useEffect, useImperativeHandle, useRef, useState, type Ref, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { EditOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { Alert, App, Button, Drawer, Input } from 'antd';
import type { TextAreaRef } from 'antd/es/input/TextArea';

export type ReviewQuote = { title: string; text: string };
export type QuoteComposer = { open: (quote?: ReviewQuote) => void };

export function QuoteFeedback({
  root,
  composerRef,
  feedback,
  busy,
  onAppend,
  onDirtyChange,
}: {
  root: RefObject<HTMLDivElement | null>;
  composerRef: Ref<QuoteComposer>;
  feedback: string;
  busy: boolean;
  onAppend: (feedback: string, title: string) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { message } = App.useApp();
  const [selection, setSelection] = useState<(ReviewQuote & { left: number; top: number }) | null>(
    null,
  );
  const [quote, setQuote] = useState<ReviewQuote>({ title: '整体方案', text: '' });
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [notice, setNotice] = useState('');
  const input = useRef<TextAreaRef>(null);
  useEffect(() => {
    onDirtyChange(!!comment.trim());
    return () => onDirtyChange(false);
  }, [comment, onDirtyChange]);

  function compose(next: ReviewQuote = { title: '整体方案', text: '' }) {
    // 未加入的意见保留在原引用下，避免切换引用时错配或丢失输入。
    if (comment.trim()) {
      setNotice('你还有一条未加入的意见，请先加入或清空，再更换引用。');
    } else {
      setQuote(next);
      setNotice('');
    }
    setOpen(true);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }
  useImperativeHandle(composerRef, () => ({ open: compose }));

  useEffect(() => {
    let frame = 0;
    function update() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const selected = window.getSelection();
        const container = root.current;
        if (
          busy ||
          open ||
          !container ||
          !selected ||
          selected.isCollapsed ||
          !selected.rangeCount ||
          !container.contains(selected.anchorNode) ||
          !container.contains(selected.focusNode)
        ) {
          setSelection(null);
          return;
        }
        const range = selected.getRangeAt(0);
        const element =
          range.startContainer instanceof Element
            ? range.startContainer
            : range.startContainer.parentElement;
        const end =
          range.endContainer instanceof Element
            ? range.endContainer
            : range.endContainer.parentElement;
        if (
          element?.closest('input, textarea, [contenteditable="true"]') ||
          end?.closest('input, textarea, [contenteditable="true"]')
        ) {
          setSelection(null);
          return;
        }
        const text = selected.toString().trim();
        const rect = range.getBoundingClientRect();
        const pane = container.closest('.idea-reading-pane')?.getBoundingClientRect();
        if (!text || !pane || rect.bottom < pane.top || rect.top > pane.bottom) {
          setSelection(null);
          return;
        }
        const startTitle =
          element?.closest<HTMLElement>('[data-review-context]')?.dataset.reviewContext;
        const endTitle = end?.closest<HTMLElement>('[data-review-context]')?.dataset.reviewContext;
        setSelection({
          text,
          title: startTitle && startTitle === endTitle ? startTitle : '研究方案（跨部分）',
          left: Math.max(8, Math.min(rect.left, window.innerWidth - 168)),
          top: Math.max(
            pane.top + 4,
            Math.min(rect.top > pane.top + 48 ? rect.top - 44 : rect.bottom + 8, pane.bottom - 44),
          ),
        });
      });
    }
    function hide() {
      setSelection(null);
    }
    document.addEventListener('selectionchange', update);
    document.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('selectionchange', update);
      document.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [root, busy, open]);

  const entry = `【针对：${quote.title}】\n${
    quote.text
      ? `引用原文：\n${quote.text
          .split('\n')
          .map((line) => '> ' + line)
          .join('\n')}\n\n`
      : ''
  }我的修改意见：${comment.trim()}`;
  const next = [feedback.trimEnd(), entry].filter(Boolean).join('\n\n');
  const tooLong = next.length > 10000;
  return (
    <>
      {selection &&
        createPortal(
          <div
            className="proposal-selection-action"
            style={{ left: selection.left, top: selection.top }}
          >
            <Button
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => compose(selection)}
            >
              添加到对话
            </Button>
          </div>,
          document.body,
        )}
      <Drawer
        title="方案修改对话"
        open={open}
        width={460}
        onClose={() => setOpen(false)}
        afterOpenChange={(visible) => {
          if (visible) input.current?.focus();
        }}
        className="proposal-quote-drawer"
        footer={
          <div className="proposal-composer-footer">
            <p>先收集意见，再统一交给 Agent 修订</p>
            <Button
              type="primary"
              icon={<ArrowRightOutlined />}
              aria-label="加入本轮修改"
              disabled={busy || !comment.trim() || tooLong}
              onClick={() => {
                onAppend(next, quote.title);
                setComment('');
                setNotice('');
                setOpen(false);
                message.success('已加入本轮修改，最后点击底部“提交 Agent 修订”。');
              }}
            >
              加入本轮修改
            </Button>
          </div>
        }
      >
        <div className="proposal-composer-intro">
          <span className="proposal-composer-icon">
            <EditOutlined />
          </span>
          <div>
            <h3>把这一处，改成你的想法</h3>
            <p>保留原文作为上下文，写下明确的决定或修改要求。</p>
          </div>
        </div>
        {notice && <Alert type="info" message={notice} />}
        <div className="proposal-quote-context">
          <span className="proposal-composer-eyebrow">正在讨论</span>
          <strong>{quote.title}</strong>
          {quote.text && <blockquote>{quote.text}</blockquote>}
        </div>
        <div className="proposal-composer-field">
          <label htmlFor="proposal-quote-comment">你的决定或修改意见</label>
          <p>可以直接说怎么改，以及哪些内容需要保留。</p>
          <Input.TextArea
            id="proposal-quote-comment"
            ref={input}
            value={comment}
            disabled={busy}
            maxLength={10000}
            autoSize={{ minRows: 5, maxRows: 12 }}
            onChange={(event) => setComment(event.target.value)}
            placeholder="例如：这一点改为……；保留……，请同步检查受影响的部分。"
          />
          {tooLong && (
            <Alert
              type="warning"
              message="本轮意见和引用合计超过 10,000 字，请缩短意见或引用后再加入。"
            />
          )}
        </div>
        {!!feedback && (
          <details className="proposal-collected-comments">
            <summary>查看已加入及正在编辑的本轮意见</summary>
            <p>{feedback}</p>
          </details>
        )}
      </Drawer>
    </>
  );
}
