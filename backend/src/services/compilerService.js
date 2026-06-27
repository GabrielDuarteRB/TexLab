import { exec } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class TexLabCompiler {
  async compile(projectDir, mainFile = 'main.tex') {
    const filePath = path.join(projectDir, mainFile);

    try {
      await fs.access(filePath);
    } catch {
      throw new Error(`File ${mainFile} not found in project`);
    }

    try {
      await execAsync(
        `latexmk -C "${mainFile}" && rm -f "${mainFile.replace('.tex', '.bcf')}"`,
        { cwd: projectDir, timeout: 30000 }
      );

      const { stdout, stderr } = await execAsync(
        `latexmk -pdf -interaction=nonstopmode -halt-on-error "${mainFile}"`,
        { cwd: projectDir, timeout: 120000 }
      );

      const pdfPath = path.join(projectDir, mainFile.replace('.tex', '.pdf'));
      let pdfExists = false;
      try {
        await fs.access(pdfPath);
        pdfExists = true;
      } catch {
        // no pdf
      }

      return {
        success: pdfExists,
        log: stderr || stdout,
        pdfPath: pdfExists ? mainFile.replace('.tex', '.pdf') : null,
      };
    } catch (error) {
      const log = error.stdout || error.stderr || error.message;
      // Verificar se o PDF foi gerado mesmo com erro
      const pdfPath = path.join(projectDir, mainFile.replace('.tex', '.pdf'));
      let pdfExists = false;
      try {
        await fs.access(pdfPath);
        pdfExists = true;
      } catch {
        // no pdf
      }
      return { success: pdfExists, log, pdfPath: pdfExists ? mainFile.replace('.tex', '.pdf') : null };
    }
  }

  async getLog(projectDir, mainFile = 'main.tex') {
    const logFile = path.join(projectDir, mainFile.replace('.tex', '.log'));
    try {
      return await fs.readFile(logFile, 'utf-8');
    } catch {
      return null;
    }
  }
}
