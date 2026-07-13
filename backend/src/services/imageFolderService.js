import fs from 'fs/promises';
import path from 'path';
import * as repo from '../repositories/projectRepository.js';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.tiff', '.pdf', '.eps']);

const IGNORED_DIRS = new Set([
  '.git', '.vscode', '.idea', '.DS_Store', 'Thumbs.db', 'node_modules',
]);

function isImageFile(name) {
  const ext = path.extname(name).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

function normalizarPath(p) {
  return p.replace(/^\.\//, '').replace(/\/+$/, '');
}

function extrairGraphicspath(content) {
  if (!content) return [];
  const results = [];
  const linhas = content.split('\n');
  for (const linha of linhas) {
    const stripped = linha.replace(/%.*$/, '').trim();
    const idx = stripped.indexOf('\\graphicspath');
    if (idx === -1) continue;
    const after = stripped.slice(idx + '\\graphicspath'.length);
    const optBrackets = after.match(/^\s*\[[^\]]*\]\s*/);
    const restante = optBrackets ? after.slice(optBrackets[0].length) : after;
    const re = /\{([^{}]*)\}/g;
    let m;
    while ((m = re.exec(restante)) !== null) {
      const t = m[1].trim();
      if (t) results.push(normalizarPath(t));
    }
  }
  return results;
}

function injetarGraphicspath(content, pasta) {
  const re = /\\graphicspath\s*(?:\[[^\]]*\]\s*)?((?:\{[^}]*\}\s*)+)/;
  if (re.test(content)) return content;
  const linha = `\\graphicspath{{${pasta}/}}\n`;
  const m = content.match(/\\begin\{document\}/);
  if (m) {
    return content.slice(0, m.index) + linha + content.slice(m.index);
  }
  return linha + content;
}

async function existsDir(projectDir, relPath) {
  try {
    const full = path.join(projectDir, relPath);
    const st = await fs.stat(full);
    return st.isDirectory();
  } catch {
    return false;
  }
}

async function listarImagensRecursivo(pastaAbs, pastaRel) {
  let entries;
  try {
    entries = await fs.readdir(pastaAbs, { withFileTypes: true });
  } catch {
    return [];
  }

  const items = [];
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith('.')) continue;
    const entryRel = `${pastaRel}/${entry.name}`;
    if (entry.isDirectory()) {
      const children = await listarImagensRecursivo(path.join(pastaAbs, entry.name), entryRel);
      const temImagem = children.some((c) => c.type === 'file' || (c.children && c.children.length > 0));
      if (children.length > 0) {
        items.push({
          path: entryRel,
          name: entry.name,
          type: 'directory',
          children,
        });
      }
    } else if (entry.isFile() && isImageFile(entry.name)) {
      items.push({
        path: entryRel,
        name: entry.name,
        type: 'file',
        ext: path.extname(entry.name).toLowerCase(),
      });
    }
  }
  return items;
}

async function scannerPastasImagem(projectDir) {
  const encontrados = new Set();

  async function walk(dir, relBase) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      if (entry.name.startsWith('.')) continue;
      const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const temImagemDireta = entries.some((e) => e.isFile() && isImageFile(e.name));
        if (temImagemDireta) {
          encontrados.add(rel);
        } else {
          await walk(full, rel);
        }
      } else if (entry.isFile() && isImageFile(entry.name)) {
        if (relBase) encontrados.add(relBase);
      }
    }
  }

  await walk(projectDir, '');
  return [...encontrados];
}

export async function detectarPastasImagem(projectId) {
  const projectDir = await repo.getProjectDir(projectId);
  const mainTex = await repo.findMainTexFile(projectDir);
  let graphicsPaths = [];
  let graphicsPathsExistem = [];

  if (mainTex) {
    try {
      const content = await repo.readFile(projectId, mainTex);
      graphicsPaths = extrairGraphicspath(content);
    } catch {}
  }

  for (const p of graphicsPaths) {
    if (await existsDir(projectDir, p)) graphicsPathsExistem.push(p);
  }

  if (graphicsPathsExistem.length === 0) {
    const scanned = await scannerPastasImagem(projectDir);
    graphicsPathsExistem = scanned;
  }

  const seen = new Set();
  const roots = [];
  for (const p of graphicsPathsExistem) {
    if (seen.has(p)) continue;
    seen.add(p);
    const full = path.join(projectDir, p);
    const tree = await listarImagensRecursivo(full, p);
    roots.push({
      path: p,
      source: graphicsPaths.includes(p) ? 'graphicspath' : 'scan',
      tree,
    });
  }

  return {
    mainTexFile: mainTex,
    graphicsPaths: graphicsPaths,
    roots,
  };
}

export function calcularCaminhoRelativo(arquivoRelativo, graphicsPaths) {
  const arq = normalizarPath(arquivoRelativo);
  for (const root of graphicsPaths) {
    const r = normalizarPath(root);
    if (arq === r) return '';
    if (arq.startsWith(`${r}/`)) return arq.slice(r.length + 1);
  }
  return arq;
}

export async function criarPastaImagemPadrao(projectId) {
  const projectDir = await repo.getProjectDir(projectId);
  const pasta = 'images';
  await fs.mkdir(path.join(projectDir, pasta), { recursive: true });
  const mainTex = await repo.findMainTexFile(projectDir);
  if (mainTex) {
    try {
      const content = await repo.readFile(projectId, mainTex);
      const current = extrairGraphicspath(content);
      if (current.length === 0) {
        const updated = injetarGraphicspath(content, pasta);
        await repo.writeFile(projectId, mainTex, updated);
      }
    } catch {}
  }
  return pasta;
}
