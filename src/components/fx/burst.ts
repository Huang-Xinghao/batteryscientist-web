import { prefersReducedMotion, themeColor } from './motion';

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
};

/**
 * An energy burst from a point: a shockwave ring plus sparks that streak outward
 * and fade. Drawn on a temporary full-screen canvas that removes itself when done.
 */
export function burst(x: number, y: number, { count = 70, power = 1 } = {}) {
  if (typeof document === 'undefined' || prefersReducedMotion()) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'energy-burst';
  canvas.setAttribute('aria-hidden', 'true');
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * ratio;
  canvas.height = window.innerHeight * ratio;
  document.body.appendChild(canvas);
  const context = canvas.getContext('2d');
  if (!context) {
    canvas.remove();
    return;
  }
  context.scale(ratio, ratio);
  const palette = [
    themeColor('--charge-a', '#8f80ff'),
    themeColor('--charge-b', '#3de0c4'),
    '#ffffff',
    themeColor('--attn', '#ffb547'),
  ];
  const sparks: Spark[] = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const speed = (Math.random() * 6 + 2.5) * power;
    const max = 38 + Math.random() * 30;
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: max,
      max,
      size: Math.random() * 2.2 + 1,
      color: palette[i % palette.length],
    };
  });
  let ring = 0;
  const step = () => {
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ring += 9 * power;
    const ringAlpha = Math.max(0, 1 - ring / (220 * power));
    if (ringAlpha > 0) {
      context.globalAlpha = ringAlpha * 0.8;
      context.strokeStyle = palette[1];
      context.lineWidth = 2.5;
      context.shadowColor = palette[1];
      context.shadowBlur = 18;
      context.beginPath();
      context.arc(x, y, ring, 0, Math.PI * 2);
      context.stroke();
    }
    let alive = 0;
    for (const s of sparks) {
      if (s.life <= 0) continue;
      alive++;
      const px = s.x;
      const py = s.y;
      s.vx *= 0.94;
      s.vy = s.vy * 0.94 + 0.06;
      s.x += s.vx;
      s.y += s.vy;
      s.life -= 1;
      const t = s.life / s.max;
      context.globalAlpha = t;
      context.strokeStyle = s.color;
      context.shadowColor = s.color;
      context.shadowBlur = 12;
      context.lineWidth = s.size * t + 0.4;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(px, py);
      context.lineTo(s.x, s.y);
      context.stroke();
    }
    if (alive || ringAlpha > 0) requestAnimationFrame(step);
    else canvas.remove();
  };
  requestAnimationFrame(step);
}

/** Bursts from the center of an element, e.g. the button that was just pressed. */
export function burstFrom(
  element: Element | null | undefined,
  options?: { count?: number; power?: number },
) {
  if (!element) return;
  const bounds = element.getBoundingClientRect();
  burst(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2, options);
}
