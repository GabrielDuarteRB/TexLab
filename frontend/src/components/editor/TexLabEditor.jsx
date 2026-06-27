import Editor from '@monaco-editor/react';
import useProjectStore from '../../store/useProjectStore.js';

export default function TexLabEditor() {
  const { currentFile, fileContents, updateFileContent, saveFile } = useProjectStore();
  const content = fileContents[currentFile] || '';

  const handleChange = (value) => {
    updateFileContent(currentFile, value);
  };

  const handleSave = () => {
    saveFile(currentFile, content);
  };

  if (!currentFile) {
    return (
      <div className="editor-empty">
        <p>Selecione um arquivo na barra lateral</p>
      </div>
    );
  }

  return (
    <Editor
      height="100%"
      language={currentFile.endsWith('.bib') ? 'bibtex' : 'latex'}
      theme="vs-dark"
      value={content}
      onChange={handleChange}
      onMount={(editor) => {
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
      }}
    />
  );
}
