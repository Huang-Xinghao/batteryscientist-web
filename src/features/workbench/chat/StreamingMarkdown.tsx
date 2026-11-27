import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSmoothText } from './useSmoothText';

/**
 * Renders a reply as Markdown. While it streams, text is revealed smoothly and a
 * glowing caret follows the newest words; finished replies render immediately.
 */
export function StreamingMarkdown({
  content,
  streaming,
  components,
}: {
  content: string;
  streaming: boolean;
  components?: Components;
}) {
  const { text, catchingUp } = useSmoothText(content, streaming);
  const live = streaming || catchingUp;
  return (
    <div className={`chat-markdown ${live ? 'is-streaming' : ''}`} aria-busy={live}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
      {live && <span className="stream-caret" aria-hidden="true" />}
    </div>
  );
}
