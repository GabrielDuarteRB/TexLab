import { useRef, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Loader2, SpellCheck, SpellCheck2 } from 'lucide-react';
import useProjectStore from '../../store/useProjectStore.js';
import { useRealtimeSpellCheck } from '../../hooks/useRealtimeSpellCheck.js';
import {
  filterCommands,
  findCommand,
  removeSlashPrefix,
  insertSnippet,
} from './slashCommands.js';
import SlashCommandForm from './SlashCommandForm.jsx';
import TableForm from './TableForm.jsx';
import ImageForm from './ImageForm.jsx';
import { registerLatexLanguage } from './latexLanguage.js';

function offsetToLineCol(text, offset) {
  let line = 1;
  let col = 1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text.charCodeAt(i) === 0x0a) {
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  return { line, column: col };
}

function toMonacoMarkers(markers, text) {
  if (!markers || markers.length === 0) return [];
  return markers.map((m) => {
    const start = offsetToLineCol(text, m.startOffset);
    const end = offsetToLineCol(text, m.endOffset);
    let severity = 4;
    if (m.severity === 'error' || m.severity === 1) severity = 8;
    else if (m.severity === 'info' || m.severity === 'hint' || m.severity === 2 || m.severity === 4) {
      severity = 2;
    }
    return {
      severity,
      message: m.message,
      startLineNumber: start.line,
      startColumn: start.column,
      endLineNumber: end.line,
      endColumn: end.column,
      source: 'ltex',
      tags: m.suggestions?.length > 0 ? [1] : [],
    };
  });
}

