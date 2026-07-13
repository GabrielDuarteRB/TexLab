import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api.js';
import useProjectStore from '../store/useProjectStore.js';

const HISTORY_LIMIT = 20;

function sanitizarParaEnvio(messages) {
  return messages
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-HISTORY_LIMIT)
    .map((m) => ({ role: m.role, content: m.content }));
}

export function useLatexChat() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [includeContext, setIncludeContext] = useState(true);
  const [error, setError] = useState(null);
  const { currentProject, currentFile, fileContents } = useProjectStore();

  useEffect(() => {
    setMessages([]);
    setError(null);
  }, [currentProject?.id]);

  const sendMessage = useCallback(async (pergunta) => {
    const texto = (pergunta || '').trim();
    if (!texto) return;

    const userMsg = { role: 'user', content: texto, ts: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);
    setError(null);

    try {
      const temDoc = includeContext && currentFile && (fileContents?.[currentFile] || '').trim();
      const ctx = temDoc ? fileContents[currentFile] : null;
      const hist = sanitizarParaEnvio(messages);

      const res = await api.aiLatexChat({
        pergunta: texto,
        historico: hist,
        contextoDocumento: ctx,
        includeContext: !!temDoc,
      });

      if (res && res.error) {
        setError(res.error);
        setMessages((m) => [
          ...m,
          { role: 'system', content: res.error, error: true, ts: Date.now() },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            content: res?.resposta || '',
            backend: res?.backend_usado,
            ts: Date.now(),
          },
        ]);
      }
    } catch (err) {
      const msg = err.message || 'Erro de rede';
      setError(msg);
      setMessages((m) => [
        ...m,
        { role: 'system', content: msg, error: true, ts: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [messages, includeContext, currentFile, fileContents]);

  const retryLast = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUser) sendMessage(lastUser.content);
  }, [messages, sendMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    loading,
    error,
    includeContext,
    setIncludeContext,
    sendMessage,
    retryLast,
    clearMessages,
  };
}
