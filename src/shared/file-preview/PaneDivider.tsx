// Adapted from StoraGent LatexEditor.vue (MIT), including keyboard resizing.
// Copyright (c) 2026 StoraGent Team. See STORAGENT-LICENSE.txt.
export function PaneDivider({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const clamp = (next: number) => onChange(Math.max(25, Math.min(75, next)));
  return (
    <div
      className="paper-pane-divider"
      role="separator"
      tabIndex={0}
      aria-label="调整源码与 PDF 宽度"
      aria-orientation="vertical"
      aria-valuenow={Math.round(value)}
      aria-valuemin={25}
      aria-valuemax={75}
      onDoubleClick={() => onChange(50)}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.focus();
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        const bounds = event.currentTarget.parentElement!.getBoundingClientRect();
        clamp(((event.clientX - bounds.left) / bounds.width) * 100);
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          clamp(value + (event.key === 'ArrowLeft' ? -2 : 2));
        }
        if (event.key === 'Home') {
          event.preventDefault();
          onChange(50);
        }
      }}
    />
  );
}
