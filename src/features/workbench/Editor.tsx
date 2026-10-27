import { useRef, useState } from 'react';
import { Button, Tooltip } from 'antd';
import { UndoOutlined, RedoOutlined } from '@ant-design/icons';
import type { EditorProps } from './SafeEditor';
import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution.js';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
monaco.languages.register({ id: 'latex' });
monaco.languages.setMonarchTokensProvider('latex', {
  tokenizer: {
    root: [
      [/%.*$/, 'comment'],
      [/\\(?:begin|end|documentclass|usepackage)\b/, 'keyword.control'],
      [
        /\\(?:section|subsection|subsubsection|chapter|title|author|caption|label|ref|cite)\b/,
        'keyword.structure',
      ],
      [/\\[a-zA-Z@]+|\\./, 'keyword'],
      [/[{}[\]]/, 'delimiter.bracket'],
      [/\$\$?|[&_^]/, 'operator'],
    ],
  },
});
monaco.editor.defineTheme('paper-latex', {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '8B8B96', fontStyle: 'italic' },
    { token: 'keyword', foreground: '3F568A' },
    { token: 'keyword.control', foreground: '9A4FAD' },
    { token: 'keyword.structure', foreground: '2869AF', fontStyle: 'bold' },
    { token: 'delimiter.bracket', foreground: 'A27335' },
    { token: 'operator', foreground: 'C56A46' },
  ],
  colors: {
    'editor.background': '#FFFFFF',
    'editor.foreground': '#303036',
    'editorLineNumber.foreground': '#B4B4BC',
    'editorLineNumber.activeForeground': '#27272A',
    'editor.lineHighlightBackground': '#F4F4F5',
    'editor.selectionBackground': '#DEDEE5',
    'editor.inactiveSelectionBackground': '#E8E8ED',
    'editorCursor.foreground': '#27272A',
    'editorIndentGuide.background1': '#E8E8ED',
    'editorBracketMatch.background': '#E4E4E7',
    'editorBracketMatch.border': '#A1A1AA',
    'editorGutter.background': '#FAFAFA',
  },
});
// Bundle the editor locally so research file contents never depend on a CDN.
self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });
export default function FileEditor({ value, path, onChange, onSave, dirty, saving }: EditorProps) {
  const instance = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const saveAction = useRef(onSave);
  saveAction.current = onSave;
  const [position, setPosition] = useState({ lineNumber: 1, column: 1 });
  function history(action: 'undo' | 'redo') {
    instance.current?.trigger('toolbar', action, null);
    instance.current?.focus();
  }
  const extension = path.split('.').pop();
  const language =
    (
      { md: 'markdown', py: 'python', tex: 'latex', bib: 'latex', json: 'json' } as Record<
        string,
        string
      >
    )[extension || ''] || 'plaintext';
  return (
    <div className="paper-code-editor">
      <div className="paper-editor-tools">
        <span className="paper-editor-language">
          {language === 'latex' ? 'LaTeX' : language.toUpperCase()}
        </span>
        <Tooltip title="撤销 (Ctrl/⌘ Z)">
          <Button
            size="small"
            type="text"
            aria-label="撤销编辑"
            icon={<UndoOutlined />}
            onClick={() => history('undo')}
          />
        </Tooltip>
        <Tooltip title="重做 (Ctrl/⌘ Shift Z)">
          <Button
            size="small"
            type="text"
            aria-label="重做编辑"
            icon={<RedoOutlined />}
            onClick={() => history('redo')}
          />
        </Tooltip>
        <span className={`paper-sync-state ${dirty ? 'is-dirty' : ''}`}>
          {saving ? '保存中…' : dirty ? '未保存' : '已同步'}
        </span>
        <span className="paper-editor-shortcut">Ctrl / ⌘ S 保存</span>
      </div>
      <div className="paper-editor-surface">
        <Editor
          onMount={(editor) => {
            instance.current = editor;
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () =>
              saveAction.current?.(),
            );
            editor.onDidChangeCursorPosition((event) => setPosition(event.position));
          }}
          theme={language === 'latex' ? 'paper-latex' : 'vs'}
          height="100%"
          language={language}
          value={value}
          onChange={(v) => onChange(v || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineHeight: 23,
            fontFamily: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace',
            lineNumbersMinChars: 3,
            glyphMargin: false,
            folding: true,
            renderLineHighlight: 'all',
            bracketPairColorization: { enabled: false },
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 16 },
            tabSize: 4,
          }}
        />
      </div>
      <div className="paper-editor-status">
        <span>{language === 'plaintext' ? '文本' : language.toUpperCase()}</span>
        <span>
          第 {position.lineNumber} 行，第 {position.column} 列
        </span>
        <span>{value.length.toLocaleString()} 字符</span>
      </div>
    </div>
  );
}
