import { Segmented, Tooltip } from 'antd';
import { AuditOutlined, ThunderboltOutlined } from '@ant-design/icons';
import './mode-switch.css';

export type CollaborationMode = 'expert' | 'auto';

const modeHints: Record<CollaborationMode, string> = {
  expert: '专家模式：每个阶段完成后停下来，等你审阅确认再继续',
  auto: '全自动：主控自己验收并推进，只在需要你决定时提问',
};

/** Expert / automatic collaboration switch; each mode has its own color so the choice reads at a glance. */
export function ModeSwitch({
  value,
  onChange,
  disabled,
  disabledReason,
  size,
  ariaLabel = '协作方式',
}: {
  value: CollaborationMode;
  onChange: (mode: CollaborationMode) => void;
  disabled?: boolean;
  disabledReason?: string;
  size?: 'small' | 'middle';
  ariaLabel?: string;
}) {
  const control = (
    <Segmented
      className={`mode-switch is-${value}`}
      aria-label={ariaLabel}
      size={size}
      value={value}
      disabled={disabled}
      onChange={(next) => onChange(next as CollaborationMode)}
      options={[
        {
          value: 'expert',
          label: (
            <span className="mode-switch-option" title={modeHints.expert}>
              <AuditOutlined aria-hidden="true" />
              专家模式
            </span>
          ),
        },
        {
          value: 'auto',
          label: (
            <span className="mode-switch-option" title={modeHints.auto}>
              <ThunderboltOutlined aria-hidden="true" />
              全自动
            </span>
          ),
        },
      ]}
    />
  );
  return disabled && disabledReason ? (
    <Tooltip title={disabledReason}>
      <span className="mode-switch-wrap">{control}</span>
    </Tooltip>
  ) : (
    control
  );
}
