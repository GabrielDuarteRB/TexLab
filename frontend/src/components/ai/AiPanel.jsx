import { useState, useEffect } from 'react';
import { X, Send, Loader2, Sparkles, FileText, Repeat, RefreshCw, Check, Copy, AlertCircle, Wand2 } from 'lucide-react';
import { useAi } from '../../hooks/useAi.js';
import useProjectStore from '../../store/useProjectStore.js';

const TABS = [
  { id: 'review', label: 'Revisar', icon: FileText },
  { id: 'repetition', label: 'Repetição', icon: Repeat },
  { id: 'suggest', label: 'Sugerir', icon: Sparkles },
];

export default function AiPanel({ onClose }) {
  const { enabled, loading, result, suggest, academicEnabled, academicBackend, academicLoading, academicResult, review } = useAi();
  const { currentFile, fileContents, saveFile, updateFileContent, setEditorMarkers, clearEditorMarkers, realtimeCheckEnabled, setRealtimeCheckEnabled, ltexStatus } = useProjectStore();
  const [activeTab, setActiveTab] = useState('review');
  const [instruction, setInstruction] = useState('');
  const [idioma, setIdioma] = useState('pt');
  const [backendOpcao, setBackendOpcao] = useState('auto');
  const [copied, setCopied] = useState(false);

  const content = currentFile ? (fileContents[currentFile] || '') : '';

  const handleSuggest = async () => {
    if (!instruction.trim() || !currentFile) return;
    await suggest(content, instruction);
  };

  const handleReview = async () => {
    if (!content.trim()) return;
    clearEditorMarkers();
    await review(content, idioma, backendOpcao);
  };

  // Converte correções do ltex em markers do Monaco após cada revisão
  useEffect(() => {
    if (!academicResult || academicResult.error) {
      clearEditorMarkers();
      return;
    }

    const correcoes = academicResult.correcoes || [];
    if (correcoes.length === 0) {
      clearEditorMarkers();
      return;
    }

    // Filtra apenas correções do ltex que têm offset
    const markers = correcoes
      .filter((c) => c.offset !== undefined && c.startOffset === undefined)
      .map((c) => ({
        startOffset: c.offset,
        endOffset: c.offset + (c.original ? c.original.length : 0),
        message: c.mensagem || c.explicacao || '',
        suggestions: c.sugestoes || [],
        severity: 'warning',
      }));

    // Também inclui correções que já têm startOffset (formato ltex direto)
    const directMarkers = correcoes
      .filter((c) => c.startOffset !== undefined)
      .map((c) => ({
        startOffset: c.startOffset,
        endOffset: c.endOffset,
        message: `${c.message || c.mensagem || c.explicacao || ''}${(c.suggestions || c.sugestoes || []).length > 0 ? '|||' + (c.suggestions || c.sugestoes).join(', ') : ''}`,
        suggestions: c.suggestions || c.sugestoes || [],
        severity: 'warning',
      }));

    setEditorMarkers([...directMarkers, ...markers]);
  }, [academicResult]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Aplica uma sugestão substituindo o trecho no conteúdo do arquivo
  // Os offsets são índices de caractere (UTF-16), compatíveis com String.slice()
  const applySuggestion = (correcao, sugestao) => {
    if (!content) return;

    const startOffset = correcao.startOffset ?? correcao.offset ?? 0;
    const endOffset = correcao.endOffset ?? (startOffset + (correcao.original || '').length);

    const newText = content.slice(0, startOffset) + sugestao + content.slice(endOffset);
    updateFileContent(currentFile, newText);
  };

  const renderTab = (tabId) => {
    switch (tabId) {
      case 'review':
        return renderReviewTab();
      case 'repetition':
        return renderRepetitionTab();
      case 'suggest':
        return renderSuggestTab();
      default:
        return null;
    }
  };

  const renderReviewTab = () => (
    <div className="ai-tab-content">
      <label className="ai-toggle-row">
        <input
          type="checkbox"
          checked={realtimeCheckEnabled}
          onChange={(e) => setRealtimeCheckEnabled(e.target.checked)}
        />
        <span>Checagem ortográfica em tempo real</span>
        {ltexStatus && ltexStatus.disponivel === false && (
          <span className="ai-toggle-warn">(ltex indisponível)</span>
        )}
      </label>
      <div className="ai-settings-row">
        <div className="ai-idioma-selector">
          <label>Idioma:</label>
          <select value={idioma} onChange={(e) => setIdioma(e.target.value)}>
            <option value="pt">Português</option>
            <option value="en">Inglês</option>
          </select>
        </div>
        <div className="ai-backend-selector">
          <label>Backend:</label>
          <select value={backendOpcao} onChange={(e) => setBackendOpcao(e.target.value)}>
            <option value="auto">Automático</option>
            <option value="ollama">Ollama (local)</option>
            <option value="groq">Groq (cloud)</option>
          </select>
        </div>
      </div>

      {!academicEnabled ? (
        <div className="ai-disabled">
          <AlertCircle size={20} />
          <p>Nenhum backend de IA disponível.</p>
          <p className="ai-hint">
            Instale <a href="https://ollama.com" target="_blank" rel="noopener">Ollama</a> ou
            configure <code>GROQ_API_KEY</code> no <code>.env</code>.
          </p>
        </div>
      ) : (
        <>
          <div className="ai-review-actions">
            <button
              className="toolbar-btn primary ai-review-btn"
              onClick={handleReview}
              disabled={academicLoading || !content}
            >
              {academicLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              Revisar Texto Completo
            </button>
          </div>

          {academicLoading && (
            <div className="ai-loading">
              <Loader2 size={20} className="spin" />
              <span>Revisando texto... ({academicResult?.total_chunks || '?'} chunks)</span>
            </div>
          )}

          {academicResult && !academicLoading && renderReviewResults()}
        </>
      )}
    </div>
  );

  const renderReviewResults = () => {
    if (academicResult.error) {
      return <div className="ai-result error"><p>Erro: {academicResult.error}</p></div>;
    }

    const correcoes = academicResult.correcoes || [];
    const palavras = academicResult.palavras_repetidas || [];
    const variacoes = academicResult.variacoes || [];
    const sugestoes = academicResult.sugestoes_melhoria || [];

    return (
      <div className="ai-review-results">
        <div className="ai-result success">
          <div className="ai-result-header">
            <Check size={16} />
            <span>Revisão concluída</span>
          </div>
          <div className="ai-result-stats">
            <span>{correcoes.length} correções</span>
            <span>{palavras.length} palavras repetidas</span>
            <span>{variacoes.length} variações</span>
          </div>
        </div>

        {correcoes.length > 0 && (
          <div className="ai-section">
            <h4>Correções ({correcoes.length})</h4>
            <div className="ai-corrections-list">
              {correcoes.map((correcao, i) => (
                <div key={i} className="ai-correction-item">
                  <div className="ai-correction-diff">
                    <span className="ai-diff-removed">{correcao.original || ''}</span>
                    <span className="ai-diff-arrow">→</span>
                    <span className="ai-diff-added">{correcao.corrigido || ''}</span>
                  </div>
                  <div className="ai-correction-explanation">
                    <span className="ai-correction-icon">💡</span>
                    {correcao.explicacao || correcao.mensagem || ''}
                  </div>
                  {(correcao.sugestoes || correcao.suggestions || []).length > 0 && (
                    <div className="ai-suggestion-chips">
                      {(correcao.sugestoes || correcao.suggestions || []).map((sug, j) => (
                        <button
                          key={j}
                          className="ai-suggestion-chip"
                          onClick={() => applySuggestion(correcao, sug)}
                        >
                          <Wand2 size={11} />
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {palavras.length > 0 && (
          <div className="ai-section">
            <h4>Palavras Repetidas ({palavras.length})</h4>
            <div className="ai-repetition-list">
              {palavras.slice(0, 10).map((r, i) => (
                <div key={i} className="ai-repetition-item">
                  <span className="ai-word">{r.palavra}</span>
                  <span className="ai-count">{r.ocorrencias}x</span>
                  <span className="ai-synonyms">{r.sugestoes.slice(0, 4).join(', ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {variacoes.length > 0 && (
          <div className="ai-section">
            <h4>Variações de Reescrita</h4>
            {variacoes.slice(0, 3).map((v, i) => (
              <div key={i} className="ai-variation">
                <span className="ai-variation-num">{i + 1}.</span>
                <p>{v}</p>
              </div>
            ))}
          </div>
        )}

        {sugestoes.length > 0 && (
          <div className="ai-section">
            <h4>Sugestões de Melhoria</h4>
            <ul className="ai-suggestions-list">
              {sugestoes.slice(0, 5).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderRepetitionTab = () => {
    if (!academicResult || academicResult.error) {
      return (
        <div className="ai-tab-content">
          <p className="ai-hint">Faça uma revisão primeiro (aba "Revisar") para ver palavras repetidas.</p>
          <button
            className="toolbar-btn primary ai-review-btn"
            onClick={handleReview}
            disabled={academicLoading || !content}
          >
            {academicLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
            Revisar Agora
          </button>
        </div>
      );
    }

    const palavras = academicResult.palavras_repetidas || [];
    if (palavras.length === 0) {
      return (
        <div className="ai-tab-content">
          <p>Nenhuma palavra com repetição significativa encontrada.</p>
        </div>
      );
    }

    return (
      <div className="ai-tab-content">
        <h4>Palavras Repetidas ({palavras.length})</h4>
        <div className="ai-repetition-list full">
          {palavras.map((r, i) => (
            <div key={i} className="ai-repetition-item">
              <div className="ai-word-info">
                <span className="ai-word">{r.palavra}</span>
              </div>
              <div className="ai-word-details">
                <span className="ai-count">{r.ocorrencias} ocorrências</span>
                <span className="ai-paragrafos">§{r.paragrafos.join(', §')}</span>
              </div>
              <div className="ai-synonyms">
                <strong>Sugestões:</strong> {r.sugestoes.join(', ')}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSuggestTab = () => (
    <div className="ai-tab-content">
      {!enabled ? (
        <div className="ai-disabled">
          <AlertCircle size={20} />
          <p>Assistente IA não configurado.</p>
          <p className="ai-hint">
            Adicione <code>AI_API_KEY</code> no <code>.env</code> para usar OpenAI ou Anthropic.
          </p>
        </div>
      ) : (
        <>
          <div className="ai-input">
            <textarea
              placeholder="Ex: Reescreva esta seção em tom mais formal..."
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
            <button
              className="toolbar-btn primary"
              onClick={handleSuggest}
              disabled={loading || !currentFile || !instruction.trim()}
            >
              {loading ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
              Enviar
            </button>
          </div>

          {result && (
            <div className={`ai-result ${result.success ? 'success' : 'error'}`}>
              {result.success ? (
                <pre className="ai-pre">{result.suggestion}</pre>
              ) : (
                <p>{result.error}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <aside className="ai-panel">
      <div className="ai-panel-header">
        <h3>
          <Sparkles size={16} />
          Assistente Acadêmico
        </h3>
        <button className="icon-btn" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div className="ai-tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`ai-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="ai-panel-body">
        {renderTab(activeTab)}
      </div>
    </aside>
  );
}
