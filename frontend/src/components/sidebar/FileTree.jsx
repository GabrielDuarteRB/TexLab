import { FileText, Folder, ChevronRight, ChevronDown, Plus, Trash2, X, FilePlus, FolderPlus, Pencil, Check, Upload, Image } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import useProjectStore from '../../store/useProjectStore.js';
import ConfirmModal from '../ui/ConfirmModal.jsx';
import Toast from '../ui/Toast.jsx';

let draggedPath = null;

export function fileExistsInTree(files, targetPath) {
  for (const f of files) {
    if (f.path === targetPath) return true;
    if (f.type === 'directory' && f.children && fileExistsInTree(f.children, targetPath)) return true;
  }
  return false;
}

export default function FileTree({ files, parentPath = '', onDrop: onRootDrop, isRoot = true }) {
  const [rootDragOver, setRootDragOver] = useState(false);

  const handleRootDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setRootDragOver(true);
  };

  const handleRootDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setRootDragOver(false);
    }
  };

  const handleRootDrop = (e) => {
    e.preventDefault();
    setRootDragOver(false);
    const sourcePath = draggedPath;
    if (!sourcePath) return;
    if (onRootDrop) {
      onRootDrop(sourcePath);
    }
  };

  return (
    <ul
      className={`file-tree${rootDragOver ? ' root-drag-over' : ''}`}
      {...(isRoot ? { onDragOver: handleRootDragOver, onDragLeave: handleRootDragLeave, onDrop: handleRootDrop } : {})}
    >
      {files.map((file) => (
        <FileNode key={file.path} file={file} parentPath={parentPath} />
      ))}
    </ul>
  );
}

