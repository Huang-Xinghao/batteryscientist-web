/** Battery outline whose charge glows with the brand gradient. */
export function BatteryMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true" className="battery-mark">
      <defs>
        <linearGradient id="battery-mark-gradient" x1="0" x2="1">
          <stop offset="0" stopColor="var(--charge-a)" />
          <stop offset="1" stopColor="var(--charge-b)" />
        </linearGradient>
      </defs>
      <rect
        x="3"
        y="7"
        width="21"
        height="16"
        rx="3.5"
        fill="none"
        stroke="url(#battery-mark-gradient)"
        strokeWidth="2"
      />
      <rect x="24.5" y="12" width="2.5" height="6" rx="1" fill="var(--charge-b)" />
      <rect
        className="battery-mark-charge"
        x="6.5"
        y="10.5"
        width="14"
        height="9"
        rx="1.5"
        fill="url(#battery-mark-gradient)"
      />
    </svg>
  );
}
