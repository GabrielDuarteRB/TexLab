import { useState, useEffect } from 'react';
import { Plus, Trash2, FolderOpen, PanelLeftClose, PanelLeft } from 'lucide-react';
import useProjectStore from '../../store/useProjectStore.js';
import FileTree from './FileTree.jsx';

export default function ProjectList() {
  const { projects, fetchProjects, selectProject, createProject, deleteProject, currentProject, sidebarCollapsed, toggleSidebar } =
    useProjectStore();
  const [newName, setNewName] = useState('');
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createProject(newName.trim());
    setNewName('');
    setShowInput(false);
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
            <button className="project-item" onClick={() => selectProject(project.id)}>
              <FolderOpen size={16} />
              <span>{project.name}</span>
            </button>
            <button className="icon-btn small" onClick={() => deleteProject(project.id)}>
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>

      {currentProject && (
        <div className="file-tree-section">
          <h3>Arquivos</h3>
          <FileTree files={currentProject.files} />
        </div>
      )}
    </aside>
  );
}
