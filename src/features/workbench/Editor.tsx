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
const graphiteColors = {
  'editor.background': '#161920',
  'editor.foreground': '#D7DBE3',
  'editorLineNumber.foreground': '#5B6372',
  'editorLineNumber.activeForeground': '#B9AFFF',
  'editor.lineHighlightBackground': '#1C2029',
  'editor.lineHighlightBorder': '#00000000',
  'editor.selectionBackground': '#3A3370',
  'editor.inactiveSelectionBackground': '#2A2650',
  'editorCursor.foreground': '#3DE0C4',
  'editorIndentGuide.background1': '#2A303B',
  'editorBracketMatch.background': '#2A2650',
  'editorBracketMatch.border': '#8F80FF',
  'editorGutter.background': '#161920',
  'editorWidget.background': '#1C2029',
  'scrollbarSlider.background': '#3A415066',
};
// Graphite night theme for LaTeX sources.
monaco.editor.defineTheme('paper-latex', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6B7383', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'B9AFFF' },
    { token: 'keyword.control', foreground: 'F59AE8' },
    { token: 'keyword.structure', foreground: '7CC8FF', fontStyle: 'bold' },
    { token: 'delimiter.bracket', foreground: 'FFD08A' },
    { token: 'operator', foreground: '3DE0C4' },
  ],
  colors: graphiteColors,
});
// Graphite night theme for Markdown sources.
monaco.editor.defineTheme('paper-markdown', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'keyword', foreground: 'B9AFFF', fontStyle: 'bold' },
    { token: 'string.link', foreground: '7CC8FF' },
    { token: 'string', foreground: 'FFD08A' },
    { token: 'variable', foreground: '3DE0C4' },
    { token: 'comment', foreground: '6B7383' },
  ],
  colors: graphiteColors,
});
monaco.editor.defineTheme('paper-code', {
  base: 'vs-dark',
  inherit: true,
  rules: [],
  colors: graphiteColors,
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
  const extension = path.split('.').pop()?.toLowerCase();
  const language =
    (
      { md: 'markdown', py: 'python', tex: 'latex', bib: 'latex', json: 'json' } as Record<
        string,
        string
      >
    )[extension || ''] || 'plaintext';
  return (
    <div className={`paper-code-editor ${language === 'markdown' ? 'markdown-code-editor' : ''}`}>
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
            void document.fonts.load('14px "Paper Mono"').then(() => {
              monaco.editor.remeasureFonts();
            });
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () =>
              saveAction.current?.(),
            );
            editor.onDidChangeCursorPosition((event) => setPosition(event.position));
          }}
          theme={
            language === 'latex'
              ? 'paper-latex'
              : language === 'markdown'
                ? 'paper-markdown'
                : 'paper-code'
          }
          height="100%"
          language={language}
          value={value}
          onChange={(v) => onChange(v || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineHeight: language === 'markdown' ? 25 : 23,
            fontFamily:
              '"Paper Mono", Consolas, "SFMono-Regular", "Microsoft YaHei", "PingFang SC", monospace',
            fontLigatures: false,
            fontWeight: '400',
            letterSpacing: 0,
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
            padding: { top: 20, bottom: 24 },
            renderWhitespace: 'selection',
            wordWrapBreakAfterCharacters: ' \t})]?|&,;、。 ，；：？！',
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
