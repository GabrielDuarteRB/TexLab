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

export async function updateProject(req, res) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name required' });
  const project = await repo.updateProjectName(req.params.id, name);
  res.json(project);
}

export async function deleteProject(req, res) {
  await repo.deleteProject(req.params.id);
  res.status(204).end();
}

export async function readFile(req, res) {
  const { id } = req.params;
  const filePath = req.params[0];
  const content = await repo.readFile(id, filePath);
  res.type('text/plain').send(content);
}

export async function writeFile(req, res) {
  const { id } = req.params;
  const filePath = req.params[0];
  await repo.writeFile(id, filePath, req.body.content);
  res.json({ ok: true });
}

export async function uploadFile(req, res) {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const filename = req.file.originalname;
  const folderPath = req.body.folderPath || '';
  const filePath = folderPath ? `${folderPath}/${filename}` : filename;
  await repo.writeBinaryFile(id, filePath, req.file.buffer);
  const project = await repo.getProject(id);
  res.json({ ok: true, filename: filePath, project });
}

export async function createFolder(req, res) {
  const { id } = req.params;
  const { path: folderPath } = req.body;
  if (!folderPath) return res.status(400).json({ error: 'Folder path required' });
  await repo.createFolder(id, folderPath);
  const project = await repo.getProject(id);
  res.status(201).json(project);
}

export async function deleteFile(req, res) {
  const { id } = req.params;
  const filePath = req.params[0];
  await repo.deleteFile(id, filePath);
  const project = await repo.getProject(id);
  res.json(project);
}

export async function renameFile(req, res, next) {
  try {
    const { id } = req.params;
    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) return res.status(400).json({ error: 'oldPath and newPath required' });
    await repo.renameFile(id, oldPath, newPath);
    const project = await repo.getProject(id);
    res.json(project);
  } catch (err) {
    next(err);
  }
}

export async function importProject(req, res) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name required' });

    const project = await repo.createProject(name);

    if (req.file) {
      await repo.importFromZip(project.id, req.file.buffer);
    } else if (req.files && req.files.length > 0) {
      let filePaths;
      try {
        filePaths = JSON.parse(req.body.filePaths);
      } catch {
        filePaths = req.files.map((f) => f.originalname);
      }
      await repo.importFromFiles(project.id, req.files, filePaths);
    }

    const updatedProject = await repo.getProject(project.id);
    res.status(201).json(updatedProject);
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: 'Failed to import project' });
  }
}
