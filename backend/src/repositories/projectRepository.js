import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';

const projectsDir = path.resolve(config.projectsDir);

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
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
  const id = uuidv4().slice(0, 8);
  const projectDir = path.join(projectsDir, id);
  await ensureDir(projectDir);
  const meta = { name, createdAt: new Date().toISOString() };
  await fs.writeFile(path.join(projectDir, 'meta.json'), JSON.stringify(meta, null, 2));
  return { id, ...meta, files: [] };
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

export async function deleteFile(projectId, filePath) {
  const fullPath = path.join(projectsDir, projectId, filePath);
  const relative = path.relative(path.join(projectsDir, projectId), fullPath);
  if (relative.startsWith('..')) throw new Error('Invalid path');
  await fs.rm(fullPath, { force: true });
}

export async function getProjectDir(projectId) {
  return path.join(projectsDir, projectId);
}

async function listFilesRecursive(dir, baseDir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
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
