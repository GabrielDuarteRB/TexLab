import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';

export function useAi() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const [academicEnabled, setAcademicEnabled] = useState(false);
  const [academicBackend, setAcademicBackend] = useState('');
  const [academicLoading, setAcademicLoading] = useState(false);
  const [academicResult, setAcademicResult] = useState(null);

  useEffect(() => {
    api.aiStatus().then((res) => setEnabled(res.enabled)).catch(() => {});
    api.aiAcademicStatus()
      .then((res) => {
        setAcademicEnabled(res.disponivel);
        if (res.ollama_disponivel) setAcademicBackend('Ollama (local)');
        else if (res.groq_disponivel) setAcademicBackend('Groq API');
      })
      .catch(() => {});
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

  const review = useCallback(async (text, idioma = 'pt', backend = 'auto') => {
    setAcademicLoading(true);
    setAcademicResult(null);
    try {
      const res = await api.aiReview(text, idioma, backend);
      setAcademicResult(res);
      setAcademicLoading(false);
      return res;
    } catch (error) {
      setAcademicLoading(false);
      setAcademicResult({ error: error.message });
    }
  }, []);

  return {
    enabled, loading, result, suggest,
    academicEnabled, academicBackend, academicLoading, academicResult, review,
  };
}
