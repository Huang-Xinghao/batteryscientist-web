import { useEffect, useState } from 'react';
import { useReducedMotion } from '../../components/fx/motion';

/** Illustrative cycling data: discharge curves shrink as the cell ages, with a late "knee". */
const CYCLES = 12;
const CYCLE_STEP = 100;
const W = 420;
const H = 210;
const PAD = { left: 34, right: 12, top: 14, bottom: 26 };

function retention(cycle: number) {
  const n = cycle / (CYCLES * CYCLE_STEP);
  return 1 - 0.09 * n - 0.16 * n ** 4;
}
/** Voltage over the discharged fraction of this cycle's capacity. */
function voltage(x: number) {
  return 4.18 - 0.42 * x - 0.08 * (1 - Math.exp(-x * 18)) - 0.62 * x ** 9;
}
const VMIN = 2.9;
const VMAX = 4.25;
function curvePath(cycle: number) {
  const capacity = retention(cycle);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const points: string[] = [];
  for (let i = 0; i <= 48; i++) {
    const x = i / 48;
    const px = PAD.left + x * capacity * plotW;
    const py = PAD.top + ((VMAX - voltage(x)) / (VMAX - VMIN)) * plotH;
    points.push(`${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`);
  }
  return points.join(' ');
}
const curves = Array.from({ length: CYCLES }, (_, i) => ({
  cycle: (i + 1) * CYCLE_STEP,
  path: curvePath((i + 1) * CYCLE_STEP),
}));

const SOH_W = 420;
const SOH_H = 70;
function sohPoint(cycle: number) {
  const x = 8 + (cycle / (CYCLES * CYCLE_STEP * 1.25)) * (SOH_W - 16);
  const y = 8 + ((1 - retention(cycle)) / 0.32) * (SOH_H - 16);
  return [x, y] as const;
}
const forecast = Array.from({ length: 31 }, (_, i) => {
  const cycle = (i / 30) * CYCLES * CYCLE_STEP * 1.25;
  const [x, y] = sohPoint(cycle);
  return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
}).join(' ');

/**
 * Hero instrument: a cycler drawing discharge curves one by one while the
 * state-of-health trace and its life forecast build up underneath.
 */
export function CycleLab() {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(reduced ? CYCLES : 1);
  useEffect(() => {
    if (reduced) return;
    const timer = setInterval(() => setStep((s) => (s >= CYCLES + 3 ? 1 : s + 1)), 780);
    return () => clearInterval(timer);
  }, [reduced]);
  const shown = reduced ? CYCLES : Math.min(step, CYCLES);
  const current = curves[shown - 1];
  const soh = retention(current.cycle) * 100;
  return (
    <figure className="cycle-lab spotlight tilt" aria-label="电池循环测试示意动画">
      <header className="cycle-lab-head">
        <span className="cycle-lab-led" />
        <strong>循环老化测试</strong>
        <small>CELL-07 · NMC811 · 1C/1C · 示意数据</small>
      </header>
      <div className="cycle-lab-readouts">
        <div>
          <small>循环</small>
          <b>{current.cycle}</b>
        </div>
        <div>
          <small>健康度 SOH</small>
          <b>
            {soh.toFixed(1)}
            <i>%</i>
          </b>
        </div>
        <div>
          <small>预测剩余寿命</small>
          <b>
            {Math.max(0, Math.round((retention(current.cycle) - 0.8) * 4200))}
            <i>次</i>
          </b>
        </div>
      </div>
      <svg className="cycle-lab-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-hidden="true">
        <defs>
          <linearGradient id="cycle-grad" x1="0" x2="1">
            <stop offset="0" stopColor="var(--charge-b)" />
            <stop offset="1" stopColor="var(--charge-a)" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={i}
            className="cycle-lab-gridline"
            x1={PAD.left}
            x2={W - PAD.right}
            y1={PAD.top + (i * (H - PAD.top - PAD.bottom)) / 4}
            y2={PAD.top + (i * (H - PAD.top - PAD.bottom)) / 4}
          />
        ))}
        {['4.2', '3.9', '3.6', '3.2', '2.9'].map((label, i) => (
          <text
            key={label}
            className="cycle-lab-axis"
            x={PAD.left - 6}
            y={PAD.top + 4 + (i * (H - PAD.top - PAD.bottom)) / 4}
            textAnchor="end"
          >
            {label}
          </text>
        ))}
        <text className="cycle-lab-axis" x={W - PAD.right} y={H - 6} textAnchor="end">
          放电容量 →
        </text>
        <text className="cycle-lab-axis" x={PAD.left} y={H - 6}>
          电压 V
        </text>
        {curves.slice(0, shown).map((curve, index) => (
          <path
            key={curve.cycle}
            className={`cycle-lab-curve ${index === shown - 1 && !reduced ? 'is-drawing' : ''}`}
            d={curve.path}
            pathLength={1}
            style={{ opacity: 0.18 + (0.82 * (index + 1)) / shown }}
          />
        ))}
      </svg>
      <svg className="cycle-lab-soh" viewBox={`0 0 ${SOH_W} ${SOH_H}`} aria-hidden="true">
        <path className="cycle-lab-forecast" d={forecast} />
        <line
          className="cycle-lab-eol"
          x1={8}
          x2={SOH_W - 8}
          y1={8 + (0.2 / 0.32) * (SOH_H - 16)}
          y2={8 + (0.2 / 0.32) * (SOH_H - 16)}
        />
        <text
          className="cycle-lab-axis"
          x={SOH_W - 8}
          y={8 + (0.2 / 0.32) * (SOH_H - 16) - 4}
          textAnchor="end"
        >
          寿命终点 80%
        </text>
        {curves.slice(0, shown).map((curve) => {
          const [x, y] = sohPoint(curve.cycle);
          return <circle key={curve.cycle} className="cycle-lab-dot" cx={x} cy={y} r={3.2} />;
        })}
      </svg>
    </figure>
  );
}
