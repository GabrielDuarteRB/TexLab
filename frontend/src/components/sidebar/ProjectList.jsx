import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, FolderOpen, PanelLeftClose, PanelLeft, FilePlus, FolderPlus, X, Pencil, Check, Upload } from 'lucide-react';
import useProjectStore from '../../store/useProjectStore.js';
import FileTree from './FileTree.jsx';

export default function ProjectList() {
  const { projects, fetchProjects, selectProject, createProject, deleteProject, currentProject, sidebarCollapsed, toggleSidebar, createFolder, uploadFile } =
    useProjectStore();
  const [newName, setNewName] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [creating, setCreating] = useState(null);
  const [newFileName, setNewFileName] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createProject(newName.trim());
    setNewName('');
    setShowInput(false);
  };

  const handleCreateRoot = async (type) => {
    if (!newFileName.trim()) return;
    if (type === 'file') {
      await useProjectStore.getState().saveFile(newFileName.trim(), '');
      await useProjectStore.getState().refreshFileTree();
      useProjectStore.getState().openFile(newFileName.trim());
    } else {
      await createFolder(newFileName.trim());
    }
    setNewFileName('');
    setCreating(null);
  };

  const handleRename = async (id) => {
    if (!renameValue.trim()) {
      setRenamingId(null);
      setRenameValue('');
      return;
    }
    await useProjectStore.getState().updateProject(renameValue.trim());
    setRenamingId(null);
    setRenameValue('');
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file, '');
    e.target.value = '';
  };

  if (sidebarCollapsed) {
    return (
      <aside className="sidebar collapsed">
        <button className="sidebar-toggle" onClick={toggleSidebar} title="Expandir menu">
          <PanelLeft size={18} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Projetos</h2>
        <div className="sidebar-header-actions">
          <button className="icon-btn" onClick={toggleSidebar} title="Minimizar menu">
            <PanelLeftClose size={16} />
          </button>
          <button className="icon-btn" onClick={() => setShowInput(!showInput)}>
            <Plus size={18} />
          </button>
        </div>
      </div>

      {showInput && (
        <div className="new-project-input">
          <input
            type="text"
            placeholder="Nome do projeto"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <button onClick={handleCreate}>OK</button>
        </div>
      )}

      <ul className="project-list">
        {projects.map((project) => (
          <li key={project.id} className={currentProject?.id === project.id ? 'active' : ''}>
            {renamingId === project.id ? (
              <div className="rename-input project-rename">
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(project.id);
                    if (e.key === 'Escape') { setRenamingId(null); setRenameValue(''); }
                  }}
                  autoFocus
                />
                <button className="icon-btn small" onClick={() => handleRename(project.id)}>
                  <Check size={12} />
                </button>
                <button className="icon-btn small" onClick={() => { setRenamingId(null); setRenameValue(''); }}>
                  <X size={12} />
                </button>
              </div>
            ) : (
              <>
                <button className="project-item" onClick={() => selectProject(project.id)}>
                  <FolderOpen size={16} />
                  <span>{project.name}</span>
                </button>
                <div className="file-tree-actions">
                  <button className="icon-btn small" onClick={() => { setRenamingId(project.id); setRenameValue(project.name); }} title="Renomear">
                    <Pencil size={14} />
                  </button>
                  <button className="icon-btn small" onClick={() => deleteProject(project.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {currentProject && (
        <div className="file-tree-section">
          <div className="file-tree-header">
            <h3>Arquivos</h3>
            <div className="file-tree-header-actions">
              <button className="icon-btn small" onClick={() => setCreating(creating === 'file' ? null : 'file')} title="Novo arquivo">
                <FilePlus size={14} />
              </button>
              <button className="icon-btn small" onClick={() => setCreating(creating === 'folder' ? null : 'folder')} title="Nova pasta">
                <FolderPlus size={14} />
              </button>
              <button className="icon-btn small" onClick={() => fileInputRef.current?.click()} title="Importar arquivo">
                <Upload size={14} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden-file-input"
                onChange={handleUpload}
                style={{ display: 'none' }}
              />
            </div>
          </div>
          {creating && (
            <div className="create-input root-create">
              <input
                type="text"
                placeholder={creating === 'file' ? 'arquivo.tex' : 'nova-pasta'}
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateRoot(creating);
                  if (e.key === 'Escape') { setCreating(null); setNewFileName(''); }
                }}
                autoFocus
              />
              <button onClick={() => handleCreateRoot(creating)}>
                <Plus size={12} />
              </button>
              <button onClick={() => { setCreating(null); setNewFileName(''); }}>
                <X size={12} />
              </button>
            </div>
          )}
          <FileTree files={currentProject.files} />
        </div>
      )}
    </aside>
  );
}
