import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PanelLeftClose, PanelLeft, FilePlus, FolderPlus, X, Upload, ArrowLeft } from 'lucide-react';
import useProjectStore from '../../store/useProjectStore.js';
import FileTree, { fileExistsInTree } from './FileTree.jsx';
import ConfirmModal from '../ui/ConfirmModal.jsx';
import Toast from '../ui/Toast.jsx';

export default function ProjectList() {
  const navigate = useNavigate();
  const { currentProject, sidebarCollapsed, toggleSidebar, createFolder, uploadFile } =
    useProjectStore();
  const [creating, setCreating] = useState(null);
  const [newFileName, setNewFileName] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const confirmResolveRef = useRef(null);
  const fileInputRef = useRef(null);

  const confirmAction = useCallback((message) => {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirm(message);
    });
  }, []);

  const handleConfirm = () => {
    setConfirm(null);
    confirmResolveRef.current?.(true);
    confirmResolveRef.current = null;
  };

  const handleCancelConfirm = () => {
    setConfirm(null);
    confirmResolveRef.current?.(false);
    confirmResolveRef.current = null;
  };

  const handleCreateRoot = async (type) => {
    if (!newFileName.trim()) return;
    const name = newFileName.trim();

    const project = useProjectStore.getState().currentProject;
    if (project && fileExistsInTree(project.files, name)) {
      setToast('Já existe um arquivo ou pasta com esse nome');
      return;
    }

    if (type === 'file') {
      await useProjectStore.getState().saveFile(name, '');
      await useProjectStore.getState().refreshFileTree();
      useProjectStore.getState().openFile(name);
    } else {
      await createFolder(name);
    }
    setNewFileName('');
    setCreating(null);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const project = useProjectStore.getState().currentProject;
    if (project && fileExistsInTree(project.files, file.name)) {
      const confirmed = await confirmAction(`Já existe um arquivo "${file.name}" na raiz. Deseja sobrescrever?`);
      if (!confirmed) { e.target.value = ''; return; }
    }
    await uploadFile(file, '');
    e.target.value = '';
  };

  const handleRootDrop = async (sourcePath) => {
    const itemName = sourcePath.split('/').pop();
    const project = useProjectStore.getState().currentProject;
    if (project && fileExistsInTree(project.files, itemName)) {
      const confirmed = await confirmAction('Já existe um arquivo ou pasta com esse nome na raiz. Deseja sobrescrever?');
      if (!confirmed) return;
    }
    await useProjectStore.getState().renameFile(sourcePath, itemName);
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
          <button className="icon-btn" onClick={() => navigate('/')} title="Voltar aos projetos">
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
        <FileTree files={currentProject.files} onDrop={handleRootDrop} />
      </div>
      <ConfirmModal open={!!confirm} message={confirm} onConfirm={handleConfirm} onCancel={handleCancelConfirm} />
      <Toast open={!!toast} message={toast} type="error" onClose={() => setToast(null)} />
    </aside>
  );
}
