import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import AdmZip from 'adm-zip';
import config from '../config/index.js';

const execFileAsync = promisify(execFile);

const projectsDir = path.resolve(config.projectsDir);

const IGNORED_ENTRIES = new Set([
  '.git',
  '.vscode',
  '.idea',
  '.DS_Store',
  'Thumbs.db',
  '.gitignore',
  '.gitattributes',
]);

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function uniqueSlug(slug) {
  let candidate = slug || 'projeto';
  let counter = 2;
  while (true) {
    try {
      await fs.access(path.join(projectsDir, candidate));
      candidate = `${slug}-${counter}`;
      counter++;
    } catch {
      return candidate;
    }
  }
}

export async function listProjects() {
  await ensureDir(projectsDir);
  const entries = await fs.readdir(projectsDir, { withFileTypes: true });
  const projects = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const metaPath = path.join(projectsDir, entry.name, 'meta.json');
      let meta = { name: entry.name };
      try {
        const data = await fs.readFile(metaPath, 'utf-8');
        meta = JSON.parse(data);
      } catch {
        // no meta file, use default
      }
      projects.push({ id: entry.name, ...meta });
    }
  }

  return projects;
}

export async function getProject(id) {
  const projectDir = path.join(projectsDir, id);
  await fs.access(projectDir);
  const files = await listFilesRecursive(projectDir, projectDir);
  let meta = { name: id };
  try {
    const data = await fs.readFile(path.join(projectDir, 'meta.json'), 'utf-8');
    meta = JSON.parse(data);
  } catch {
    // no meta
  }
  return { id, ...meta, files };
}

export async function createProject(name) {
  const slug = await uniqueSlug(slugify(name));
  const projectDir = path.join(projectsDir, slug);
  await ensureDir(projectDir);
  const meta = { name, createdAt: new Date().toISOString() };
  await fs.writeFile(path.join(projectDir, 'meta.json'), JSON.stringify(meta, null, 2));
  return { id: slug, ...meta, files: [] };
}

export async function updateProjectName(id, newName) {
  const projectDir = path.join(projectsDir, id);
  const metaPath = path.join(projectDir, 'meta.json');
  let meta = { name: id, createdAt: new Date().toISOString() };
  try {
    const data = await fs.readFile(metaPath, 'utf-8');
    meta = JSON.parse(data);
  } catch {
    // no meta yet
  }
  meta.name = newName;
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));

  const newSlug = slugify(newName);
  if (newSlug && newSlug !== id) {
    const newSlugFinal = await uniqueSlug(newSlug);
    const newDir = path.join(projectsDir, newSlugFinal);
    await fs.rename(projectDir, newDir);
    return { id: newSlugFinal, ...meta };
  }

  return { id, ...meta };
}

export async function deleteProject(id) {
  const projectDir = path.join(projectsDir, id);
  await fs.rm(projectDir, { recursive: true, force: true });
}

export async function readFile(projectId, filePath) {
  const fullPath = path.join(projectsDir, projectId, filePath);
  const relative = path.relative(path.join(projectsDir, projectId), fullPath);
  if (relative.startsWith('..')) throw new Error('Invalid path');
  return fs.readFile(fullPath, 'utf-8');
}

export async function writeFile(projectId, filePath, content) {
  const fullPath = path.join(projectsDir, projectId, filePath);
  const relative = path.relative(path.join(projectsDir, projectId), fullPath);
  if (relative.startsWith('..')) throw new Error('Invalid path');
  await ensureDir(path.dirname(fullPath));
  await fs.writeFile(fullPath, content);
}

export async function writeBinaryFile(projectId, filePath, buffer) {
  const fullPath = path.join(projectsDir, projectId, filePath);
  const relative = path.relative(path.join(projectsDir, projectId), fullPath);
  if (relative.startsWith('..')) throw new Error('Invalid path');
  await ensureDir(path.dirname(fullPath));
  await fs.writeFile(fullPath, buffer);
}

