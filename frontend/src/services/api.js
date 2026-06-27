const API_URL = import.meta.env.VITE_API_URL || '/api';

async function request(url, options = {}) {
  const res = await fetch(`${API_URL}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
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
};
