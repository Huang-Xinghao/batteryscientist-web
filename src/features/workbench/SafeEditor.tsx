import { Component, type ReactNode } from 'react';
import { Alert } from 'antd';
import Editor from './Editor';
export type EditorProps = {
  value: string;
  path: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  dirty?: boolean;
  saving?: boolean;
};
class EditorBoundary extends Component<EditorProps & { children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="editor-fallback">
        <Alert
          type="warning"
          message="代码编辑器加载失败，已切换为文本编辑。修改后仍可保存或下载草稿。"
        />
        <textarea
          aria-label="文件文本编辑器"
          value={this.props.value}
          onChange={(event) => this.props.onChange(event.target.value)}
          spellCheck={false}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
              event.preventDefault();
              this.props.onSave?.();
            }
          }}
        />
      </div>
    );
  }
}
export default function SafeEditor(props: EditorProps) {
  return (
    <EditorBoundary {...props}>
      <Editor {...props} />
    </EditorBoundary>
  );
}
