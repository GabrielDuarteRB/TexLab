import aiService from '../services/aiService.js';
import { revisarTexto, checarComLtex } from '../services/academic/academicReviewService.js';
import { ollamaDisponivel } from '../services/academic/ollamaClient.js';
import { groqDisponivel } from '../services/academic/groqClient.js';
import { checkHealth, getPoolStatus } from '../services/ltex/ltexClient.js';

export async function suggest(req, res) {
  const { latexContent, instruction } = req.body;
  if (!latexContent || !instruction) {
    return res.status(400).json({ error: 'latexContent and instruction required' });
  }
  const result = await aiService.suggest(latexContent, instruction);
  res.json(result);
}

export async function review(req, res) {
  const { text, idioma, backend: backendOpcao } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }
  try {
    const result = await revisarTexto(text, idioma || 'pt', backendOpcao || 'auto');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function aiStatus(req, res) {
  res.json({ enabled: aiService.enabled });
}

export async function academicStatus(req, res) {
  const ollama = await ollamaDisponivel();
  const groq = groqDisponivel();
  res.json({
    ollama_disponivel: ollama,
    groq_disponivel: groq,
    disponivel: ollama || groq,
  });
}

export async function ltexStatus(req, res) {
  const pool = getPoolStatus();
  const health = await checkHealth();
  res.json({
    disponivel: health.available,
    version: health.version || null,
    erro: health.error || null,
    pool,
  });
}

export async function ltexCheck(req, res) {
  const { text, language, languageId, includeSuggestions } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }
  try {
    const diagnostics = await checarComLtex(text, {
      language,
      languageId,
      includeSuggestions,
    });
    res.json({ diagnostics });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
