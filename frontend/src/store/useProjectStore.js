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

  setPageNumber: (page) => set({ pageNumber: page }),
  setPdfPageCount: (count) => set({ pdfPageCount: count }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  clearError: () => set({ error: null }),
}));

export default useProjectStore;
