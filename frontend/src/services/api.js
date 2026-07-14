const API_URL = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor(message, { code, conflictFiles, status } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code || null;
    this.conflictFiles = conflictFiles || null;
    this.status = status || null;
  }
}

async function request(url, options = {}) {
  const { signal, ...rest } = options;
  const res = await fetch(`${API_URL}${url}`, {
    headers: { 'Content-Type': 'application/json', ...rest.headers },
    ...rest,
    ...(signal ? { signal } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(err.error || 'Request failed', {
      code: err.code,
      conflictFiles: err.conflictFiles,
      status: res.status,
    });
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  listProjects: () => request('/projects'),
  getProject: (id) => request(`/projects/${id}`),
  createProject: (name) => request('/projects', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  updateProject: (id, name) =>
    request(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),
  readFile: (projectId, filename) =>
    fetch(`${API_URL}/projects/${projectId}/files/${filename}`).then((r) => r.text()),
  writeFile: (projectId, filename, content) =>
    request(`/projects/${projectId}/files/${filename}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),
  compile: (projectId, mainFile) =>
    request(`/projects/${projectId}/compile`, {
      method: 'POST',
      body: JSON.stringify({ mainFile }),
    }),
  getPdfUrl: (projectId, file) => `${API_URL}/projects/${projectId}/pdf?file=${file || 'main.pdf'}&t=${Date.now()}`,
  getLog: (projectId) => fetch(`${API_URL}/projects/${projectId}/log`).then((r) => r.text()),
  aiReview: (text, idioma = 'pt', backend = 'auto') =>
    request('/ai/review', {
      method: 'POST',
      body: JSON.stringify({ text, idioma, backend }),
    }),
  aiAcademicStatus: () => request('/ai/academic-status'),
  aiLtexCheck: (text, languageId = 'latex', language = 'pt-BR', { signal, includeSuggestions } = {}) =>
    request('/ai/ltex-check', {
      method: 'POST',
      body: JSON.stringify({
        text, languageId, language,
        ...(includeSuggestions !== undefined ? { includeSuggestions } : {}),
      }),
      signal,
    }),
  aiLtexStatus: () => request('/ai/ltex-status'),
  aiExplainLatexError: ({ log, texContexto, linhaErro, arquivoErro }) =>
    request('/ai/explain-latex-error', {
      method: 'POST',
      body: JSON.stringify({ log, texContexto, linhaErro, arquivoErro }),
    }),
  aiLatexChat: ({ pergunta, historico, contextoDocumento, includeContext }) =>
    request('/ai/latex-chat', {
      method: 'POST',
      body: JSON.stringify({ pergunta, historico, contextoDocumento, includeContext }),
    }),
  createFolder: (projectId, folderPath) =>
    request(`/projects/${projectId}/folders`, {
      method: 'POST',
      body: JSON.stringify({ path: folderPath }),
    }),
  deleteFile: (projectId, filePath) =>
    request(`/projects/${projectId}/files/${filePath}`, { method: 'DELETE' }),
  renameFile: (projectId, oldPath, newPath) =>
    request(`/projects/${projectId}/rename`, {
      method: 'PATCH',
      body: JSON.stringify({ oldPath, newPath }),
    }),
  uploadFile: async (projectId, file, folderPath = '') => {
    const formData = new FormData();
    formData.append('file', file);
    if (folderPath) formData.append('folderPath', folderPath);
    const res = await fetch(`${API_URL}/projects/${projectId}/files`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Upload failed');
    }
    return res.json();
  },
  importProjectFromZip: async (name, zipFile) => {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('file', zipFile);
    const res = await fetch(`${API_URL}/projects/import`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Import failed');
    }
    return res.json();
  },
  importProjectFromFolder: async (name, files) => {
    const formData = new FormData();
    formData.append('name', name);
    const filePaths = files.map((file) => {
      const relative = file.webkitRelativePath || file.name;
      const parts = relative.split('/');
      parts.shift();
      return parts.join('/');
    });
    formData.append('filePaths', JSON.stringify(filePaths));
    files.forEach((file) => {
      formData.append('files', file);
    });
    const res = await fetch(`${API_URL}/projects/import`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Import failed');
    }
    return res.json();
  },
  cloneProject: async (name, url, keepGit = false) => {
    return request('/projects/clone', {
      method: 'POST',
      body: JSON.stringify({ name, url, keepGit }),
    });
  },
  initGit: async (projectId, { remoteUrl, userName, userEmail } = {}) => {
    return request(`/projects/${projectId}/git/init`, {
      method: 'POST',
      body: JSON.stringify({ remoteUrl, userName, userEmail }),
    });
  },
  getGitStatus: (projectId) => request(`/projects/${projectId}/git/status`),
  getGitConfig: (projectId) => request(`/projects/${projectId}/git/config`),
  listBranches: (projectId) => request(`/projects/${projectId}/git/branches`),
  fetchRemote: (projectId) =>
    request(`/projects/${projectId}/git/fetch`, { method: 'POST' }),
  createBranch: (projectId, name) =>
    request(`/projects/${projectId}/git/branches`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  checkoutBranch: (projectId, name) =>
    request(`/projects/${projectId}/git/checkout`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  commitAll: (projectId, message) =>
    request(`/projects/${projectId}/git/commit`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
  pushBranch: (projectId) =>
    request(`/projects/${projectId}/git/push`, { method: 'POST' }),
  pullBranch: (projectId) =>
    request(`/projects/${projectId}/git/pull`, { method: 'POST' }),
  mergeBranch: (projectId, source) =>
    request(`/projects/${projectId}/git/merge`, {
      method: 'POST',
      body: JSON.stringify({ source }),
    }),
  getGitLog: (projectId, { limit = 15, skip = 0 } = {}) =>
    request(`/projects/${projectId}/git/log?limit=${limit}&skip=${skip}`),
  getGitDiff: (projectId) => request(`/projects/${projectId}/git/diff/files`),
  getGitFileDiff: async (projectId, filePath, { base, head } = {}) => {
    const params = new URLSearchParams({ file: filePath });
    if (base) params.set('base', base);
    if (head) params.set('head', head);
    const res = await fetch(`${API_URL}/projects/${projectId}/git/diff/file?${params}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new ApiError(err.error || 'Falha ao buscar diff do arquivo', { code: err.code, status: res.status });
    }
    return res.text();
  },
  getCommitDiff: async (projectId, sha) => {
    if (!sha || typeof sha !== 'string') {
      throw new ApiError('sha inválido', { code: 'INVALID_INPUT' });
    }
    const res = await fetch(`${API_URL}/projects/${projectId}/git/diff/commit?commit=${encodeURIComponent(sha)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new ApiError(err.error || 'Falha ao buscar diff do commit', { code: err.code, status: res.status });
    }
    return res.text();
  },
  discardChanges: (projectId) =>
    request(`/projects/${projectId}/git/discard`, { method: 'POST' }),
  getImageFolders: (projectId) => request(`/projects/${projectId}/image-folders`),
  createDefaultImageFolder: (projectId) =>
    request(`/projects/${projectId}/image-folders/default`, { method: 'POST' }),
  resolveImagePath: (projectId, filePath) =>
    request(`/projects/${projectId}/image-folders/resolve`, {
      method: 'POST',
      body: JSON.stringify({ filePath }),
    }),
};
