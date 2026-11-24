import { useEffect } from 'react';
import { burstFrom } from './burst';
import { prefersReducedMotion } from './motion';

/**
 * App-wide pointer effects, attached once:
 * - a soft glow that trails the cursor across the page background;
 * - `.spotlight` elements get --mx/--my so their border lights up under the cursor;
 * - elements marked `data-burst` fire an energy burst when clicked.
 */
export function AmbientEffects() {
  useEffect(() => {
    const root = document.documentElement;
    const reduced = prefersReducedMotion();
    let frame = 0;
    let x = 0;
    let y = 0;
    let target: HTMLElement | null = null;
    let tilted: HTMLElement | null = null;
    const apply = () => {
      frame = 0;
      root.style.setProperty('--cursor-x', `${x}px`);
      root.style.setProperty('--cursor-y', `${y}px`);
      if (target) {
        const bounds = target.getBoundingClientRect();
        target.style.setProperty('--mx', `${x - bounds.left}px`);
        target.style.setProperty('--my', `${y - bounds.top}px`);
      }
      // `.tilt` cards lean toward the cursor in 3D.
      const tilt = target?.classList.contains('tilt') && !reduced ? target : null;
      if (tilted && tilted !== tilt) {
        tilted.style.removeProperty('--rx');
        tilted.style.removeProperty('--ry');
      }
      tilted = tilt;
      if (tilt) {
        const bounds = tilt.getBoundingClientRect();
        const px = (x - bounds.left) / bounds.width - 0.5;
        const py = (y - bounds.top) / bounds.height - 0.5;
        tilt.style.setProperty('--rx', `${(-py * 9).toFixed(2)}deg`);
        tilt.style.setProperty('--ry', `${(px * 11).toFixed(2)}deg`);
      }
    };
    const move = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
      target = (event.target as Element | null)?.closest?.('.spotlight') as HTMLElement | null;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const click = (event: MouseEvent) => {
      const element = (event.target as Element | null)?.closest?.('[data-burst]');
      if (element && !prefersReducedMotion()) burstFrom(element);
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('click', click, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('click', click, true);
    };
  }, []);
  return <div className="cursor-glow" aria-hidden="true" />;
}
