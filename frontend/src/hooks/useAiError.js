import { useCallback, useRef, useState } from 'react';
import { api } from '../services/api.js';

async function sha256(texto) {
  const encoder = new TextEncoder();
  const data = encoder.encode(texto);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function useAiError() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [hash, setHash] = useState(null);
  const cacheRef = useRef(new Map());

  const explain = useCallback(async ({ log, texContexto, linhaErro, arquivoErro }) => {
    if (!log) {
      setError('Log vazio');
      return null;
    }

    const h = await sha256(log);
    setHash(h);

    if (cacheRef.current.has(h)) {
      const cached = cacheRef.current.get(h);
      setResult(cached);
      setError(null);
      return cached;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.aiExplainLatexError({ log, texContexto, linhaErro, arquivoErro });
      if (res && res.error) {
        setError(res.error);
        setResult(null);
        return null;
      }
      cacheRef.current.set(h, res);
      setResult(res);
      return res;
    } catch (err) {
      setError(err.message || 'Erro ao explicar erro de LaTeX');
      setResult(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setError(null);
    setResult(null);
    setHash(null);
  }, []);

  return { loading, error, result, hash, explain, clear };
}
