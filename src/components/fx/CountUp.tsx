import { useEffect, useRef } from 'react';
import { animate } from 'motion';
import { prefersReducedMotion } from './motion';

/** Rolls a number up from its previous value whenever it changes. */
export function CountUp({ value, duration = 1.1 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (prefersReducedMotion()) {
      element.textContent = String(value);
      previous.current = value;
      return;
    }
    const controls = animate(previous.current, value, {
      duration,
      ease: [0.2, 0.9, 0.2, 1],
      onUpdate: (latest) => {
        element.textContent = String(Math.round(latest));
      },
    });
    previous.current = value;
    return () => controls.stop();
  }, [value, duration]);
  return (
    <span ref={ref} className="count-up">
      {value}
    </span>
  );
}
