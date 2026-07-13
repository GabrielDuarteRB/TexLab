import { revisarTexto, checarComLtex } from '../services/academic/academicReviewService.js';
import { ollamaDisponivel } from '../services/academic/ollamaClient.js';
import { groqDisponivel } from '../services/academic/groqClient.js';
import { checkHealth, getPoolStatus } from '../services/ltex/ltexClient.js';
import { explainLatexError } from '../services/latexErrorExplainerService.js';
import { chatLatex } from '../services/latexChatService.js';

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

export async function explainError(req, res) {
  const { log, texContexto, linhaErro, arquivoErro } = req.body || {};
  if (!log || typeof log !== 'string' || log.trim().length < 5) {
    return res.status(400).json({ error: 'log é obrigatório e não pode estar vazio' });
  }
  try {
    const result = await explainLatexError({ log, texContexto, linhaErro, arquivoErro });
    res.json(result);
  } catch (err) {
    const msg = err.message || 'Erro ao explicar erro de LaTeX';
    res.status(500).json({ error: msg });
  }
}

export async function latexChat(req, res) {
  const { pergunta, historico, contextoDocumento, includeContext } = req.body || {};
  if (!pergunta || typeof pergunta !== 'string' || !pergunta.trim()) {
    return res.status(400).json({ error: 'pergunta é obrigatória e não pode estar vazia' });
  }
  if (historico !== undefined && !Array.isArray(historico)) {
    return res.status(400).json({ error: 'historico deve ser um array' });
  }
  try {
    const result = await chatLatex({ pergunta, historico, contextoDocumento, includeContext });
    res.json(result);
  } catch (err) {
    const msg = err.message || 'Erro no chat LaTeX';
    res.status(500).json({ error: msg });
  }
}
