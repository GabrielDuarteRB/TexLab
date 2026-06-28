import { useState, useEffect } from 'react';
import { Plus, FolderOpen, Trash2, Pencil, Check, X } from 'lucide-react';
import useProjectStore from '../../store/useProjectStore.js';

export default function ProjectScreen() {
  const { projects, fetchProjects, selectProject, createProject, deleteProject, updateProject } = useProjectStore();
  const [showInput, setShowInput] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const project = await createProject(newName.trim());
    setNewName('');
    setShowInput(false);
    if (project) selectProject(project.id);
  };

  const handleRename = async (id) => {
    if (!renameValue.trim()) {
      setRenamingId(null);
      setRenameValue('');
      return;
    }
    await updateProject(renameValue.trim());
    setRenamingId(null);
    setRenameValue('');
  };

  return (
    <div className="project-screen">
      <div className="project-screen-header">
        <div className="project-screen-title">
          <h1>TexLab</h1>
          <span className="project-screen-subtitle">Editor LaTeX local</span>
        </div>
        <button className="toolbar-btn primary" onClick={() => setShowInput(true)}>
          <Plus size={16} />
          Novo Projeto
        </button>
      </div>

      {showInput && (
        <div className="project-screen-input">
          <input
            type="text"
            placeholder="Nome do projeto"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') { setShowInput(false); setNewName(''); }
            }}
            autoFocus
          />
          <button onClick={handleCreate}>Criar</button>
          <button className="icon-btn" onClick={() => { setShowInput(false); setNewName(''); }}>
            <X size={16} />
          </button>
        </div>
      )}

      {projects.length === 0 && !showInput ? (
        <div className="project-screen-empty">
          <FolderOpen size={48} />
          <h2>Nenhum projeto ainda</h2>
          <p>Crie um novo projeto para começar a editar</p>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((project) => (
            <div key={project.id} className="project-card">
              {renamingId === project.id ? (
                <div className="project-card-rename">
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
                    <Check size={14} />
                  </button>
                  <button className="icon-btn small" onClick={() => { setRenamingId(null); setRenameValue(''); }}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <button className="project-card-body" onClick={() => selectProject(project.id)}>
                    <FolderOpen size={32} />
                    <span className="project-card-name">{project.name}</span>
                  </button>
                  <div className="project-card-actions">
                    <button
                      className="icon-btn small"
                      onClick={() => { setRenamingId(project.id); setRenameValue(project.name); }}
                      title="Renomear"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="icon-btn small delete-btn"
                      onClick={() => deleteProject(project.id)}
                      title="Deletar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
