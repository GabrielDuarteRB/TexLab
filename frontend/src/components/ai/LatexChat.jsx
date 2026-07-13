import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, AlertCircle, FileText, Trash2, RefreshCw, Copy, Check, MessageCircle } from 'lucide-react';
import { useAi } from '../../hooks/useAi.js';
import { useLatexChat } from '../../hooks/useLatexChat.js';
import SimpleMarkdown from './SimpleMarkdown.jsx';

function CodeBlockWithCopy({ texto, linguagem }) {
  const [copied, setCopied] = useState(false);
  const lang = linguagem || 'latex';
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <pre className="latex-chat-code">
      <button
        className="latex-chat-code-copy icon-btn small"
        onClick={handleCopy}
        title="Copiar código"
        aria-label="Copiar código"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
      <code className={`language-${lang}`}>{texto}</code>
    </pre>
  );
}

function AssistantMessage({ texto, backend }) {
  const parts = [];
  const re = /```(?:latex|tex)?\n?([\s\S]*?)```/g;
  let last = 0;
  let m;
  let key = 0;
  while ((m = re.exec(texto)) !== null) {
    if (m.index > last) parts.push({ type: 'text', content: texto.slice(last, m.index) });
    parts.push({ type: 'code', content: m[1].trim() });
    last = re.lastIndex;
  }
  if (last < texto.length) parts.push({ type: 'text', content: texto.slice(last) });

  return (
    <div className="latex-chat-msg-bubble latex-chat-msg-bubble-assistant">
      {parts.map((p, i) =>
        p.type === 'code'
          ? <CodeBlockWithCopy key={i} texto={p.content} />
          : <div key={i} className="latex-chat-msg-text"><SimpleMarkdown text={p.content} /></div>
      )}
      {backend && (
        <div className="latex-chat-msg-meta">via {backend}</div>
      )}
    </div>
  );
}

export default function LatexChat() {
  const { academicEnabled } = useAi();
  const {
    messages, loading, error, includeContext, setIncludeContext,
    sendMessage, retryLast, clearMessages,
  } = useLatexChat();
  const [pergunta, setPergunta] = useState('');
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  if (!academicEnabled) {
    return (
      <div className="latex-chat">
        <div className="latex-chat-disabled">
          <AlertCircle size={20} />
          <p>Chat LaTeX indisponível.</p>
          <p className="ai-hint">
            Instale <a href="https://ollama.com" target="_blank" rel="noopener">Ollama</a> ou
            configure <code>GROQ_API_KEY</code> no <code>.env</code>.
          </p>
        </div>
      </div>
    );
  }

  const handleSend = () => {
    if (!pergunta.trim() || loading) return;
    const texto = pergunta;
    setPergunta('');
    sendMessage(texto);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="latex-chat">
      <div className="latex-chat-toggle-row">
        <label className="latex-chat-toggle">
          <input
            type="checkbox"
            checked={includeContext}
            onChange={(e) => setIncludeContext(e.target.checked)}
          />
          <FileText size={12} />
          <span>Incluir contexto do documento</span>
        </label>
        {messages.length > 0 && (
          <button
            className="latex-chat-clear-btn"
            onClick={clearMessages}
            title="Limpar conversa"
            aria-label="Limpar conversa"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      <div className="latex-chat-messages" ref={scrollRef}>
        {messages.length === 0 && !loading && (
          <div className="latex-chat-empty">
            <MessageCircle size={32} />
            <p>Pergunte algo sobre LaTeX</p>
            <p className="latex-chat-empty-hint">
              Ex: "como faço uma tabela com células mescladas",<br />
              "qual a diferença entre amsmath e amssymb?",<br />
              "por que meu \ref não está funcionando?"
            </p>
          </div>
        )}

        {messages.map((m, i) => {
          if (m.role === 'user') {
            return (
              <div key={i} className="latex-chat-msg latex-chat-msg-user">
                <div className="latex-chat-msg-bubble latex-chat-msg-bubble-user">
                  <div className="latex-chat-msg-text">{m.content}</div>
                </div>
              </div>
            );
          }
          if (m.role === 'assistant') {
            return (
              <div key={i} className="latex-chat-msg latex-chat-msg-assistant">
                <AssistantMessage texto={m.content} backend={m.backend} />
              </div>
            );
          }
          if (m.role === 'system' && m.error) {
            return (
              <div key={i} className="latex-chat-msg-system">
                <AlertCircle size={12} />
                <span>{m.content}</span>
                <button className="link-btn" onClick={retryLast}>Tentar de novo</button>
              </div>
            );
          }
          return null;
        })}

        {loading && (
          <div className="latex-chat-msg latex-chat-msg-assistant">
            <div className="latex-chat-msg-bubble latex-chat-msg-bubble-assistant latex-chat-typing">
              <span className="latex-chat-typing-dot" />
              <span className="latex-chat-typing-dot" />
              <span className="latex-chat-typing-dot" />
            </div>
          </div>
        )}
      </div>

      <div className="latex-chat-input">
        <textarea
          ref={inputRef}
          className="latex-chat-textarea"
          placeholder="Pergunte algo sobre LaTeX…"
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          disabled={loading}
        />
        <div className="latex-chat-send-row">
          <span className="latex-chat-hint">Enter envia · Shift+Enter quebra linha</span>
          <button
            className="toolbar-btn primary latex-chat-send-btn"
            onClick={handleSend}
            disabled={!pergunta.trim() || loading}
          >
            {loading ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
