import fs from 'fs/promises';
import path from 'path';
import { execFile, execFileSync } from 'child_process';
import { promisify } from 'util';
import config from '../config/index.js';

const execFileAsync = promisify(execFile);
const projectsDir = path.resolve(config.projectsDir);

const LATEX_GITIGNORE = [
  '*.aux',
  '*.log',
  '*.out',
  '*.toc',
  '*.synctex.gz',
  '*.fls',
  '*.fdb_latexmk',
  '*.bbl',
  '*.bcf',
  '*.run.xml',
  '*.nav',
  '*.snm',
  '',
].join('\n');

const SSH_URL_REGEX = /^(git@[A-Za-z0-9._-]+:[A-Za-z0-9._\/-]+(?:\.git)?|ssh:\/\/.+)$/;

class GitError extends Error {
  constructor(message, { code, conflictFiles, stderr } = {}) {
    super(message);
    this.name = 'GitError';
    this.code = code || 'GIT_ERROR';
    this.conflictFiles = conflictFiles || null;
    this.stderr = stderr || null;
  }
}

function getRepoDir(projectId) {
  return path.join(projectsDir, projectId);
}

async function ensureRepo(projectId) {
  const repoDir = getRepoDir(projectId);
  try {
    await fs.access(path.join(repoDir, '.git'));
  } catch {
    throw new GitError('Este projeto não é um repositório Git.', { code: 'NOT_A_REPO' });
  }
  return repoDir;
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function execGit(args, cwd, opts = {}) {
  try {
    const result = await execFileAsync('git', args, {
      cwd,
      maxBuffer: 50 * 1024 * 1024,
      ...opts,
    });
    return { stdout: result.stdout || '', stderr: result.stderr || '' };
  } catch (err) {
    const stderr = (err.stderr || err.stdout || err.message || '').toString();
    const friendly = friendlyGitError(stderr, args[0]);
    const code = friendly.code || 'GIT_ERROR';
    throw new GitError(friendly.message, {
      code,
      conflictFiles: friendly.conflictFiles || null,
      stderr,
    });
  }
}

function friendlyGitError(stderr, op) {
  const text = stderr || '';

  if (/^fatal: could not read Username|^fatal: could not read Password/.test(text)) {
    return { code: 'AUTH_REQUIRED', message: 'Autenticação necessária. O repositório exige credenciais; use uma URL SSH.' };
  }
  if (/Permission denied \(publickey\)/.test(text) || /Permission denied, please try again/.test(text)) {
    return {
      code: 'SSH_AUTH_FAILED',
      message: 'Falha de autenticação SSH. Verifique se sua chave privada está em ~/.ssh/ com permissão 600 e se foi adicionada ao repositório remoto. Teste com `ssh -T git@github.com`.',
    };
  }
  if (/Could not read from remote repository/.test(text)) {
    return {
      code: 'REMOTE_UNREACHABLE',
      message: 'Não foi possível ler o repositório remoto. Confirme a URL e o acesso SSH.',
    };
  }
  if (/Repository not found/.test(text) || /repository .* not found/i.test(text)) {
    return { code: 'REPO_NOT_FOUND', message: 'Repositório não encontrado. Verifique se a URL está correta.' };
  }
  if (/Please tell me who you are/.test(text)) {
    return {
      code: 'NO_USER_CONFIG',
      message: 'Configure seu nome e e-mail antes de commitar. Preencha os campos no modal de inicialização, ou rode `git config --global user.name "Nome"` e `git config --global user.email "email"`.',
    };
  }
  if (/Author identity unknown/.test(text)) {
    return {
      code: 'NO_USER_CONFIG',
      message: 'Identidade de autor desconhecida. Configure user.name e user.email antes de commitar.',
    };
  }
  if (/Your local changes .* would be overwritten/.test(text)) {
    return {
      code: 'LOCAL_WOULD_OVERWRITE',
      message: 'Suas alterações locais seriam sobrescritas. Faça commit ou descarte antes de continuar.',
    };
  }
  if (/failed to push some refs/.test(text) || /non-fast-forward/.test(text) || /rejected.*non-fast-forward/.test(text)) {
    return {
      code: 'PUSH_REJECTED',
      message: 'Push rejeitado: o remote tem commits que você não tem localmente. Faça pull primeiro.',
    };
  }
  if (/nothing to commit/.test(text)) {
    return { code: 'NOTHING_TO_COMMIT', message: 'Nada para commitar.' };
  }
  if (/not a git repository/.test(text)) {
    return { code: 'NOT_A_REPO', message: 'Este projeto não é um repositório Git.' };
  }
  if (/CONFLICT \([^)]+\):/.test(text) || /Merge conflict in/.test(text) || /Automatic merge failed/.test(text)) {
    return {
      code: 'MERGE_CONFLICT',
      message: 'Existem conflitos de merge. Abra os arquivos listados no editor e resolva manualmente.',
    };
  }
  if (/a branch named ['"]?[^'"]+['"]? already exists/i.test(text)) {
    return { code: 'BRANCH_EXISTS', message: 'Já existe uma branch com esse nome.' };
  }
  if (/already exists and is not an empty directory/.test(text)) {
    return { code: 'REPO_EXISTS', message: 'Já existe um repositório neste diretório.' };
  }
  if (/No such file or directory/.test(text) && /fatal:/.test(text)) {
    return { code: 'GIT_ERROR', message: text.split('\n').find((l) => l.trim()) || 'Erro do Git.' };
  }
  if (/dubious ownership/.test(text)) {
    return {
      code: 'DUBIOUS_OWNERSHIP',
      message: 'Git recusou o diretório por "dubious ownership". Rode `git config --global --add safe.directory <caminho>` no host e tente novamente.',
    };
  }
  if (/bad object|ambiguous argument|unknown revision/.test(text)) {
    return {
      code: 'BAD_REVISION',
      message: 'Referência Git inválida ou commit não encontrado.',
    };
  }
  return {
    code: 'GIT_ERROR',
    message: text.split('\n').filter((l) => l.trim()).slice(0, 2).join(' ').trim() || `Erro do Git (${op}).`,
  };
}

