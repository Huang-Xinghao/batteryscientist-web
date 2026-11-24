import { useEffect, useRef } from 'react';
import { prefersReducedMotion, themeColor } from './motion';

type Particle = { x: number; y: number; vx: number; vy: number; r: number; hue: 0 | 1 };

/**
 * Drifting "ion" particles joined by faint links, attracted to the pointer.
 * Fills its positioned parent; pauses while off screen or when the tab is hidden,
 * and draws a single still frame when the user prefers reduced motion.
 */
export function ParticleField({
  density = 1,
  className = '',
  interactive = true,
}: {
  density?: number;
  className?: string;
  interactive?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const colors = [themeColor('--charge-a', '#8f80ff'), themeColor('--charge-b', '#3de0c4')];
    const reduced = prefersReducedMotion();
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let frame = 0;
    let visible = true;
    const pointer = { x: -9999, y: -9999 };

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.round(Math.min(110, (width * height) / 9000) * density);
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.6,
        hue: Math.random() > 0.5 ? 1 : 0,
      }));
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      const linkDistance = 110;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        if (!reduced) {
          const dx = pointer.x - a.x;
          const dy = pointer.y - a.y;
          const distance = Math.hypot(dx, dy);
          if (distance < 160 && distance > 1) {
            a.vx += (dx / distance) * 0.018;
            a.vy += (dy / distance) * 0.018;
          }
          a.vx *= 0.985;
          a.vy *= 0.985;
          a.vx += (Math.random() - 0.5) * 0.02;
          a.vy += (Math.random() - 0.5) * 0.02;
          a.x += a.vx;
          a.y += a.vy;
          if (a.x < -10) a.x = width + 10;
          if (a.x > width + 10) a.x = -10;
          if (a.y < -10) a.y = height + 10;
          if (a.y > height + 10) a.y = -10;
        }
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (distance < linkDistance) {
            context.globalAlpha = (1 - distance / linkDistance) * 0.22;
            context.strokeStyle = colors[a.hue];
            context.lineWidth = 0.8;
            context.beginPath();
            context.moveTo(a.x, a.y);
            context.lineTo(b.x, b.y);
            context.stroke();
          }
        }
      }
      for (const p of particles) {
        context.globalAlpha = 0.85;
        context.fillStyle = colors[p.hue];
        context.shadowColor = colors[p.hue];
        context.shadowBlur = 8;
        context.beginPath();
        context.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        context.fill();
      }
      context.shadowBlur = 0;
      context.globalAlpha = 1;
    };

    const loop = () => {
      if (visible && !document.hidden) draw();
      frame = requestAnimationFrame(loop);
    };

    resize();
    if (reduced) draw();
    else frame = requestAnimationFrame(loop);

    const observer = new ResizeObserver(() => {
      resize();
      if (reduced) draw();
    });
    observer.observe(canvas);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    intersection.observe(canvas);
    const move = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointer.x = event.clientX - bounds.left;
      pointer.y = event.clientY - bounds.top;
    };
    const leave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
    };
    const host = canvas.parentElement;
    if (interactive && host) {
      host.addEventListener('pointermove', move);
      host.addEventListener('pointerleave', leave);
    }
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      host?.removeEventListener('pointermove', move);
      host?.removeEventListener('pointerleave', leave);
    };
  }, [density, interactive]);
  return <canvas ref={canvasRef} className={`particle-field ${className}`} aria-hidden="true" />;
}
