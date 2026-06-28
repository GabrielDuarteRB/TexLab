import { create } from 'zustand';
import { api } from '../services/api.js';

const useProjectStore = create((set, get) => ({
  projects: [],
  currentProject: null,
  currentFile: null,
  fileContents: {},
  compiling: false,
  compileResult: null,
  pdfUrl: null,
  pageNumber: 1,
  pdfPageCount: 0,
  loading: false,
  error: null,
  sidebarCollapsed: false,

  fetchProjects: async () => {
    try {
      const projects = await api.listProjects();
      set({ projects });
    } catch (error) {
      set({ error: error.message });
    }
  },

  selectProject: async (id) => {
    if (!id) {
      set({ currentProject: null, currentFile: null, fileContents: {}, pdfUrl: null, compileResult: null, pageNumber: 1, pdfPageCount: 0 });
      return;
    }
    set({ loading: true, currentFile: null, fileContents: {}, pdfUrl: null, compileResult: null, pageNumber: 1, pdfPageCount: 0 });
    try {
      const project = await api.getProject(id);
      const texFile = project.files.find((f) => f.name.endsWith('.tex'));
      set({ currentProject: project, loading: false });
      if (texFile) {
        get().openFile(texFile.path);
      }
    } catch (error) {
      set({ loading: false, error: error.message });
    }
  },

  openFile: async (filePath) => {
    const { currentProject, fileContents } = get();
    if (!currentProject) return;

    if (fileContents[filePath] !== undefined) {
      set({ currentFile: filePath });
      return;
    }

    try {
      const content = await api.readFile(currentProject.id, filePath);
      set({
        currentFile: filePath,
        fileContents: { ...get().fileContents, [filePath]: content },
      });
    } catch (error) {
      set({ error: error.message });
    }
  },

  saveFile: async (filePath, content) => {
    const { currentProject } = get();
    if (!currentProject) return;

    try {
      await api.writeFile(currentProject.id, filePath, content);
      set({ fileContents: { ...get().fileContents, [filePath]: content } });
      return { success: true };
    } catch (error) {
      set({ error: error.message });
      return { success: false, error: error.message };
    }
  },

  saveAndCompile: async (filePath, content) => {
    const { currentProject } = get();
    if (!currentProject) return;

    try {
      await api.writeFile(currentProject.id, filePath, content);
      set({ fileContents: { ...get().fileContents, [filePath]: content } });

      set({ compiling: true, compileResult: null });
      const result = await api.compile(currentProject.id);
      set({
        compiling: false,
        compileResult: result,
        pdfUrl: result.success ? api.getPdfUrl(currentProject.id) : get().pdfUrl,
      });
      return { success: true };
    } catch (error) {
      set({ error: error.message, compiling: false });
      return { success: false, error: error.message };
    }
  },

  updateFileContent: (filePath, content) => {
    set({ fileContents: { ...get().fileContents, [filePath]: content } });
  },

  compile: async () => {
    const { currentProject } = get();
    if (!currentProject) return;

    set({ compiling: true, compileResult: null });
    try {
      const result = await api.compile(currentProject.id);
      set({
        compiling: false,
        compileResult: result,
        pdfUrl: result.success ? api.getPdfUrl(currentProject.id) : null,
      });
    } catch (error) {
      set({ compiling: false, compileResult: { success: false, log: error.message } });
    }
  },

  createProject: async (name) => {
    try {
      const project = await api.createProject(name);
      set({ projects: [...get().projects, project] });
      return project;
    } catch (error) {
      set({ error: error.message });
    }
  },

  deleteProject: async (id) => {
    try {
      await api.deleteProject(id);
      set({
        projects: get().projects.filter((p) => p.id !== id),
        currentProject: get().currentProject?.id === id ? null : get().currentProject,
      });
    } catch (error) {
      set({ error: error.message });
    }
  },

  updateProject: async (name) => {
    const { currentProject, projects, currentFile, fileContents } = get();
    if (!currentProject) return;
    try {
      const updated = await api.updateProject(currentProject.id, name);
      const oldId = currentProject.id;
      const newId = updated.id;

      const updatedProject = { ...currentProject, id: newId, name: updated.name };
      set({
        currentProject: updatedProject,
        projects: projects.map((p) => (p.id === oldId ? { ...p, id: newId, name: updated.name } : p)),
      });

      if (newId !== oldId) {
        await get().refreshFileTree();
      }

      return { success: true };
    } catch (error) {
      set({ error: error.message });
      return { success: false, error: error.message };
    }
  },

  setPageNumber: (page) => set({ pageNumber: page }),
  setPdfPageCount: (count) => set({ pdfPageCount: count }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  refreshFileTree: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    try {
      const project = await api.getProject(currentProject.id);
      set({ currentProject: project });
    } catch (error) {
      set({ error: error.message });
    }
  },

  createFolder: async (folderPath) => {
    const { currentProject } = get();
    if (!currentProject) return;
    try {
      const project = await api.createFolder(currentProject.id, folderPath);
      set({ currentProject: project });
      return { success: true };
    } catch (error) {
      set({ error: error.message });
      return { success: false, error: error.message };
    }
  },

  deleteFile: async (filePath) => {
    const { currentProject, currentFile } = get();
    if (!currentProject) return;
    try {
      const project = await api.deleteFile(currentProject.id, filePath);
      const updates = { currentProject: project };
      if (currentFile === filePath) {
        updates.currentFile = null;
      }
      set(updates);
      return { success: true };
    } catch (error) {
      set({ error: error.message });
      return { success: false, error: error.message };
    }
  },

  renameFile: async (oldPath, newPath) => {
    const { currentProject, currentFile, fileContents } = get();
    if (!currentProject) return;
    try {
      const project = await api.renameFile(currentProject.id, oldPath, newPath);
      const updates = { currentProject: project };
      if (currentFile === oldPath) {
        updates.currentFile = newPath;
      }
      if (fileContents[oldPath] !== undefined) {
        const newContents = { ...fileContents };
        newContents[newPath] = newContents[oldPath];
        delete newContents[oldPath];
        updates.fileContents = newContents;
      }
      set(updates);
      return { success: true };
    } catch (error) {
      set({ error: error.message });
      return { success: false, error: error.message };
    }
  },

  uploadFile: async (file, folderPath = '') => {
    const { currentProject } = get();
    if (!currentProject) return;
    try {
      const result = await api.uploadFile(currentProject.id, file, folderPath);
      set({ currentProject: result.project });
      return { success: true, filename: result.filename };
    } catch (error) {
      set({ error: error.message });
      return { success: false, error: error.message };
    }
  },

  clearError: () => set({ error: null }),
}));

export default useProjectStore;
