import aiService from '../services/aiService.js';

export async function suggest(req, res) {
  const { latexContent, instruction } = req.body;
  if (!latexContent || !instruction) {
    return res.status(400).json({ error: 'latexContent and instruction required' });
  }
  const result = await aiService.suggest(latexContent, instruction);
  res.json(result);
}

export async function aiStatus(req, res) {
  res.json({ enabled: aiService.enabled });
}
