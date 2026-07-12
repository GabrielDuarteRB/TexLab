import { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { Sparkles, Loader2, X, Check, Copy, AlertCircle, Wand2, AlertTriangle, FileWarning, History } from 'lucide-react';
import { useAiError } from '../../hooks/useAiError.js';
import { useAi } from '../../hooks/useAi.js';
import SimpleMarkdown from './SimpleMarkdown.jsx';

const SECTION_REGEX = /^(?:\([ab]\)\s+|\*\*Causa:?\*\*\s*|\*\*Sugest(?:ão|ao):?\*\*\s*)(.*)$/i;

function highlightLatex(str) {
  if (!str) return [];
  const linhas = str.split('\n');
  const out = [];
  linhas.forEach((linha, idx) => {
    const isMarker = linha.trimStart().startsWith('>>>');
    const partes = [];
    const re = /(\\[a-zA-Z@]+|\\[^a-zA-Z])|(%.*$)|([{}\[\]$$])|(\*\*[^*]+\*\*)|(`[^`]+`)/g;
    let last = 0;
    let m;
    while ((m = re.exec(linha)) !== null) {
      if (m.index > last) partes.push({ t: linha.slice(last, m.index), c: null });
      if (m[1]) partes.push({ t: m[1], c: 'cmd' });
      else if (m[2]) partes.push({ t: m[2], c: 'comment' });
      else if (m[3]) partes.push({ t: m[3], c: 'brace' });
      else if (m[4]) partes.push({ t: m[4], c: 'bold' });
      else if (m[5]) partes.push({ t: m[5], c: 'inline' });
      last = re.lastIndex;
    }
    if (last < linha.length) partes.push({ t: linha.slice(last), c: null });
    out.push(
      <div key={idx} className={`latex-line${isMarker ? ' latex-line-marker' : ''}`}>
        {partes.length === 0 ? '\u00A0' : partes.map((p, k) => p.c ? <span key={k} className={`latex-${p.c}`}>{p.t}</span> : <span key={k}>{p.t}</span>)}
      </div>
    );
  });
  return out;
}

function extractLogTrecho(log) {
  if (!log) return '';
  const linhas = log.split('\n');
  const idx = linhas.findIndex((l) => l.startsWith('!'));
  if (idx === -1) return linhas.slice(-20).join('\n');
  const inicio = Math.max(0, idx - 3);
  const fim = Math.min(linhas.length, idx + 25);
  return linhas.slice(inicio, fim).join('\n');
}

function splitSections(texto) {
  if (!texto) return { causa: '', sugestao: '', resto: '' };
  const linhas = texto.split('\n');
  let causa = '';
  let sugestao = '';
  let resto = '';
  let bufferCausa = null;
  let bufferSugestao = null;
  let bufferResto = [];

  for (const linha of linhas) {
    const causaMatch = linha.match(/^\(?a\)?\s*\*?\*?Causa:?\*?\*?\s*(.*)$/i) || linha.match(/^\*\*Causa:?\*\*\s*(.*)$/i);
    const sugestMatch = linha.match(/^\(?b\)?\s*\*?\*?Sugest(?:ão|ao):?\*?\*?\s*(.*)$/i) || linha.match(/^\*\*Sugest(?:ão|ao):?\*\*\s*(.*)$/i);
    if (causaMatch) {
      bufferCausa = causaMatch[1] || '';
      bufferSugestao = null;
    } else if (sugestMatch) {
      bufferCausa = null;
      bufferSugestao = sugestMatch[1] || '';
    } else if (bufferCausa !== null) {
      bufferCausa += (bufferCausa ? '\n' : '') + linha;
    } else if (bufferSugestao !== null) {
      bufferSugestao += (bufferSugestao ? '\n' : '') + linha;
    } else {
      bufferResto.push(linha);
    }
  }

  return {
    causa: (bufferCausa || '').trim(),
    sugestao: (bufferSugestao || '').trim(),
    resto: bufferResto.join('\n').trim(),
  };
}

function ContestoEnviado({ log, texContexto }) {
  const trecho = useMemo(() => extractLogTrecho(log), [log]);
  return (
    <details className="compile-error-explanation-context">
      <summary>
        <History size={12} />
        <span>O que foi enviado para a IA</span>
      </summary>
      <div className="compile-error-explanation-context-content">
        <div className="compile-error-explanation-context-block">
          <div className="compile-error-explanation-context-label">Trecho do log de erro</div>
          <pre>{trecho}</pre>
        </div>
        {texContexto && (
          <div className="compile-error-explanation-context-block">
            <div className="compile-error-explanation-context-label">Trecho do .tex próximo à linha do erro</div>
            <pre>{texContexto}</pre>
          </div>
        )}
      </div>
    </details>
  );
}

export default function CompileErrorExplainer({ log, fileContents, currentFile, updateFileContent }) {
  const { academicEnabled, academicBackend } = useAi();
  const { loading, error, result, explain, clear, hash } = useAiError();
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [applyMode, setApplyMode] = useState(false);
  const [applyError, setApplyError] = useState(null);
  const [lastLog, setLastLog] = useState(log);
  const [lastHash, setLastHash] = useState(null);
  const [loadingMsg, setLoadingMsg] = useState('Enviando log para a IA...');
  const [sentContext, setSentContext] = useState({ texContexto: null, linhaErro: null });
  const popoverRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (log !== lastLog) {
      setLastLog(log);
      setExplanationOpen(false);
      setApplyMode(false);
      setApplyError(null);
      clear();
    }
  }, [log, lastLog, clear]);

  useEffect(() => {
    if (!log || !log.includes('!')) {
      setExplanationOpen(false);
      setApplyMode(false);
      setApplyError(null);
    }
  }, [log]);

  useEffect(() => {
    if (hash) setLastHash(hash);
  }, [hash]);

  useEffect(() => {
    if (!loading) {
      setLoadingMsg('Enviando log para a IA...');
      return;
    }
    const t = setTimeout(() => {
      const backendName = academicBackend || 'IA';
      setLoadingMsg(`Aguardando resposta de ${backendName}...`);
    }, 2000);
    return () => clearTimeout(t);
  }, [loading, academicBackend]);

  useEffect(() => {
    if (!explanationOpen) return;
    const onClickOutside = (e) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)
      ) {
        setExplanationOpen(false);
        setApplyMode(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setExplanationOpen(false);
        setApplyMode(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [explanationOpen]);

  const linhaAtual = useMemo(() => {
    if (!result || !result.linhaErro || !currentFile) return null;
    const texto = fileContents?.[currentFile];
    if (!texto) return null;
    const linhas = texto.split('\n');
    return linhas[result.linhaErro - 1] ?? null;
  }, [result, currentFile, fileContents]);

  const isCacheHit = useMemo(() => {
    if (!result || !lastHash) return false;
    return hash === lastHash && result && !loading;
  }, [hash, lastHash, result, loading]);

  const sections = useMemo(() => {
    if (!result) return { causa: '', sugestao: '', resto: '' };
    let texto = result.explicacao || '';
    if (result.trecho_corrigido_sugerido) {
      texto = texto.replace(/```(?:latex|tex)?\s*\n[\s\S]*?```/g, '').trim();
    }
    return splitSections(texto);
  }, [result]);

  const handleExplain = async () => {
    if (loading) return;
    setExplanationOpen(true);
    setApplyMode(false);

    let linhaErro = null;
    const match = log.match(/^l\.(\d+)/m);
    if (match) linhaErro = parseInt(match[1], 10);

    let texContexto = null;
    if (currentFile && linhaErro) {
      const texto = fileContents?.[currentFile];
      if (texto) {
        const linhas = texto.split('\n');
        const inicio = Math.max(0, linhaErro - 15);
        const fim = Math.min(linhas.length, linhaErro + 14);
        const trecho = [];
        for (let i = inicio; i < fim; i++) {
          trecho.push(i === linhaErro - 1 ? `>>> ${linhas[i]}` : `    ${linhas[i]}`);
        }
        texContexto = trecho.join('\n');
      }
    }

    setSentContext({ texContexto, linhaErro });
    await explain({ log, texContexto, linhaErro });
  };

  const handleCopy = async () => {
    if (!result?.trecho_corrigido_sugerido) return;
    try {
      await navigator.clipboard.writeText(result.trecho_corrigido_sugerido);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleApply = () => {
    if (!result?.trecho_corrigido_sugerido || !currentFile || !result?.linhaErro) return;
    if (linhaAtual === null) return;
    setApplyError(null);
    setApplyMode(true);
  };

  const handleConfirmApply = () => {
    if (!result?.trecho_corrigido_sugerido || !currentFile || !result?.linhaErro) return;
    const texto = fileContents?.[currentFile];
    if (!texto) return;
    const linhas = texto.split('\n');
    const idx = result.linhaErro - 1;
    if (idx < 0 || idx >= linhas.length) return;

    if (result.trecho_original) {
      const original = result.trecho_original;
      const replacement = result.trecho_corrigido_sugerido;
      const linha = linhas[idx];
      const pos = linha.indexOf(original);
      if (pos === -1) {
        setApplyError('O trecho original não foi encontrado na linha atual. O arquivo pode ter mudado — clique em "Reexplicar" para gerar uma nova.');
        return;
      }
      linhas[idx] = linha.slice(0, pos) + replacement + linha.slice(pos + original.length);
    } else {
      linhas[idx] = result.trecho_corrigido_sugerido;
    }

    updateFileContent(currentFile, linhas.join('\n'));
    setApplyMode(false);
    setApplyError(null);
  };

  if (!academicEnabled) {
    return (
      <span className="compile-error-explanation-hint">
        <AlertCircle size={12} /> Configure uma IA para usar "Explicar erro"
      </span>
    );
  }

  const temSecoes = sections.causa || sections.sugestao;
  const linhaMudou = result?.linhaErro && linhaAtual === null;

  return (
    <div className="compile-error-explainer">
      <button
        ref={buttonRef}
        className="compile-error-explain-btn"
        onClick={handleExplain}
        disabled={loading}
        title="Pedir à IA uma explicação do erro em PT-BR"
      >
        {loading ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />}
        {loading ? 'Explicando...' : 'Explicar erro'}
      </button>
      {explanationOpen && (
        <div ref={popoverRef} className="compile-error-explanation-popover" role="dialog" aria-label="Explicação do erro de compilação">
          <div className="compile-error-explanation-header">
            <div className="compile-error-explanation-header-left">
              <Sparkles size={14} className="compile-error-explanation-header-icon" />
              <span>Explicação da IA</span>
              {isCacheHit && <span className="compile-error-explanation-cache-badge">do cache</span>}
            </div>
            <button
              className="icon-btn small"
              onClick={() => { setExplanationOpen(false); setApplyMode(false); }}
              title="Fechar (Esc)"
              aria-label="Fechar"
            >
              <X size={14} />
            </button>
          </div>
          <div className="compile-error-explanation-body">
            {loading && (
              <div className="compile-error-explanation-loading">
                <Loader2 size={18} className="spin" />
                <span>{loadingMsg}</span>
              </div>
            )}

            {error && !loading && (
              <div className="compile-error-explanation-error">
                <AlertCircle size={16} />
                <div>
                  <p>{error}</p>
                  <button className="link-btn" onClick={handleExplain}>Tentar de novo</button>
                </div>
              </div>
            )}

            {result && !loading && (
              <>
                {result.backend_usado && (
                  <div className="compile-error-explanation-meta">
                    <span>Backend: <strong>{result.backend_usado}</strong></span>
                    {result.linhaErro && <span>· linha {result.linhaErro}</span>}
                    {result.arquivoErro && result.arquivoErro !== currentFile && (
                      <span>· arquivo {result.arquivoErro}</span>
                    )}
                  </div>
                )}

                {linhaMudou && (
                  <div className="compile-error-explanation-warning">
                    <FileWarning size={14} />
                    <span>
                      A linha {result.linhaErro} do arquivo mudou desde a explicação. Clique em "Reexplicar" para gerar uma nova.
                    </span>
                    <button className="link-btn" onClick={handleExplain}>Reexplicar</button>
                  </div>
                )}

                {result.trecho_corrigido_sugerido && (
                  <div className="compile-error-explanation-code">
                    <div className="compile-error-explanation-code-header">
                      <span>Trecho sugerido</span>
                      <div className="compile-error-explanation-code-actions">
                        <button className="icon-btn small" onClick={handleCopy} title="Copiar trecho" aria-label="Copiar">
                          {copied ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                        {!applyMode && (
                          <button
                            className="compile-error-explanation-apply-btn"
                            onClick={handleApply}
                            disabled={!currentFile || !result.linhaErro || linhaAtual === null}
                            title={
                              !currentFile
                                ? 'Nenhum arquivo aberto'
                                : linhaAtual === null
                                  ? 'A linha mudou desde a explicação'
                                  : `Substituir a linha ${result.linhaErro} pelo trecho sugerido`
                            }
                          >
                            <Wand2 size={12} /> Aplicar
                          </button>
                        )}
                      </div>
                    </div>
                    {applyMode ? (
                      <div className="compile-error-explanation-diff">
                        {result.trecho_original ? (
                          (() => {
                            const original = result.trecho_original;
                            const replacement = result.trecho_corrigido_sugerido;
                            const linha = linhaAtual || '';
                            const found = linha.indexOf(original) !== -1;
                            const parts = found ? linha.split(original) : [linha];
                            return (
                              <>
                                <div className="compile-error-explanation-diff-label">
                                  Como ficará a linha {result.linhaErro} (vermelho = removido, verde = adicionado)
                                </div>
                                <pre className="compile-error-explanation-diff-inline">
                                  {parts.map((part, i, arr) => (
                                    <Fragment key={i}>
                                      {part}
                                      {i < arr.length - 1 && (
                                        <>
                                          <span className="diff-removed-inline">{original}</span>
                                          <span className="diff-added-inline">{replacement}</span>
                                        </>
                                      )}
                                    </Fragment>
                                  ))}
                                </pre>
                              </>
                            );
                          })()
                        ) : (
                          <>
                            <div className="compile-error-explanation-diff-warning">
                              <AlertTriangle size={14} />
                              <span>A IA não retornou o trecho exato a substituir. A linha INTEIRA será substituída. Verifique o resultado.</span>
                            </div>
                            <div className="compile-error-explanation-diff-col">
                              <div className="compile-error-explanation-diff-label">Linha {result.linhaErro} (atual)</div>
                              <pre className="diff-removed">{linhaAtual || '(vazia)'}</pre>
                            </div>
                            <div className="compile-error-explanation-diff-col">
                              <div className="compile-error-explanation-diff-label">Substituir por</div>
                              <pre className="diff-added">{result.trecho_corrigido_sugerido}</pre>
                            </div>
                          </>
                        )}
                        {applyError && (
                          <div className="compile-error-explanation-warning">
                            <FileWarning size={14} />
                            <span>{applyError}</span>
                          </div>
                        )}
                        <div className="compile-error-explanation-diff-actions">
                          <button
                            className="compile-error-explanation-apply-btn"
                            onClick={() => { setApplyMode(false); setApplyError(null); }}
                          >
                            Cancelar
                          </button>
                          <button
                            className="compile-error-explanation-confirm-btn"
                            onClick={handleConfirmApply}
                            disabled={!!applyError}
                          >
                            <Check size={12} /> Confirmar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="compile-error-explanation-latex">
                        {highlightLatex(result.trecho_corrigido_sugerido)}
                      </div>
                    )}
                  </div>
                )}

                {temSecoes ? (
                  <div className="compile-error-explanation-sections">
                    {sections.causa && (
                      <div className="compile-error-explanation-section section-causa">
                        <div className="compile-error-explanation-section-header">
                          <AlertTriangle size={14} />
                          <strong>Causa</strong>
                        </div>
                        <SimpleMarkdown text={sections.causa} />
                      </div>
                    )}
                    {sections.sugestao && (
                      <div className="compile-error-explanation-section section-sugestao">
                        <div className="compile-error-explanation-section-header">
                          <Wand2 size={14} />
                          <strong>Sugestão</strong>
                        </div>
                        <SimpleMarkdown text={sections.sugestao} />
                      </div>
                    )}
                    {sections.resto && (
                      <div className="compile-error-explanation-section section-resto">
                        <SimpleMarkdown text={sections.resto} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="compile-error-explanation-text">
                    <SimpleMarkdown text={sections.resto} />
                  </div>
                )}

                <ContestoEnviado log={log} texContexto={sentContext.texContexto} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