function FileNode({ file, parentPath }) {
  const [expanded, setExpanded] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [creating, setCreating] = useState(null);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const confirmResolveRef = useRef(null);
  const fileInputRef = useRef(null);
  const { openFile, currentFile, createFolder, deleteFile, renameFile, uploadFile } = useProjectStore();

  useEffect(() => {
    const clearDragOver = () => setDragOver(false);
    document.addEventListener('dragend', clearDragOver);
    return () => document.removeEventListener('dragend', clearDragOver);
  }, []);

  const isImage = (filename) => {
    return /\.(png|jpg|jpeg|gif|svg|webp|bmp|tiff|pdf|eps)$/i.test(filename);
  };

  const isDescendant = (ancestorPath, targetPath) => {
    return targetPath.startsWith(ancestorPath + '/');
  };

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

  const handleDragStart = (e) => {
    draggedPath = file.path;
    e.dataTransfer.setData('text/plain', file.path);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    draggedPath = null;
    e.currentTarget.classList.remove('dragging');
    setDragOver(false);
  };

  const handleFolderDragOver = (e) => {
    if (file.type !== 'directory') return;
    e.preventDefault();
    e.stopPropagation();
    const sourcePath = draggedPath;
    if (sourcePath && sourcePath !== file.path && !isDescendant(sourcePath, file.path)) {
      e.dataTransfer.dropEffect = 'move';
      setDragOver(true);
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  };

  const handleFolderDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOver(false);
    }
  };

  const handleFolderDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (file.type !== 'directory') return;
    const sourcePath = draggedPath;
    if (!sourcePath || sourcePath === file.path || isDescendant(sourcePath, file.path)) return;
    const itemName = sourcePath.split('/').pop();
    const newPath = `${file.path}/${itemName}`;

    const project = useProjectStore.getState().currentProject;
    if (project && fileExistsInTree(project.files, newPath)) {
      const confirmed = await confirmAction('Já existe um arquivo ou pasta com esse nome nessa pasta. Deseja sobrescrever?');
      if (!confirmed) return;
    }

    await renameFile(sourcePath, newPath);
  };

  const handleCreate = async (type) => {
    if (!newName.trim()) return;
    const basePath = file.type === 'directory' ? file.path : parentPath;
    const fullPath = basePath ? `${basePath}/${newName.trim()}` : newName.trim();

    const project = useProjectStore.getState().currentProject;
    if (project && fileExistsInTree(project.files, fullPath)) {
      setToast('Já existe um arquivo ou pasta com esse nome');
      return;
    }

    if (type === 'file') {
      await useProjectStore.getState().saveFile(fullPath, '');
      await useProjectStore.getState().refreshFileTree();
      openFile(fullPath);
    } else {
      await createFolder(fullPath);
    }

    setNewName('');
    setCreating(null);
    setShowMenu(false);
  };

  const handleRename = async () => {
    if (!newName.trim() || newName.trim() === file.name) {
      setRenaming(false);
      setNewName('');
      return;
    }

    const dir = file.path.substring(0, file.path.lastIndexOf('/'));
    const newPath = dir ? `${dir}/${newName.trim()}` : newName.trim();

    const project = useProjectStore.getState().currentProject;
    if (project && fileExistsInTree(project.files, newPath)) {
      const confirmed = await confirmAction('Já existe um arquivo ou pasta com esse nome. Deseja sobrescrever?');
      if (!confirmed) {
        setRenaming(false);
        setNewName('');
        return;
      }
    }

    const result = await renameFile(file.path, newPath);
    if (result && !result.success) return;
    setRenaming(false);
    setNewName('');
  };

  const handleDelete = async () => {
    await deleteFile(file.path);
  };

  const handleUpload = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    const destPath = file.path ? `${file.path}/${selectedFile.name}` : selectedFile.name;
    const project = useProjectStore.getState().currentProject;
    if (project && fileExistsInTree(project.files, destPath)) {
      const confirmed = await confirmAction(`Já existe um arquivo "${selectedFile.name}" nessa pasta. Deseja sobrescrever?`);
      if (!confirmed) { e.target.value = ''; return; }
    }
    await uploadFile(selectedFile, file.path);
    e.target.value = '';
  };

  if (file.type === 'directory') {
    return (
      <>
      <li
        onDragOver={handleFolderDragOver}
        onDragLeave={handleFolderDragLeave}
        onDrop={handleFolderDrop}
      >
        <div className={`file-tree-item-row${dragOver ? ' drag-over' : ''}`}>
          {renaming ? (
            <div className="rename-input">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') { setRenaming(false); setNewName(''); }
                }}
                autoFocus
              />
              <button className="icon-btn small" onClick={handleRename}>
                <Check size={12} />
              </button>
              <button className="icon-btn small" onClick={() => { setRenaming(false); setNewName(''); }}>
                <X size={12} />
              </button>
            </div>
          ) : (
            <>
              <button
                className="file-tree-item"
                draggable="true"
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Folder size={14} />
                <span>{file.name}</span>
              </button>
              <div className="file-tree-actions">
                <button className="icon-btn small" onClick={() => setShowMenu(!showMenu)} title="Novo">
                  <Plus size={12} />
                </button>
                <button className="icon-btn small" onClick={() => { setRenaming(true); setNewName(file.name); }} title="Renomear">
                  <Pencil size={12} />
                </button>
                <button className="icon-btn small delete-btn" onClick={handleDelete} title="Deletar pasta">
                  <Trash2 size={12} />
                </button>
              </div>
            </>
          )}
        </div>
        {showMenu && (
          <div className="create-menu">
            <button onClick={() => { setCreating('file'); setShowMenu(false); }}>
              <FilePlus size={12} /> Novo Arquivo
            </button>
            <button onClick={() => { setCreating('folder'); setShowMenu(false); }}>
              <FolderPlus size={12} /> Nova Pasta
            </button>
            <button onClick={() => { fileInputRef.current?.click(); setShowMenu(false); }}>
              <Upload size={12} /> Importar Arquivo
            </button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleUpload}
          style={{ display: 'none' }}
        />
        {creating && (
          <div className="create-input">
            <input
              type="text"
              placeholder={creating === 'file' ? 'arquivo.tex' : 'nova-pasta'}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate(creating);
                if (e.key === 'Escape') { setCreating(null); setNewName(''); }
              }}
              autoFocus
            />
            <button onClick={() => handleCreate(creating)}>
              <Plus size={12} />
            </button>
            <button onClick={() => { setCreating(null); setNewName(''); }}>
              <X size={12} />
            </button>
          </div>
        )}
        {expanded && file.children && <FileTree files={file.children} parentPath={file.path} isRoot={false} />}
      </li>
      <ConfirmModal open={!!confirm} message={confirm} onConfirm={handleConfirm} onCancel={handleCancelConfirm} />
      <Toast open={!!toast} message={toast} type="error" onClose={() => setToast(null)} />
    </>
    );
  }

  return (
    <>
    <li>
      <div className="file-tree-item-row">
        {renaming ? (
          <div className="rename-input">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') { setRenaming(false); setNewName(''); }
              }}
              autoFocus
            />
            <button className="icon-btn small" onClick={handleRename}>
              <Check size={12} />
            </button>
            <button className="icon-btn small" onClick={() => { setRenaming(false); setNewName(''); }}>
              <X size={12} />
            </button>
          </div>
        ) : (
          <>
            <button
              className={`file-tree-item file ${currentFile === file.path ? 'active' : ''}`}
              draggable="true"
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onClick={() => openFile(file.path)}
            >
              {isImage(file.name) ? <Image size={14} /> : <FileText size={14} />}
              <span>{file.name}</span>
            </button>
            <div className="file-tree-actions">
              <button className="icon-btn small" onClick={() => { setRenaming(true); setNewName(file.name); }} title="Renomear">
                <Pencil size={12} />
              </button>
              <button className="icon-btn small delete-btn" onClick={handleDelete} title="Deletar arquivo">
                <Trash2 size={12} />
              </button>
            </div>
          </>
        )}
      </div>
    </li>
    <ConfirmModal open={!!confirm} message={confirm} onConfirm={handleConfirm} onCancel={handleCancelConfirm} />
    <Toast open={!!toast} message={toast} type="error" onClose={() => setToast(null)} />
    </>
  );
}
