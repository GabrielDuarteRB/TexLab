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
  gitStatus: null,
  branches: null,
  gitLog: [],
  gitLogTotal: 0,
  gitLogPage: 1,
  gitDiff: [],
  expandedFiles: {},
  fileDiffs: {},
  gitConflictFiles: [],
  editorMarkers: [],
  realtimeCheckEnabled: true,
  ltexStatus: null,
  spellChecking: false,

  setEditorMarkers: (markers) => set({ editorMarkers: markers }),
  clearEditorMarkers: () => set({ editorMarkers: [] }),
  setRealtimeCheckEnabled: (enabled) => set({ realtimeCheckEnabled: enabled }),
  setLtexStatus: (status) => set({ ltexStatus: status }),
  setSpellChecking: (checking) => set({ spellChecking: checking }),

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
    set({ loading: true, currentFile: null, fileContents: {}, pdfUrl: null, compileResult: null, pageNumber: 1, pdfPageCount: 0, gitStatus: null, branches: null, gitLog: [], gitLogTotal: 0, gitLogPage: 1, gitConflictFiles: [] });
    try {
      const project = await api.getProject(id);
      const texFiles = [];
      const findTex = (files) => {
        for (const f of files) {
          if (f.type === 'file' && f.name.endsWith('.tex')) texFiles.push(f.path);
          if (f.type === 'directory' && f.children) findTex(f.children);
        }
      };
      findTex(project.files);

      const loaded = {};
      await Promise.all(texFiles.map(async (p) => {
        try {
          loaded[p] = await api.readFile(project.id, p);
        } catch {}
      }));

      const mainTex = project.files.find((f) => f.name.endsWith('.tex'));
      set({ currentProject: project, fileContents: loaded, loading: false });
      if (mainTex) set({ currentFile: mainTex.path });
    } catch (error) {
      set({ loading: false, error: error.message });
    }
  },

  readFile: async (filePath) => {
    const { currentProject } = get();
    if (!currentProject) return '';
    try {
      return await api.readFile(currentProject.id, filePath);
    } catch {
      return '';
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

  importProject: async (name, files, isZip = false) => {
    try {
      let project;
      if (isZip) {
        project = await api.importProjectFromZip(name, files);
      } else {
        project = await api.importProjectFromFolder(name, files);
      }
      set({ projects: [...get().projects, project] });
      return project;
    } catch (error) {
      set({ error: error.message });
    }
  },

  cloneProject: async (name, url, keepGit = false) => {
    try {
      const project = await api.cloneProject(name, url, keepGit);
      set({ projects: [...get().projects, project] });
      return project;
    } catch (error) {
      set({ error: error.message });
    }
  },

  initGit: async ({ remoteUrl, userName, userEmail } = {}) => {
    const { currentProject } = get();
    if (!currentProject) return { success: false, error: 'Nenhum projeto aberto' };
    try {
      await api.initGit(currentProject.id, { remoteUrl, userName, userEmail });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message, code: error.code };
    }
  },

  getGitConfig: async () => {
    const { currentProject } = get();
    if (!currentProject) return { userName: null, userEmail: null };
    try {
      return await api.getGitConfig(currentProject.id);
    } catch {
      return { userName: null, userEmail: null };
    }
  },

  fetchGitStatus: async () => {
    const { currentProject } = get();
    if (!currentProject) return null;
    try {
      const status = await api.getGitStatus(currentProject.id);
      set({ gitStatus: status });
      return status;
    } catch {
      set({ gitStatus: null });
      return null;
    }
  },

  fetchBranches: async () => {
    const { currentProject } = get();
    if (!currentProject) return [];
    try {
      const branches = await api.listBranches(currentProject.id);
      set({ branches });
      return branches;
    } catch {
      set({ branches: [] });
      return [];
    }
  },

  fetchGitLog: async (page = 1, pageSize = 15) => {
    const { currentProject } = get();
    if (!currentProject) return { commits: [], total: 0 };
    const skip = (page - 1) * pageSize;
    try {
      const { commits, total } = await api.getGitLog(currentProject.id, { limit: pageSize, skip });
      set({ gitLog: commits, gitLogTotal: total, gitLogPage: page });
      return { commits, total };
    } catch {
      set({ gitLog: [], gitLogTotal: 0 });
      return { commits: [], total: 0 };
    }
  },

  fetchRemote: async () => {
    const { currentProject } = get();
    if (!currentProject) return { success: false, error: 'Nenhum projeto aberto' };
    try {
      await api.fetchRemote(currentProject.id);
      await get().fetchBranches();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message, code: error.code };
    }
  },

  createBranch: async (name) => {
    const { currentProject } = get();
    if (!currentProject) return { success: false, error: 'Nenhum projeto aberto' };
    try {
      const branches = await api.createBranch(currentProject.id, name);
      set({ branches });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message, code: error.code };
    }
  },

  checkoutBranch: async (name) => {
    const { currentProject, currentFile } = get();
    if (!currentProject) return { success: false, error: 'Nenhum projeto aberto' };
    try {
      set({ loading: true });
      await api.checkoutBranch(currentProject.id, name);
      const status = await api.getGitStatus(currentProject.id);
      set({ gitStatus: status, fileContents: {}, pdfUrl: null, compileResult: null, gitConflictFiles: [] });
      const branches = await api.listBranches(currentProject.id);
      set({ branches });
      await get().refreshFileTree();
      if (currentFile) {
        try {
          const content = await api.readFile(currentProject.id, currentFile);
          set({ fileContents: { [currentFile]: content }, currentFile });
        } catch {
          set({ currentFile: null });
        }
      }
      set({ loading: false });
      return { success: true };
    } catch (error) {
      set({ loading: false });
      return { success: false, error: error.message, code: error.code };
    }
  },

  commitAll: async (message) => {
    const { currentProject } = get();
    if (!currentProject) return { success: false, error: 'Nenhum projeto aberto' };
    try {
      await api.commitAll(currentProject.id, message);
      await get().fetchGitStatus();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message, code: error.code };
    }
  },

  pushBranch: async () => {
    const { currentProject } = get();
    if (!currentProject) return { success: false, error: 'Nenhum projeto aberto' };
    try {
      await api.pushBranch(currentProject.id);
      await get().fetchGitStatus();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message, code: error.code };
    }
  },

  pullBranch: async () => {
    const { currentProject } = get();
    if (!currentProject) return { success: false, error: 'Nenhum projeto aberto' };
    try {
      await api.pullBranch(currentProject.id);
      await get().fetchGitStatus();
      return { success: true };
    } catch (error) {
      const conflictFiles = error.conflictFiles || [];
      if (conflictFiles.length) {
        set({ gitConflictFiles: conflictFiles });
      }
      return { success: false, error: error.message, code: error.code, conflictFiles };
    }
  },

  mergeBranch: async (source) => {
    const { currentProject } = get();
    if (!currentProject) return { success: false, error: 'Nenhum projeto aberto' };
    try {
      await api.mergeBranch(currentProject.id, source);
      await get().fetchGitStatus();
      return { success: true };
    } catch (error) {
      const conflictFiles = error.conflictFiles || [];
      if (conflictFiles.length) {
        set({ gitConflictFiles: conflictFiles });
      }
      return { success: false, error: error.message, code: error.code, conflictFiles };
    }
  },

  fetchGitDiff: async () => {
    const { currentProject } = get();
    if (!currentProject) return [];
    try {
      const files = await api.getGitDiff(currentProject.id);
      set({ gitDiff: files, expandedFiles: {}, fileDiffs: {} });
      return files;
    } catch {
      set({ gitDiff: [], expandedFiles: {}, fileDiffs: {} });
      return [];
    }
  },

  toggleFileDiff: (filePath) => set((state) => ({
    expandedFiles: { ...state.expandedFiles, [filePath]: !state.expandedFiles[filePath] },
  })),

  fetchFileDiff: async (filePath, opts = {}) => {
    const { currentProject } = get();
    if (!currentProject) return '';
    try {
      const diff = await api.getGitFileDiff(currentProject.id, filePath, opts);
      set({ fileDiffs: { ...get().fileDiffs, [filePath]: diff } });
      return diff;
    } catch (err) {
      set({ fileDiffs: { ...get().fileDiffs, [filePath]: '' } });
      throw err;
    }
  },

  fetchCommitDiff: async (sha) => {
    const { currentProject } = get();
    if (!currentProject) throw new Error('Nenhum projeto aberto');
    return await api.getCommitDiff(currentProject.id, sha);
  },

  discardChanges: async () => {
    const { currentProject, currentFile, fileContents } = get();
    if (!currentProject) return { success: false, error: 'Nenhum projeto aberto' };
    try {
      const status = await api.discardChanges(currentProject.id);
      set({ gitStatus: status });
      await get().fetchGitDiff();
      await get().refreshFileTree();
      if (currentFile) {
        try {
          const content = await api.readFile(currentProject.id, currentFile);
          set({ fileContents: { ...fileContents, [currentFile]: content } });
        } catch {
          set({ currentFile: null });
        }
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message, code: error.code };
    }
  },

  openConflictFile: async (filePath) => {
    const { currentProject } = get();
    if (!currentProject) return;
    try {
      const content = await api.readFile(currentProject.id, filePath);
      set({
        fileContents: { ...get().fileContents, [filePath]: content },
        currentFile: filePath,
      });
    } catch {}
  },

  clearGitConflicts: () => set({ gitConflictFiles: [] }),

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