function validateSshUrl(url) {
  if (!url) return null;
  if (!SSH_URL_REGEX.test(url)) {
    throw new GitError('URL inválida. Use SSH (ex: git@github.com:usuario/repo.git).', { code: 'INVALID_URL' });
  }
  return url;
}

async function writeLatexGitignore(repoDir) {
  const gitignorePath = path.join(repoDir, '.gitignore');
  if (await pathExists(gitignorePath)) return false;
  await fs.writeFile(gitignorePath, LATEX_GITIGNORE, 'utf-8');
  return true;
}

async function getConfigValue(repoDir, key) {
  try {
    const { stdout } = await execFileAsync('git', ['config', '--get', key], { cwd: repoDir });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

export async function getGlobalConfig({ projectId } = {}) {
  const cwd = projectId ? getRepoDir(projectId) : undefined;
  try {
    const { stdout: name } = await execFileAsync('git', ['config', '--global', '--get', 'user.name'], { cwd }).catch(() => ({ stdout: '' }));
    const { stdout: email } = await execFileAsync('git', ['config', '--global', '--get', 'user.email'], { cwd }).catch(() => ({ stdout: '' }));
    return { userName: name.trim() || null, userEmail: email.trim() || null };
  } catch {
    return { userName: null, userEmail: null };
  }
}

export async function init(projectId, { remoteUrl, userName, userEmail } = {}) {
  const repoDir = getRepoDir(projectId);
  if (await pathExists(path.join(repoDir, '.git'))) {
    throw new GitError('Este projeto já possui um repositório Git inicializado.', { code: 'REPO_EXISTS' });
  }

  const validUrl = validateSshUrl(remoteUrl);

  await execFileAsync('git', ['init'], { cwd: repoDir });

  if (userName) {
    await execFileAsync('git', ['config', 'user.name', userName], { cwd: repoDir });
  }
  if (userEmail) {
    await execFileAsync('git', ['config', 'user.email', userEmail], { cwd: repoDir });
  }

  await writeLatexGitignore(repoDir);

  if (validUrl) {
    await execFileAsync('git', ['remote', 'add', 'origin', validUrl], { cwd: repoDir });
  }

  const status = await execFileAsync('git', ['status', '--porcelain'], { cwd: repoDir });
  if (status.stdout.trim()) {
    await execFileAsync('git', ['add', '.'], { cwd: repoDir });
    try {
      await execFileAsync('git', ['commit', '-m', 'Initial commit'], { cwd: repoDir });
    } catch (err) {
      const stderr = (err.stderr || err.message || '').toString();
      if (!/nothing to commit/i.test(stderr)) {
        const friendly = friendlyGitError(stderr, 'commit');
        throw new GitError(friendly.message, { code: friendly.code, stderr });
      }
    }
  }

  return {
    branch: (await execFileAsync('git', ['branch', '--show-current'], { cwd: repoDir })).stdout.trim() || null,
    hasRemote: !!validUrl,
  };
}

export async function getStatus(projectId) {
  const repoDir = await ensureRepo(projectId);

  const { stdout: branchOut } = await execFileAsync('git', ['branch', '--show-current'], { cwd: repoDir });
  const branch = branchOut.trim() || null;

  const { stdout: statusOut } = await execFileAsync('git', ['status', '--porcelain'], { cwd: repoDir });
  const changes = statusOut.split('\n').filter(Boolean);

  let hasRemote = false;
  try {
    const { stdout: url } = await execFileAsync('git', ['remote', 'get-url', 'origin'], { cwd: repoDir });
    hasRemote = url.trim().length > 0;
  } catch {}

  let ahead = 0;
  let behind = 0;
  if (hasRemote && branch) {
    try {
      await execFileAsync('git', ['config', 'remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*'], { cwd: repoDir }).catch(() => {});
      const { stdout: rev } = await execFileAsync(
        'git',
        ['rev-list', '--left-right', '--count', `${branch}...origin/${branch}`],
        { cwd: repoDir },
      ).catch(() => ({ stdout: '0\t0' }));
      const [a = '0', b = '0'] = rev.trim().split(/\s+/);
      ahead = parseInt(a, 10) || 0;
      behind = parseInt(b, 10) || 0;
    } catch {}
  }

  const conflictFiles = (await listUnmerged(repoDir)).map((f) => f.path);

  return {
    branch,
    hasRemote,
    ahead,
    behind,
    dirty: changes.length > 0,
    changes: changes.length,
    conflictFiles,
  };
}

async function listUnmerged(repoDir) {
  try {
    const { stdout } = await execFileAsync('git', ['diff', '--name-only', '--diff-filter=U'], { cwd: repoDir });
    return stdout.split('\n').filter(Boolean).map((p) => ({ path: p }));
  } catch {
    return [];
  }
}

export async function listBranches(projectId) {
  const repoDir = await ensureRepo(projectId);

  const { stdout } = await execFileAsync('git', ['branch'], { cwd: repoDir });
  const currentBranch = (await execFileAsync('git', ['branch', '--show-current'], { cwd: repoDir })).stdout.trim();
  const branches = [];
  const local = new Set();

  for (const line of stdout.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const isCurrent = trimmed.startsWith('* ');
    const name = trimmed.replace(/^\*\s*/, '');
    local.add(name);
    branches.push({ name, current: isCurrent || name === currentBranch, remote: false });
  }

  try {
    const { stdout: remoteOut } = await execFileAsync('git', ['ls-remote', '--heads', 'origin'], {
      cwd: repoDir,
      timeout: 15000,
    });
    for (const line of remoteOut.split('\n')) {
      const m = line.match(/refs\/heads\/(.+)/);
      if (m && !local.has(m[1])) {
        branches.push({ name: m[1], current: false, remote: true });
      }
    }
  } catch {}

  return branches;
}

export async function fetchRemote(projectId) {
  const repoDir = await ensureRepo(projectId);
  await execFileAsync('git', ['config', 'remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*'], { cwd: repoDir }).catch(() => {});
  await execGit(['fetch', 'origin'], repoDir, { timeout: 30000 });
  return { ok: true };
}

export async function createBranch(projectId, name) {
  const repoDir = await ensureRepo(projectId);
  if (!name || !name.trim()) {
    throw new GitError('Nome da branch inválido.', { code: 'INVALID_INPUT' });
  }
  await execGit(['branch', name.trim()], repoDir);
  return { ok: true };
}

export async function checkout(projectId, branchName) {
  const repoDir = await ensureRepo(projectId);
  if (!branchName) throw new GitError('Nome da branch é obrigatório.', { code: 'INVALID_INPUT' });

  const { stdout: statusOut } = await execFileAsync('git', ['status', '--porcelain'], { cwd: repoDir });
  if (statusOut.trim()) {
    throw new GitError(
      'Você tem alterações não commitadas. Faça commit ou descarte antes de trocar de branch.',
      { code: 'DIRTY_WORKING_TREE' },
    );
  }

  const unmerged = await listUnmerged(repoDir);
  if (unmerged.length) {
    throw new GitError(
      'Existem conflitos de merge não resolvidos. Resolva-os antes de trocar de branch.',
      { code: 'MERGE_CONFLICT', conflictFiles: unmerged.map((f) => f.path) },
    );
  }

  let localExists = false;
  try {
    await execFileAsync('git', ['rev-parse', '--verify', branchName], { cwd: repoDir });
    localExists = true;
  } catch {}

  let remoteExists = false;
  try {
    await execFileAsync('git', ['rev-parse', '--verify', `origin/${branchName}`], { cwd: repoDir });
    remoteExists = true;
  } catch {}

  if (localExists) {
    await execGit(['checkout', branchName], repoDir);
  } else if (remoteExists) {
    await execGit(['checkout', '-b', branchName, `origin/${branchName}`], repoDir);
  } else {
    throw new GitError(`A branch '${branchName}' não existe localmente nem no remoto.`, {
      code: 'BRANCH_NOT_FOUND',
    });
  }

  return { ok: true };
}

export async function commit(projectId, message) {
  const repoDir = await ensureRepo(projectId);
  if (!message || !message.trim()) {
    throw new GitError('Mensagem do commit é obrigatória.', { code: 'INVALID_INPUT' });
  }

  await execGit(['add', '.'], repoDir);
  try {
    await execGit(['commit', '-m', message.trim()], repoDir);
  } catch (err) {
    if (err.code === 'NOTHING_TO_COMMIT') {
      return { ok: true, nothing: true };
    }
    throw err;
  }
  return { ok: true };
}

export async function push(projectId) {
  const repoDir = await ensureRepo(projectId);

  const { stdout: statusOut } = await execFileAsync('git', ['status', '--porcelain'], { cwd: repoDir });
  if (statusOut.trim()) {
    throw new GitError(
      'Existem alterações não commitadas. Faça commit antes de enviar para o remoto.',
      { code: 'DIRTY_WORKING_TREE' },
    );
  }

  const branch = getCurrentBranch(repoDir);

  try {
    const { stdout: remoteUrl } = await execFileAsync('git', ['remote', 'get-url', 'origin'], { cwd: repoDir });
    if (!remoteUrl.trim()) {
      throw new GitError('Nenhum repositório remoto configurado.', { code: 'NO_REMOTE' });
    }
  } catch (err) {
    if (err.code === 'NO_REMOTE') throw err;
    throw new GitError('Nenhum repositório remoto configurado.', { code: 'NO_REMOTE' });
  }

  await execGit(['push', '-u', 'origin', branch], repoDir, { timeout: 60000 });
  return { ok: true };
}

export async function pull(projectId) {
  const repoDir = await ensureRepo(projectId);

  const { stdout: statusOut } = await execFileAsync('git', ['status', '--porcelain'], { cwd: repoDir });
  if (statusOut.trim()) {
    throw new GitError(
      'Existem alterações não commitadas. Faça commit ou descarte antes de fazer pull.',
      { code: 'DIRTY_WORKING_TREE' },
    );
  }

  try {
    const { stdout: remoteUrl } = await execFileAsync('git', ['remote', 'get-url', 'origin'], { cwd: repoDir });
    if (!remoteUrl.trim()) {
      throw new GitError('Nenhum repositório remoto configurado.', { code: 'NO_REMOTE' });
    }
  } catch (err) {
    if (err.code === 'NO_REMOTE') throw err;
    throw new GitError('Nenhum repositório remoto configurado.', { code: 'NO_REMOTE' });
  }

  await execFileAsync('git', ['config', 'remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*'], { cwd: repoDir }).catch(() => {});
  try {
    await execGit(['fetch', 'origin'], repoDir, { timeout: 30000 });
  } catch (err) {
    if (err.code === 'SSH_AUTH_FAILED' || err.code === 'REMOTE_UNREACHABLE' || err.code === 'REPO_NOT_FOUND') {
      throw err;
    }
  }

  const branch = getCurrentBranch(repoDir);

  let branchOnRemote = false;
  try {
    const { stdout } = await execFileAsync(
      'git', ['ls-remote', '--heads', 'origin', branch], { cwd: repoDir, timeout: 10000 },
    );
    branchOnRemote = stdout.trim().length > 0;
  } catch {}

  if (!branchOnRemote) {
    throw new GitError(
      `A branch "${branch}" ainda não foi enviada para o remoto. Faça um push inicial: git push -u origin ${branch}`,
      { code: 'NO_UPSTREAM' },
    );
  }

  try {
    await execGit(['pull', '--no-rebase', 'origin', branch], repoDir, { timeout: 60000 });
  } catch (err) {
    if (err.code === 'MERGE_CONFLICT') {
      const conflictFiles = (await listUnmerged(repoDir)).map((f) => f.path);
      err.conflictFiles = conflictFiles;
    }
    throw err;
  }

  return { ok: true };
}

export async function merge(projectId, source) {
  const repoDir = await ensureRepo(projectId);
  if (!source) throw new GitError('Branch de origem é obrigatória.', { code: 'INVALID_INPUT' });

  const { stdout: statusOut } = await execFileAsync('git', ['status', '--porcelain'], { cwd: repoDir });
  if (statusOut.trim()) {
    throw new GitError(
      'Existem alterações não commitadas. Faça commit ou descarte antes de fazer merge.',
      { code: 'DIRTY_WORKING_TREE' },
    );
  }

  let resolvedSource = source;
  if (!/^(.+\/.+|[0-9a-f]{7,})$/.test(source)) {
    try {
      await execFileAsync('git', ['rev-parse', '--verify', source], { cwd: repoDir });
    } catch {
      try {
        await execFileAsync('git', ['rev-parse', '--verify', `origin/${source}`], { cwd: repoDir });
        resolvedSource = `origin/${source}`;
      } catch {
        throw new GitError(`Branch '${source}' não encontrada.`, { code: 'BRANCH_NOT_FOUND' });
      }
    }
  }

  try {
    await execGit(['merge', '--no-ff', resolvedSource], repoDir, { timeout: 60000 });
  } catch (err) {
    if (err.code === 'MERGE_CONFLICT') {
      const conflictFiles = (await listUnmerged(repoDir)).map((f) => f.path);
      err.conflictFiles = conflictFiles;
    }
    throw err;
  }

  return { ok: true };
}

function getCurrentBranch(repoDir) {
  try {
    const out = execFileSync('git', ['branch', '--show-current'], { cwd: repoDir, encoding: 'utf-8' });
    const branch = out.trim();
    if (!branch) {
      throw new GitError('Não foi possível determinar a branch atual (detached HEAD?).', { code: 'NO_BRANCH' });
    }
    return branch;
  } catch (err) {
    if (err.name === 'GitError') throw err;
    throw new GitError('Não foi possível determinar a branch atual.', { code: 'NO_BRANCH' });
  }
}

export async function getLog(projectId, { limit = 15, skip = 0 } = {}) {
  const repoDir = await ensureRepo(projectId);
  const format = '%H%x00%h%x00%an%x00%ae%x00%aI%x00%s%x00%P%x00%b%x1e';
  const args = ['log', `--pretty=format:${format}`];
  if (skip > 0) args.push(`--skip=${skip}`);
  args.push(`-n${limit}`);

  const logResult = await execFileAsync('git', args, { cwd: repoDir }).catch((err) => {
    if (/does not have any commits yet/i.test(err.stderr || '')) {
      return { stdout: '' };
    }
    throw err;
  });

  let total = 0;
  try {
    const { stdout: countOut } = await execFileAsync('git', ['rev-list', '--count', 'HEAD'], { cwd: repoDir });
    total = parseInt(countOut.trim(), 10) || 0;
  } catch {
    total = 0;
  }

  const stdout = logResult.stdout || '';
  if (!stdout.trim()) return { commits: [], total };

  const commits = stdout.split('\x1e').filter(Boolean).map((entry) => {
    const parts = entry.split('\x00');
    const [hash, shortHash, author, email, date, subject, parents, body] = parts;
    return {
      hash: (hash || '').trim(),
      shortHash: (shortHash || '').trim(),
      author: (author || '').trim(),
      email: (email || '').trim(),
      date: (date || '').trim(),
      message: (subject || '').trim(),
      body: (body || '').trim(),
      parents: (parents || '').trim().split(' ').filter(Boolean),
    };
  });

  return { commits, total };
}

export async function diffFiles(projectId) {
  const repoDir = await ensureRepo(projectId);
  const { stdout } = await execFileAsync('git', ['status', '--porcelain'], { cwd: repoDir });
  const files = [];

  for (const line of stdout.split('\n')) {
    if (!line.trim()) continue;
    const status = line.substring(0, 2);
    const filePath = line.substring(3);

    let type = 'modified';
    if (status === '??') type = 'untracked';
    else if (status.includes('A')) type = 'added';
    else if (status.includes('D')) type = 'deleted';
    else if (status.includes('R')) type = 'renamed';
    else if (status.includes('M')) type = 'modified';
    else if (status.includes('C')) type = 'copied';

    files.push({ path: filePath, type });
  }

  const unmerged = await listUnmerged(repoDir);
  for (const u of unmerged) {
    if (!files.find((f) => f.path === u.path)) {
      files.push({ path: u.path, type: 'conflicted' });
    }
  }

  return files;
}

export async function diffFile(projectId, filePath, { base = 'HEAD', head = null } = {}) {
  const repoDir = await ensureRepo(projectId);
  if (!filePath) throw new GitError('Caminho do arquivo é obrigatório.', { code: 'INVALID_INPUT' });

  const args = head ? ['diff', `${base}..${head}`, '--no-color', '--', filePath]
                    : ['diff', base, '--no-color', '--', filePath];

  try {
    const { stdout } = await execFileAsync('git', args, { cwd: repoDir });
    if (stdout.trim()) return stdout;
    return '';
  } catch {
    return '';
  }
}

export async function showCommit(projectId, sha) {
  const repoDir = await ensureRepo(projectId);
  if (!sha) throw new GitError('Hash do commit é obrigatório.', { code: 'INVALID_INPUT' });

  const { stdout } = await execGit(['show', '--no-color', '--format=', sha], repoDir);
  return stdout || '';
}

export async function discardAll(projectId) {
  const repoDir = await ensureRepo(projectId);

  const unmerged = await listUnmerged(repoDir);
  if (unmerged.length) {
    throw new GitError(
      'Existem conflitos de merge não resolvidos. Resolva antes de descartar alterações.',
      { code: 'MERGE_CONFLICT', conflictFiles: unmerged.map((f) => f.path) },
    );
  }

  await execGit(['checkout', '--', '.'], repoDir);
  await execGit(['clean', '-fd'], repoDir);

  return await getStatus(projectId);
}

export { GitError };
