import { useState } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { useAi } from '../../hooks/useAi.js';
import useProjectStore from '../../store/useProjectStore.js';

export default function AiPanel({ onClose }) {
  const { enabled, loading, result, suggest } = useAi();
  const { currentFile, fileContents } = useProjectStore();
  const [instruction, setInstruction] = useState('');

  const handleSuggest = async () => {
    if (!instruction.trim() || !currentFile) return;
    const content = fileContents[currentFile] || '';
    await suggest(content, instruction);
  };

  return (
    <aside className="ai-panel">
      <div className="ai-panel-header">
        <h3>Assistente IA</h3>
        <button className="icon-btn" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      {!enabled ? (
        <div className="ai-disabled">
          <p>IA não configurada.</p>
          <p className="ai-hint">
            Adicione <code>AI_API_KEY</code> no arquivo <code>.env</code> para habilitar.
          </p>
        </div>
      ) : (
        <>
          <div className="ai-input">
            <textarea
              placeholder="Ex: Corrija os erros de formatação nesta seção..."
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSuggest();
                }
              }}
              rows={3}
            />
            <button className="toolbar-btn primary" onClick={handleSuggest} disabled={loading || !currentFile}>
              {loading ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
              Enviar
            </button>
          </div>

          {result && (
            <div className={`ai-result ${result.success ? 'success' : 'error'}`}>
              {result.success ? (
                <pre>{result.suggestion}</pre>
              ) : (
                <p>{result.error}</p>
              )}
            </div>
          )}
        </>
      )}
    </aside>
  );
}