export default function TexLabEditor() {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const completionRegistrationRef = useRef(null);
  const slashActionRef = useRef(null);
  const slashShortcutCmdRef = useRef(null);
  const {
    currentFile, fileContents, updateFileContent, saveAndCompile, editorMarkers,
    realtimeCheckEnabled, ltexStatus, spellChecking,
  } = useProjectStore();
  const content = fileContents[currentFile] || '';
  const [activeForm, setActiveForm] = useState(null);

  useRealtimeSpellCheck({ currentFile, content, enabled: realtimeCheckEnabled });

  const handleChange = (value) => {
    updateFileContent(currentFile, value);
  };

  const handleSave = () => {
    const { currentFile: file, saveAndCompile: save } = useProjectStore.getState();
    const editor = editorRef.current;
    const value = editor ? editor.getValue() : '';
    if (!file) return;
    save(file, value);
  };

  const handleSnippetInsert = (body) => {
    insertSnippet(editorRef.current, monacoRef.current, body);
    setActiveForm(null);
  };

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !currentFile) return;

    const model = editor.getModel();
    if (!model) return;

    const markers = toMonacoMarkers(editorMarkers, content);
    monaco.editor.setModelMarkers(model, 'ltex', markers);
  }, [editorMarkers, content, currentFile]);

  useEffect(() => {
    return () => {
      completionRegistrationRef.current?.dispose?.();
      slashActionRef.current?.dispose?.();
      slashShortcutCmdRef.current?.dispose?.();
    };
  }, []);

  if (!currentFile) {
    return (
      <div className="editor-empty">
        <p>Selecione um arquivo na barra lateral</p>
      </div>
    );
  }

  const ltexUnavailable = ltexStatus && ltexStatus.disponivel === false;

  const handleCloseForm = () => setActiveForm(null);

  return (
    <div className="editor-wrapper">
      <Editor
        height="100%"
        language={currentFile.endsWith('.bib') ? 'bibtex' : 'latex'}
        theme="vs-dark"
        value={content}
        onChange={handleChange}
        onMount={(editor, monaco) => {
          editorRef.current = editor;
          monacoRef.current = monaco;

          registerLatexLanguage(monaco);

          const model = editor.getModel();
          if (model && model.getLanguageId() !== 'latex') {
            monaco.editor.setModelLanguage(model, 'latex');
          }

          completionRegistrationRef.current = monaco.languages.registerCompletionItemProvider('latex', {
            triggerCharacters: ['/'],
            provideCompletionItems: (model, position) => {
              const lineText = model.getLineContent(position.lineNumber);
              const before = lineText.substring(0, position.column - 1);
              const match = before.match(/\/([a-zA-Z]*)$/);
              if (!match) return { suggestions: [] };

              const prefix = match[1];
              const startCol = position.column - match[0].length;
              const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: startCol,
                endColumn: position.column,
              };
              const filtered = filterCommands(prefix);
              return {
                suggestions: filtered.map((cmd) => ({
                  label: `/${cmd.id}`,
                  kind: monaco.languages.CompletionItemKind.Snippet,
                  insertText: cmd.kind === 'snippet' ? cmd.body : '',
                  insertTextRules: cmd.kind === 'snippet'
                    ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
                    : monaco.languages.CompletionItemInsertTextRule.None,
                  detail: cmd.label,
                  documentation: cmd.description,
                  range,
                  command: cmd.kind === 'form' ? {
                    id: 'texlab.openSlashForm',
                    title: 'Open Slash Form',
                    arguments: [cmd.id],
                  } : undefined,
                })),
              };
            },
            resolveCompletionItem: (item) => item,
          });

          slashActionRef.current = monaco.editor.registerCommand('texlab.openSlashForm', (_accessor, formId) => {
            const cmd = findCommand(formId);
            if (!cmd || cmd.kind !== 'form') return;
            removeSlashPrefix(editor, monaco);
            setActiveForm({ kind: formId });
          });

          editor.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
            handleSave
          );

          const handleSlashShortcut = () => {
            const position = editor.getPosition();
            const model = editor.getModel();
            if (!position || !model) return;
            const lineText = model.getLineContent(position.lineNumber);
            const before = lineText.substring(0, position.column - 1);
            if (before.match(/\/([a-zA-Z]*)$/)) {
              editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
              return;
            }
            editor.executeEdits('slash-insert', [{
              range: { ...position, startColumn: position.column, endColumn: position.column },
              text: '/',
              forceMoveMarkers: true,
            }]);
            editor.setPosition({ ...position, column: position.column + 1 });
            setTimeout(() => editor.trigger('keyboard', 'editor.action.triggerSuggest', {}), 0);
          };
          slashShortcutCmdRef.current = editor.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash,
            handleSlashShortcut
          );
        }}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          wordWrap: 'on',
          automaticLayout: true,
          scrollBeyondLastLine: false,
          renderWhitespace: 'selection',
          quickSuggestions: true,
          lightbulb: { enabled: 1 },
          fixedOverflowWidgets: true,
        }}
      />
      {realtimeCheckEnabled && /\.(tex|bib)$/i.test(currentFile) && (
        <div className="editor-spellcheck-indicator" title={
          ltexUnavailable
            ? 'Checagem ortográfica indisponível'
            : spellChecking
              ? 'Verificando ortografia...'
              : 'Checagem ortográfica em tempo real ativa'
        }>
          {spellChecking ? (
            <Loader2 size={12} className="spin" />
          ) : ltexUnavailable ? (
            <SpellCheck2 size={12} />
          ) : (
            <SpellCheck size={12} />
          )}
          <span>
            {ltexUnavailable
              ? 'ltex indisponível'
              : spellChecking
                ? 'Verificando...'
                : 'Verificação ortográfica'}
          </span>
        </div>
      )}

      <SlashCommandForm
        open={activeForm?.kind === 'table'}
        title="Inserir Tabela"
        onClose={handleCloseForm}
      >
        <TableForm
          onConfirm={handleSnippetInsert}
          onCancel={handleCloseForm}
        />
      </SlashCommandForm>

      <SlashCommandForm
        open={activeForm?.kind === 'image'}
        title="Inserir Imagem/Figura"
        onClose={handleCloseForm}
        width={600}
      >
        <ImageForm
          editor={editorRef.current}
          monaco={monacoRef.current}
          insertSnippet={(editor, monaco, body) => {
            insertSnippet(editor, monaco, body);
            setActiveForm(null);
          }}
          onCancel={handleCloseForm}
          onInserted={handleCloseForm}
        />
      </SlashCommandForm>
    </div>
  );
}
