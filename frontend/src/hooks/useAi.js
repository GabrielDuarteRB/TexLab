import { useState, useEffect } from 'react';
import { api } from '../services/api.js';

export function useAi() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.aiStatus().then((res) => setEnabled(res.enabled)).catch(() => {});
  }, []);

  const suggest = async (latexContent, instruction) => {
    setLoading(true);
    try {
      const res = await api.aiSuggest(latexContent, instruction);
      setResult(res);
      setLoading(false);
      return res;
    } catch (error) {
      setLoading(false);
      setResult({ success: false, error: error.message });
    }
  };

  return { enabled, loading, result, suggest };
}
