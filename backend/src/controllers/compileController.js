import { TexLabCompiler } from '../services/compilerService.js';
import { getProjectDir, findMainTexFile } from '../repositories/projectRepository.js';

const compiler = new TexLabCompiler();

export async function compile(req, res) {
  const { id } = req.params;
  let { mainFile } = req.body;

  const projectDir = await getProjectDir(id);

  if (!mainFile) {
    mainFile = await findMainTexFile(projectDir);
  }

  if (!mainFile) {
    return res.status(400).json({ error: 'Nenhum arquivo .tex principal encontrado no projeto' });
  }

  const result = await compiler.compile(projectDir, mainFile);
  res.json(result);
}

export async function getPdf(req, res) {
  const { id } = req.params;
  const { file } = req.query;
  const fs = await import('fs/promises');
  const path = await import('path');

  const projectDir = await getProjectDir(id);

  let pdfFile;
  if (file) {
    pdfFile = path.join(projectDir, file);
  } else {
    const mainTex = await findMainTexFile(projectDir);
    const mainName = mainTex ? mainTex.replace('.tex', '') : 'main';
    pdfFile = path.join(projectDir, `${mainName}.pdf`);
  }

  try {
    await fs.access(pdfFile);
    res.sendFile(pdfFile);
  } catch {
    res.status(404).json({ error: 'PDF not found. Compile first.' });
  }
}

export async function getLog(req, res) {
  const { id } = req.params;
  const fs = await import('fs/promises');
  const path = await import('path');

  const projectDir = await getProjectDir(id);
  const mainTex = await findMainTexFile(projectDir);
  const mainName = mainTex ? mainTex.replace('.tex', '') : 'main';
  const logFile = path.join(projectDir, `${mainName}.log`);

  try {
    const content = await fs.readFile(logFile, 'utf-8');
    res.type('text/plain').send(content);
  } catch {
    res.status(404).json({ error: 'No log file' });
  }
}
