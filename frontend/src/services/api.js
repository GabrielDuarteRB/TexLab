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
};
