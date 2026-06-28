import { FileText, Folder, ChevronRight, ChevronDown, Plus, Trash2, X, FilePlus, FolderPlus, Pencil, Check, Upload, Image } from 'lucide-react';
import { useState, useRef } from 'react';
import useProjectStore from '../../store/useProjectStore.js';

export default function FileTree({ files, parentPath = '' }) {
  return (
    <ul className="file-tree">
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
  const fileInputRef = useRef(null);
  const { openFile, currentFile, createFolder, deleteFile, renameFile, uploadFile } = useProjectStore();

  const isImage = (filename) => {
    return /\.(png|jpg|jpeg|gif|svg|webp|bmp|tiff|pdf|eps)$/i.test(filename);
  };

  const handleCreate = async (type) => {
    if (!newName.trim()) return;
    const basePath = file.type === 'directory' ? file.path : parentPath;
    const fullPath = basePath ? `${basePath}/${newName.trim()}` : newName.trim();

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
    await uploadFile(selectedFile, file.path);
    e.target.value = '';
  };

  if (file.type === 'directory') {
    return (
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
              <button className="file-tree-item" onClick={() => setExpanded(!expanded)}>
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
        {expanded && file.children && <FileTree files={file.children} parentPath={file.path} />}
      </li>
    );
  }

  return (
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
  );
}
