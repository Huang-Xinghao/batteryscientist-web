import { useEffect, useState } from 'react';
import { BulbOutlined, RightOutlined } from '@ant-design/icons';
import { StreamingMarkdown } from './StreamingMarkdown';
import { useNow } from './useNow';

/**
 * The model's own thinking, when the provider returns it. Open and streaming while
 * the model thinks; folded to "已思考 N 秒" afterwards, readable on demand.
 */
export function ReasoningBlock({
  content,
  streaming,
  startedAt,
  endedAt,
}: {
  content: string;
  streaming: boolean;
  startedAt?: string;
  endedAt: string;
}) {
  const [open, setOpen] = useState(streaming);
  const now = useNow(streaming);
  useEffect(() => {
    setOpen(streaming);
  }, [streaming]);
  const start = new Date(startedAt || endedAt).getTime();
  const seconds = Math.max(
    1,
    Math.round(((streaming ? now : new Date(endedAt).getTime()) - start) / 1000),
  );
  return (
    <section className={`reasoning-block ${streaming ? 'is-live' : ''}`} aria-label="思考过程">
      <button
        type="button"
        className="reasoning-summary"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <BulbOutlined className="reasoning-icon" aria-hidden="true" />
        {streaming ? (
          <span className="shiny-text">思考中 · {seconds} 秒</span>
        ) : (
          <span>已思考 {seconds} 秒</span>
        )}
        <RightOutlined className={`process-chevron ${open ? 'is-open' : ''}`} aria-hidden="true" />
      </button>
      <div className={`process-body ${open ? 'is-open' : ''}`}>
        <div className="reasoning-text">
          <StreamingMarkdown content={content} streaming={streaming} />
        </div>
      </div>
    </section>
  );
}
