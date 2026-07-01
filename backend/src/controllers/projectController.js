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

export async function cloneProject(req, res) {
  try {
    const { name, url, keepGit } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name required' });
    if (!url) return res.status(400).json({ error: 'Repository URL required' });

    const project = await repo.createProject(name);
    const updatedProject = await repo.importFromGit(project.id, url, keepGit);
    res.status(201).json(updatedProject);
  } catch (err) {
    console.error('Clone error:', err);
    res.status(500).json({ error: err.message || 'Failed to clone repository' });
  }
}

export async function initGit(req, res) {
  try {
    const { remoteUrl } = req.body;
    const project = await repo.initGit(req.params.id, remoteUrl);
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getGitStatus(req, res) {
  try {
    const status = await repo.getGitStatus(req.params.id);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function listBranches(req, res) {
  try {
    const branches = await repo.listBranches(req.params.id);
    res.json(branches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function fetchRemote(req, res) {
  try {
    await repo.fetchRemote(req.params.id);
    const branches = await repo.listBranches(req.params.id);
    res.json(branches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createBranch(req, res) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Branch name required' });
    await repo.createBranch(req.params.id, name);
    const branches = await repo.listBranches(req.params.id);
    res.json(branches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function checkoutBranch(req, res) {
  try {
    const { name, keepChanges } = req.body;
    if (!name) return res.status(400).json({ error: 'Branch name required' });
    const { stashConflict, conflicts } = await repo.checkoutBranch(req.params.id, name, keepChanges !== false);
    const status = await repo.getGitStatus(req.params.id);
    res.json({ ...status, stashConflict, conflicts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function resolveConflicts(req, res) {
  try {
    const { strategy } = req.body;
    if (!strategy || !['ours', 'theirs'].includes(strategy)) {
      return res.status(400).json({ error: 'Strategy required (ours or theirs)' });
    }
    await repo.resolveConflicts(req.params.id, strategy);
    const status = await repo.getGitStatus(req.params.id);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function abortStashPop(req, res) {
  try {
    const { originalBranch } = req.body || {};
    await repo.abortStashPop(req.params.id, originalBranch);
    const status = await repo.getGitStatus(req.params.id);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function addFile(req, res) {
  try {
    const { filepath } = req.body;
    if (!filepath) return res.status(400).json({ error: 'filepath required' });
    await repo.addFile(req.params.id, filepath);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function finalizeStash(req, res) {
  try {
    const status = await repo.finalizeStash(req.params.id);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function commitAll(req, res) {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Commit message required' });
    await repo.commitAll(req.params.id, message);
    const status = await repo.getGitStatus(req.params.id);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function pushBranch(req, res) {
  try {
    await repo.pushBranch(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getGitDiff(req, res) {
  try {
    const files = await repo.getGitDiff(req.params.id);
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getGitFileDiff(req, res) {
  try {
    const filePath = req.query.file;
    if (!filePath) return res.status(400).json({ error: 'file query param required' });
    const diff = await repo.getGitFileDiff(req.params.id, filePath);
    res.type('text/plain').send(diff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
