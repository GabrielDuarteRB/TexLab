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

    const baseName = mainFile.replace('.tex', '');

    try {
      await execAsync(
        `latexmk -C "${mainFile}" && rm -f "${baseName}.bcf"`,
        { cwd: projectDir, timeout: 30000 }
      );

      const { stdout: out1, stderr: err1 } = await execAsync(
        `pdflatex -interaction=nonstopmode -halt-on-error "${mainFile}"`,
        { cwd: projectDir, timeout: 60000 }
      );

      await execAsync(
        `bibtex "${baseName}" || true`,
        { cwd: projectDir, timeout: 30000 }
      );

      await execAsync(
        `pdflatex -interaction=nonstopmode -halt-on-error "${mainFile}"`,
        { cwd: projectDir, timeout: 60000 }
      );

      const { stdout: out3, stderr: err3 } = await execAsync(
        `pdflatex -interaction=nonstopmode -halt-on-error "${mainFile}"`,
        { cwd: projectDir, timeout: 60000 }
      );

      const pdfPath = path.join(projectDir, `${baseName}.pdf`);
      let pdfExists = false;
      try {
        await fs.access(pdfPath);
        pdfExists = true;
      } catch {
        // no pdf
      }

      return {
        success: pdfExists,
        log: (err3 || err1 || out3 || out1 || ''),
        pdfPath: pdfExists ? `${baseName}.pdf` : null,
      };
    } catch (error) {
      const log = error.stdout || error.stderr || error.message;
      const pdfPath = path.join(projectDir, `${baseName}.pdf`);
      let pdfExists = false;
      try {
        await fs.access(pdfPath);
        pdfExists = true;
      } catch {
        // no pdf
      }
      return { success: pdfExists, log, pdfPath: pdfExists ? `${baseName}.pdf` : null };
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
