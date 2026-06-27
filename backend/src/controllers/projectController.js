import * as repo from '../repositories/projectRepository.js';

export async function listProjects(req, res) {
  const projects = await repo.listProjects();
  res.json(projects);
}

export async function getProject(req, res) {
  const project = await repo.getProject(req.params.id);
  res.json(project);
}

export async function createProject(req, res) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name required' });
  const project = await repo.createProject(name);
  res.status(201).json(project);
}

export async function deleteProject(req, res) {
  await repo.deleteProject(req.params.id);
  res.status(204).end();
}

export async function readFile(req, res) {
  const { id, filename } = req.params;
  const content = await repo.readFile(id, filename);
  res.type('text/plain').send(content);
}

export async function writeFile(req, res) {
  const { id, filename } = req.params;
  await repo.writeFile(id, filename, req.body.content);
  res.json({ ok: true });
}

export async function uploadFile(req, res) {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const filename = req.file.originalname;
  await repo.writeFile(id, filename, req.file.buffer.toString('utf-8'));
  res.json({ ok: true, filename });
}
