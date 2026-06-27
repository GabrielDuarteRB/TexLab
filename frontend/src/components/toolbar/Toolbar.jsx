import { useState } from 'react';
import { Play, Save, Sparkles, Loader2, ChevronDown, ChevronUp, X } from 'lucide-react';
import useProjectStore from '../../store/useProjectStore.js';

export default function Toolbar({ onToggleAi, aiOpen, saveStatus }) {
  const { saveAndCompile, compile, compiling, currentProject, currentFile, fileContents, compileResult } =
    useProjectStore();
  const [showLog, setShowLog] = useState(false);

  const handleSave = () => {
    if (currentFile) {
      saveAndCompile(currentFile, fileContents[currentFile] || '');
    }
  };

  return (
    <header className="toolbar-wrapper">
      <header className="toolbar">
        <div className="toolbar-left">
          <h1 className="toolbar-title">TexLab</h1>
          {currentProject && (
            <span className="toolbar-project-name">{currentProject.name}</span>
          )}
        </div>
        <div className="toolbar-center">
          {currentProject && (
            <>
              <button className="toolbar-btn" onClick={handleSave} disabled={!currentFile}>
                <Save size={16} />
                Salvar
              </button>
              <button className="toolbar-btn primary" onClick={compile} disabled={compiling}>
                {compiling ? <Loader2 size={16} className="spin" /> : <Play size={16} />}
                Compilar
              </button>
            </>
          )}
        </div>
        <div className="toolbar-right">
          {saveStatus === 'saving' && (
            <span className="compile-status">Salvando...</span>
          )}
          {saveStatus === 'saved' && (
            <span className="compile-status success">Salvo</span>
          )}
          {currentProject && (
            <button
              className={`toolbar-btn ${aiOpen ? 'active' : ''}`}
              onClick={onToggleAi}
            >
              <Sparkles size={16} />
              IA
            </button>
          )}
          {compileResult && !compileResult.success && (
            <button
              className="compile-status error compile-toggle"
              onClick={() => setShowLog(!showLog)}
            >
              Erro na compilação
              {showLog ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          {compileResult && compileResult.success && (
            <span className="compile-status success">PDF gerado</span>
          )}
        </div>
      </header>
      {showLog && compileResult && compileResult.log && (
        <div className="compile-error-panel">
          <div className="compile-error-header">
            <span>Log de compilação</span>
            <button className="icon-btn small" onClick={() => setShowLog(false)}>
              <X size={14} />
            </button>
          </div>
          <pre className="compile-error-log">{compileResult.log}</pre>
        </div>
      )}
    </header>
  );
}
