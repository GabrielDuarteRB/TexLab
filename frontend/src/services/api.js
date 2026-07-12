const API_URL = import.meta.env.VITE_API_URL || '/api';

async function request(url, options = {}) {
  const { signal, ...rest } = options;
  const res = await fetch(`${API_URL}${url}`, {
    headers: { 'Content-Type': 'application/json', ...rest.headers },
    ...rest,
    ...(signal ? { signal } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
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
  aiSuggest: (latexContent, instruction) =>
    request('/ai/suggest', {
      method: 'POST',
      body: JSON.stringify({ latexContent, instruction }),
    }),
  aiStatus: () => request('/ai/status'),
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
  initGit: async (projectId, remoteUrl) => {
    return request(`/projects/${projectId}/git/init`, {
      method: 'POST',
      body: JSON.stringify({ remoteUrl }),
    });
  },
  getGitStatus: (projectId) => request(`/projects/${projectId}/git/status`),
  listBranches: (projectId) => request(`/projects/${projectId}/git/branches`),
  fetchRemote: (projectId) =>
    request(`/projects/${projectId}/git/fetch`, { method: 'POST' }),
  createBranch: (projectId, name) =>
    request(`/projects/${projectId}/git/branches`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  checkoutBranch: (projectId, name, keepChanges = true) =>
    request(`/projects/${projectId}/git/checkout`, {
      method: 'POST',
      body: JSON.stringify({ name, keepChanges }),
    }),
  commitAll: (projectId, message) =>
    request(`/projects/${projectId}/git/commit`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
  pushBranch: (projectId) =>
    request(`/projects/${projectId}/git/push`, { method: 'POST' }),
  getGitDiff: (projectId) => request(`/projects/${projectId}/git/diff`),
  getGitFileDiff: (projectId, filePath) =>
    fetch(`${API_URL}/projects/${projectId}/git/diff/file?file=${encodeURIComponent(filePath)}`).then((r) => r.text()),
  resolveConflicts: (projectId, strategy) =>
    request(`/projects/${projectId}/git/resolve`, {
      method: 'POST',
      body: JSON.stringify({ strategy }),
    }),
  abortStashPop: (projectId, originalBranch) =>
    request(`/projects/${projectId}/git/abort`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ originalBranch }),
    }),
  addFile: (projectId, filepath) =>
    request(`/projects/${projectId}/git/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filepath }),
    }),
  finalizeStash: (projectId) =>
    request(`/projects/${projectId}/git/finalize-stash`, { method: 'POST' }),
};
