import { useNow } from './useNow';

/**
 * Shown while an agent is working and no reply text is streaming yet. It says what
 * the agent is doing and for how long; it never shows private model reasoning.
 */
export function ThinkingBubble({
  agent,
  activity,
  since,
}: {
  agent: string;
  activity: string;
  since?: string;
}) {
  const now = useNow(true);
  const seconds = since ? Math.max(0, Math.round((now - new Date(since).getTime()) / 1000)) : 0;
  return (
    <div className="thinking-bubble" role="status" aria-live="polite">
      <span className="thinking-indicator" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <div>
        <strong>{agent} 正在思考</strong>
        <small>
          {activity}
          {seconds ? ` · ${seconds} 秒` : ''}
        </small>
      </div>
    </div>
  );
}
