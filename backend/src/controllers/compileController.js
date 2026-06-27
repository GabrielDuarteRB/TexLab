import { TexLabCompiler } from '../services/compilerService.js';
import { getProjectDir } from '../repositories/projectRepository.js';

const compiler = new TexLabCompiler();

export async function compile(req, res) {
  const { id } = req.params;
  const { mainFile } = req.body;

  const projectDir = await getProjectDir(id);
  const result = await compiler.compile(projectDir, mainFile || 'main.tex');
  res.json(result);
}

export async function getPdf(req, res) {
  const { id } = req.params;
  const { file } = req.query;
  const fs = await import('fs/promises');
  const path = await import('path');

  const projectDir = await getProjectDir(id);
  const pdfFile = path.join(projectDir, file || 'main.pdf');

  try {
    await fs.access(pdfFile);
    res.sendFile(pdfFile);
  } catch {
    res.status(404).json({ error: 'PDF not found. Compile first.' });
  }
}

export async function getLog(req, res) {
  const { id } = req.params;
  const projectDir = await getProjectDir(id);
  const log = await compiler.getLog(projectDir);
  if (log) {
    res.type('text/plain').send(log);
  } else {
    res.status(404).json({ error: 'No log file' });
  }
}
