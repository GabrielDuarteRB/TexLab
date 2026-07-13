import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';

export function useAi() {
  const [academicEnabled, setAcademicEnabled] = useState(false);
  const [academicBackend, setAcademicBackend] = useState('');
  const [academicLoading, setAcademicLoading] = useState(false);
  const [academicResult, setAcademicResult] = useState(null);

  useEffect(() => {
    api.aiAcademicStatus()
      .then((res) => {
        setAcademicEnabled(res.disponivel);
        if (res.ollama_disponivel) setAcademicBackend('Ollama (local)');
        else if (res.groq_disponivel) setAcademicBackend('Groq API');
      })
      .catch(() => {});
  }, []);

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
    academicEnabled, academicBackend, academicLoading, academicResult, review,
  };
}
