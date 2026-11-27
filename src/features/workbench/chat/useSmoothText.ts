import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../../components/fx/motion';

/**
 * Reveals streamed text at a steady, adaptive pace instead of in network-sized bursts.
 * The further the display lags behind the received text, the faster it catches up,
 * so a fast model never leaves the reader waiting long after the answer arrived.
 */
export function useSmoothText(target: string, streaming: boolean) {
  const [shown, setShown] = useState(() => (streaming ? '' : target));
  const shownRef = useRef(shown);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    // Finished or reduced motion: show everything at once.
    if (!streaming || prefersReducedMotion()) {
      shownRef.current = target;
      setShown(target);
      return;
    }
    // Text was replaced rather than extended (e.g. a reset attempt): restart.
    if (!target.startsWith(shownRef.current)) {
      shownRef.current = '';
      setShown('');
    }
  }, [target, streaming]);

  useEffect(() => {
    if (!streaming || prefersReducedMotion()) return;
    let frame = 0;
    let last = performance.now();
    let budget = 0;
    const tick = (now: number) => {
      const goal = targetRef.current;
      const current = shownRef.current;
      if (current.length < goal.length) {
        const lag = goal.length - current.length;
        // ~45 chars/s when close, up to several hundred when far behind.
        const rate = 45 + lag * 4;
        budget += ((now - last) / 1000) * rate;
        const step = Math.floor(budget);
        if (step > 0) {
          budget -= step;
          const next = goal.slice(0, current.length + step);
          shownRef.current = next;
          setShown(next);
        }
      } else budget = 0;
      last = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [streaming]);

  return { text: shown, catchingUp: streaming && shown.length < target.length };
}
