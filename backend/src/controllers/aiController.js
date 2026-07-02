import aiService from '../services/aiService.js';
import { revisarTexto } from '../services/academic/academicReviewService.js';
import { ollamaDisponivel } from '../services/academic/ollamaClient.js';
import { groqDisponivel } from '../services/academic/groqClient.js';

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
