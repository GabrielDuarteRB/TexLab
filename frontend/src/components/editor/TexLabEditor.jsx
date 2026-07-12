import { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Loader2, SpellCheck, SpellCheck2 } from 'lucide-react';
import useProjectStore from '../../store/useProjectStore.js';
import { useRealtimeSpellCheck } from '../../hooks/useRealtimeSpellCheck.js';

/**
 * Converte índice de caractere → { line, column } (1-indexed) para o Monaco.
 * Os offsets do backend são índices de caractere UTF-16 (compatíveis com String.slice).
 */
function offsetToLineCol(text, offset) {
  let line = 1;
  let col = 1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text.charCodeAt(i) === 0x0a) { // \n
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  return { line, column: col };
}

/**
 * Converte markers do formato do projeto para o formato Monaco.
 * Projeto: { startOffset, endOffset, message, suggestions, severity }
 * Monaco: { severity, message, startLineNumber, startColumn, endLineNumber, endColumn }
 */
function toMonacoMarkers(markers, text) {
  if (!markers || markers.length === 0) return [];
  return markers.map((m) => {
    const start = offsetToLineCol(text, m.startOffset);
    const end = offsetToLineCol(text, m.endOffset);
    // Mapeia severidade textual (ou numérica LSP) → Monaco MarkerSeverity
    let severity = 4; // Warning default (gramática/estilo)
    if (m.severity === 'error' || m.severity === 1) severity = 8; // Error
    else if (m.severity === 'info' || m.severity === 'hint' || m.severity === 2 || m.severity === 4) {
      severity = 2; // Info
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
  const {
    currentFile, fileContents, updateFileContent, saveFile, editorMarkers,
    realtimeCheckEnabled, ltexStatus, spellChecking,
  } = useProjectStore();
  const content = fileContents[currentFile] || '';

  useRealtimeSpellCheck({ currentFile, content, enabled: realtimeCheckEnabled });

  const handleChange = (value) => {
    updateFileContent(currentFile, value);
  };

  const handleSave = () => {
    saveFile(currentFile, content);
  };

  // Atualiza markers no Monaco sempre que editorMarkers ou content mudar
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !currentFile) return;

    const model = editor.getModel();
    if (!model) return;

    const markers = toMonacoMarkers(editorMarkers, content);
    monaco.editor.setModelMarkers(model, 'ltex', markers);
  }, [editorMarkers, content, currentFile]);

  // Registra CodeActionProvider para lightbulb (💡) com sugestões
  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;

    const registration = monaco.languages.registerCodeActionProvider('latex', {
      provideCodeActions: (model, range, context) => {
        const markersAtRange = context.markers.filter(
          (m) => m.source === 'ltex' && m.tags?.includes(1)
        );

        if (markersAtRange.length === 0) return { actions: [], dispose: () => {} };

        const actions = [];
        for (const marker of markersAtRange) {
          // Extrai sugestões da mensagem do marker (formato: "msg | sug1, sug2, sug3")
          const parts = marker.message.split('|||');
          const baseMessage = parts[0]?.trim() || marker.message;
          const suggestions = parts[1]?.split(',').map(s => s.trim()).filter(Boolean) || [];

          for (const suggestion of suggestions) {
            actions.push({
              title: `Aplicar: "${suggestion}"`,
              kind: 'quickfix',
              diagnostics: [marker],
              edit: {
                edits: [{
                  resource: model.uri,
                  textEdit: {
                    range: marker.range,
                    text: suggestion,
                  },
                  versionId: model.getAlternativeVersionId(),
                }],
              },
              isPreferred: true,
            });
          }
        }

        return { actions, dispose: () => {} };
      },
    });

    return () => registration.dispose();
  }, [currentFile]);

  if (!currentFile) {
    return (
      <div className="editor-empty">
        <p>Selecione um arquivo na barra lateral</p>
      </div>
    );
  }

  const ltexUnavailable = ltexStatus && ltexStatus.disponivel === false;

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

          editor.addCommand(0, 'ctrl+s', handleSave);
          editor.addCommand(0, 'cmd+s', handleSave);
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
    </div>
  );
}
