import * as gitService from '../services/gitService.js';

const CONFLICT_CODES = new Set(['MERGE_CONFLICT', 'DIRTY_WORKING_TREE']);

function handleError(err, res, next) {
  if (err && err.name === 'GitError') {
    const status = err.code === 'NOT_A_REPO' ? 404
      : err.code === 'REPO_EXISTS' ? 409
      : err.code === 'INVALID_INPUT' ? 400
      : CONFLICT_CODES.has(err.code) ? 409
      : 500;
    return res.status(status).json({
      error: err.message,
      code: err.code,
      conflictFiles: err.conflictFiles || undefined,
    });
  }
  return next(err);
}

export async function init(req, res, next) {
  try {
    const { remoteUrl, userName, userEmail } = req.body || {};
    const result = await gitService.init(req.params.id, { remoteUrl, userName, userEmail });
    res.json({ ok: true, ...result });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function status(req, res, next) {
  try {
    res.json(await gitService.getStatus(req.params.id));
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function config(req, res, next) {
  try {
    res.json(await gitService.getGlobalConfig({ projectId: req.params.id }));
  } catch (err) {
    next(err);
  }
}

export async function listBranches(req, res, next) {
  try {
    res.json(await gitService.listBranches(req.params.id));
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function createBranch(req, res, next) {
  try {
    await gitService.createBranch(req.params.id, req.body?.name);
    res.json(await gitService.listBranches(req.params.id));
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function fetch(req, res, next) {
  try {
    await gitService.fetchRemote(req.params.id);
    res.json(await gitService.listBranches(req.params.id));
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function checkout(req, res, next) {
  try {
    await gitService.checkout(req.params.id, req.body?.name);
    res.json({ ok: true });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function commit(req, res, next) {
  try {
    res.json(await gitService.commit(req.params.id, req.body?.message));
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function push(req, res, next) {
  try {
    res.json(await gitService.push(req.params.id));
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function pull(req, res, next) {
  try {
    res.json(await gitService.pull(req.params.id));
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function merge(req, res, next) {
  try {
    res.json(await gitService.merge(req.params.id, req.body?.source));
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function log(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 15, 200);
    const skip = Math.max(parseInt(req.query.skip, 10) || 0, 0);
    res.json(await gitService.getLog(req.params.id, { limit, skip }));
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function diffFiles(req, res, next) {
  try {
    res.json(await gitService.diffFiles(req.params.id));
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function diffFile(req, res, next) {
  try {
    const { file, base, head } = req.query;
    if (!file) return res.status(400).json({ error: 'file query param required', code: 'INVALID_INPUT' });
    const diff = await gitService.diffFile(req.params.id, file, { base, head });
    res.type('text/plain').send(diff);
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function diffCommit(req, res, next) {
  try {
    const { commit } = req.query;
    if (!commit) return res.status(400).json({ error: 'commit query param required', code: 'INVALID_INPUT' });
    const diff = await gitService.showCommit(req.params.id, commit);
    res.type('text/plain').send(diff);
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function discard(req, res, next) {
  try {
    const status = await gitService.discardAll(req.params.id);
    res.json(status);
  } catch (err) {
    handleError(err, res, next);
  }
}
