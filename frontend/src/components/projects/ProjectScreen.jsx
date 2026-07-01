import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, Trash2, Pencil, Check, X } from 'lucide-react';
import useProjectStore from '../../store/useProjectStore.js';
import CreateProjectModal from '../ui/CreateProjectModal.jsx';

export default function ProjectScreen() {
  const navigate = useNavigate();
  const { projects, fetchProjects, deleteProject, updateProject } = useProjectStore();
  const [showModal, setShowModal] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

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
        <button className="toolbar-btn primary" onClick={() => setShowModal(true)}>
          <Plus size={16} />
          Novo Projeto
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="project-screen-empty">
          <FolderOpen size={48} />
          <h2>Nenhum projeto ainda</h2>
          <p>Crie um novo projeto ou importe uma pasta/zip para começar</p>
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
                  <button className="project-card-body" onClick={() => navigate(`/project/${project.id}`)}>
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

      <CreateProjectModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