export async function deleteFile(projectId, filePath) {
  const fullPath = path.join(projectsDir, projectId, filePath);
  const relative = path.relative(path.join(projectsDir, projectId), fullPath);
  if (relative.startsWith('..')) throw new Error('Invalid path');
  await fs.rm(fullPath, { recursive: true, force: true });
}

export async function createFolder(projectId, folderPath) {
  const fullPath = path.join(projectsDir, projectId, folderPath);
  const relative = path.relative(path.join(projectsDir, projectId), fullPath);
  if (relative.startsWith('..')) throw new Error('Invalid path');
  await fs.mkdir(fullPath, { recursive: true });
}

export async function renameFile(projectId, oldPath, newPath) {
  const fullOld = path.join(projectsDir, projectId, oldPath);
  const fullNew = path.join(projectsDir, projectId, newPath);
  const relOld = path.relative(path.join(projectsDir, projectId), fullOld);
  const relNew = path.relative(path.join(projectsDir, projectId), fullNew);
  if (relOld.startsWith('..') || relNew.startsWith('..')) throw new Error('Invalid path');
  await fs.rename(fullOld, fullNew);
}

export async function getProjectDir(projectId) {
  return path.join(projectsDir, projectId);
}

export async function findMainTexFile(projectDir) {
  try {
    const entries = await fs.readdir(projectDir, { withFileTypes: true });
    const texFiles = entries
      .filter((e) => e.isFile() && e.name.endsWith('.tex'))
      .map((e) => e.name);

    for (const file of texFiles) {
      const content = await fs.readFile(path.join(projectDir, file), 'utf-8');
      const head = content.slice(0, 5000);
      if (head.includes('\\documentclass') || head.includes('\\begin{document}')) {
        return file;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export async function importFromZip(projectId, zipBuffer) {
  const projectDir = path.join(projectsDir, projectId);
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const fullPath = path.join(projectDir, entry.entryName);
    const relative = path.relative(projectDir, fullPath);
    if (relative.startsWith('..')) continue;
    await ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, entry.getData());
  }
}

export async function importFromFiles(projectId, files, filePaths) {
  const projectDir = path.join(projectsDir, projectId);
  for (let i = 0; i < files.length; i++) {
    const relativePath = filePaths[i] || files[i].originalname;
    const fullPath = path.join(projectDir, relativePath);
    const relative = path.relative(projectDir, fullPath);
    if (relative.startsWith('..')) continue;
    await ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, files[i].buffer);
  }
}

export async function importFromGit(projectId, url, keepGit = false) {
  const projectDir = path.join(projectsDir, projectId);
  const tempDir = `${projectDir}_tmp_clone`;

  await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});

  try {
    await execFileAsync('git', ['clone', '--depth', '1', url, tempDir], {
      timeout: 60000,
    });
  } catch (err) {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    if (err.stderr?.includes('not found') || err.stderr?.includes('Repository not found')) {
      throw new Error('Repositório não encontrado. Verifique se a URL está correta e se é público.');
    }
    if (err.stderr?.includes('Authentication')) {
      throw new Error('Erro de autenticação. Verifique se o repositório é público ou se suas credenciais SSH estão configuradas.');
    }
    throw new Error(`Falha ao clonar repositório: ${err.message}`);
  }

  await execFileAsync('git', ['config', 'remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*'], { cwd: tempDir }).catch(() => {});
  await execFileAsync('git', ['fetch', 'origin'], { cwd: tempDir, timeout: 60000 }).catch(() => {});

  const entries = await fs.readdir(tempDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.git' && !keepGit) continue;
    await fs.rename(path.join(tempDir, entry.name), path.join(projectDir, entry.name));
  }

  await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});

  return getProject(projectId);
}

async function listFilesRecursive(dir, baseDir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (IGNORED_ENTRIES.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      const children = await listFilesRecursive(fullPath, baseDir);
      files.push({ name: entry.name, path: relativePath, type: 'directory', children });
    } else {
      files.push({ name: entry.name, path: relativePath, type: 'file' });
    }
  }

  return files;
}
