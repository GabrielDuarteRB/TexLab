export const SLASH_COMMANDS = [
  {
    id: 'itemize',
    label: 'Lista com marcadores',
    description: 'ambiente itemize',
    kind: 'snippet',
    body: '\\begin{itemize}\n  \\item ${1:item}\n\\end{itemize}\n$0',
  },
  {
    id: 'enumerate',
    label: 'Lista numerada',
    description: 'ambiente enumerate',
    kind: 'snippet',
    body: '\\begin{enumerate}\n  \\item ${1:item}\n\\end{enumerate}\n$0',
  },
  {
    id: 'equation',
    label: 'Equação',
    description: 'ambiente equation',
    kind: 'snippet',
    body: '\\begin{equation}\n  $1\n\\end{equation}\n$0',
  },
  {
    id: 'cite',
    label: 'Citação (\\cite)',
    description: 'inserir \\cite{chave}',
    kind: 'snippet',
    body: '\\cite{${1:chave}}$0',
  },
  {
    id: 'ref',
    label: 'Referência cruzada (\\ref)',
    description: 'inserir \\ref{label}',
    kind: 'snippet',
    body: '\\ref{${1:label}}$0',
  },
  {
    id: 'table',
    label: 'Tabela',
    description: 'ambiente tabular com N colunas e M linhas',
    kind: 'form',
    form: 'table',
  },
  {
    id: 'image',
    label: 'Imagem/Figura',
    description: 'ambiente figure com \\includegraphics',
    kind: 'form',
    form: 'image',
  },
];

export function filterCommands(prefix) {
  const p = (prefix || '').toLowerCase();
  return SLASH_COMMANDS.filter((c) =>
    c.id.toLowerCase().includes(p) || c.label.toLowerCase().includes(p)
  );
}

export function findCommand(id) {
  return SLASH_COMMANDS.find((c) => c.id === id);
}

export function removeSlashPrefix(editor, monaco) {
  const position = editor.getPosition();
  const model = editor.getModel();
  if (!position || !model) return;
  const lineContent = model.getLineContent(position.lineNumber);
  const before = lineContent.substring(0, position.column - 1);
  const match = before.match(/\/([a-zA-Z]*)$/);
  if (!match) return;
  const startCol = position.column - match[0].length;
  const range = {
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: startCol,
    endColumn: position.column,
  };
  editor.executeEdits('slash-remove', [
    { range, text: '', forceMoveMarkers: true },
  ]);
  editor.setPosition({ lineNumber: position.lineNumber, column: startCol });
}

export function insertSnippet(editor, monaco, body) {
  if (!editor || !monaco) return;
  const controller = editor.getContribution('snippetController2');
  if (controller && typeof controller.insert === 'function') {
    controller.insert(body);
    return;
  }
  const position = editor.getPosition();
  const model = editor.getModel();
  if (!position || !model) return;
  editor.executeEdits('slash-snippet', [
    {
      range: { ...position, startColumn: position.column, endColumn: position.column },
      text: body,
      forceMoveMarkers: true,
    },
  ]);
}
