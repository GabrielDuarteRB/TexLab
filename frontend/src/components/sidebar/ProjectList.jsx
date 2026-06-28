import { useState, useRef } from 'react';
import { PanelLeftClose, PanelLeft, FilePlus, FolderPlus, X, Upload, ArrowLeft } from 'lucide-react';
import useProjectStore from '../../store/useProjectStore.js';
import FileTree from './FileTree.jsx';

export default function ProjectList() {
  const { currentProject, sidebarCollapsed, toggleSidebar, createFolder, uploadFile, selectProject } =
    useProjectStore();
  const [creating, setCreating] = useState(null);
  const [newFileName, setNewFileName] = useState('');
  const fileInputRef = useRef(null);

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

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file, '');
    e.target.value = '';
  };

  if (!currentProject) return null;

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
        <div className="sidebar-header-left">
          <button className="icon-btn" onClick={() => selectProject(null)} title="Voltar aos projetos">
            <ArrowLeft size={16} />
          </button>
          <h2>Arquivos</h2>
        </div>
        <div className="sidebar-header-actions">
          <button className="icon-btn" onClick={toggleSidebar} title="Minimizar menu">
            <PanelLeftClose size={16} />
          </button>
        </div>
      </div>

      <div className="file-tree-section">
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
            onChange={handleUpload}
            style={{ display: 'none' }}
          />
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
              <X size={12} />
            </button>
            <button onClick={() => { setCreating(null); setNewFileName(''); }}>
              <X size={12} />
            </button>
          </div>
        )}
        <FileTree files={currentProject.files} />
      </div>
    </aside>
  );
}
