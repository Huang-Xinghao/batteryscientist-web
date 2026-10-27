// Adapted from StoraGent MessageBubble.vue (MIT); license: src/shared/file-preview/STORAGENT-LICENSE.txt.
import { useEffect, useRef, useState } from 'react';
import { App, Button, Tooltip } from 'antd';
import { CheckOutlined, CopyOutlined, EditOutlined } from '@ant-design/icons';

export function MessageActions({ content, onReuse }: { content: string; onReuse?: () => void }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { message } = App.useApp();
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copy() {
    try {
      if (!navigator.clipboard) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(content);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      message.error('复制失败，请选中文字后复制');
    }
  }
  return (
    <div className="message-actions">
      <Tooltip title={copied ? '已复制' : '复制消息'}>
        <Button
          type="text"
          size="small"
          aria-label={copied ? '消息已复制' : '复制消息'}
          icon={copied ? <CheckOutlined /> : <CopyOutlined />}
          onClick={() => void copy()}
        />
      </Tooltip>
      {onReuse && (
        <Tooltip title="放回输入框修改">
          <Button
            type="text"
            size="small"
            aria-label="修改这条指令"
            icon={<EditOutlined />}
            onClick={onReuse}
          />
        </Tooltip>
      )}
    </div>
  );
}
