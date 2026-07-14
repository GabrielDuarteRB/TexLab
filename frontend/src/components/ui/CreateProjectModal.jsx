import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowLeft, FileText, FolderInput, FileArchive, GitBranch, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useProjectStore from '../../store/useProjectStore.js';

function extractNameFromUrl(url) {
  try {
    const match = url.match(/github\.com\/[^/]+\/([^/]+)/);
    if (match) return match[1].replace(/\.git$/, '');
    const parts = url.split('/').filter(Boolean);
    return parts[parts.length - 1]?.replace(/\.git$/, '') || '';
  } catch {
    return '';
  }
}

export default function CreateProjectModal({ open, onClose }) {
  const navigate = useNavigate();
  const { createProject, importProject, cloneProject } = useProjectStore();
  const [step, setStep] = useState('choose');
  const [origin, setOrigin] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [gitUrl, setGitUrl] = useState('');
  const [keepGit, setKeepGit] = useState(true);
  const [loading, setLoading] = useState(false);
  const folderInputRef = useRef(null);
  const zipInputRef = useRef(null);
  const nameInputRef = useRef(null);
  const gitUrlInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setStep('choose');
      setOrigin(null);
      setProjectName('');
      setSelectedFiles(null);
      setSelectedCount(0);
      setGitUrl('');
      setKeepGit(false);
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (step === 'name' && nameInputRef.current) {
      nameInputRef.current.focus();
    }
    if (step === 'clone' && gitUrlInputRef.current) {
      gitUrlInputRef.current.focus();
    }
  }, [step]);

  const handleClose = () => {
    setStep('choose');
    setOrigin(null);
    setProjectName('');
    setSelectedFiles(null);
    setSelectedCount(0);
    setGitUrl('');
    setKeepGit(false);
    setLoading(false);
    onClose();
  };

  const handleChooseEmpty = () => {
    setOrigin('empty');
    setStep('name');
  };

  const handleChooseFolder = () => {
    folderInputRef.current?.click();
  };

  const handleChooseZip = () => {
    zipInputRef.current?.click();
  };

  const handleChooseGit = () => {
    setOrigin('git');
    setStep('clone');
  };

  const handleFolderSelected = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setSelectedFiles(files);
    setSelectedCount(files.length);
    setOrigin('folder');
    setStep('name');
    e.target.value = '';
  };

  const handleZipSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFiles(file);
    setSelectedCount(1);
    setOrigin('zip');
    setStep('name');
    e.target.value = '';
  };

  const handleGitUrlConfirm = () => {
    if (!gitUrl.trim()) return;
    const name = extractNameFromUrl(gitUrl.trim());
    setProjectName(name);
    setStep('name');
  };

  const handleConfirm = async () => {
    if (!projectName.trim()) return;
    setLoading(true);

    let project;
    if (origin === 'empty') {
      project = await createProject(projectName.trim());
    } else if (origin === 'git') {
      project = await cloneProject(projectName.trim(), gitUrl.trim(), keepGit);
    } else {
      const isZip = origin === 'zip';
      project = await importProject(projectName.trim(), selectedFiles, isZip);
    }

    setLoading(false);
    if (project) {
      handleClose();
      navigate(`/project/${project.id}`);
    }
  };

  const handleBack = () => {
    if (origin === 'git' && step === 'name') {
      setStep('clone');
      setProjectName('');
      return;
    }
    setStep('choose');
    setOrigin(null);
    setProjectName('');
    setSelectedFiles(null);
    setSelectedCount(0);
    setGitUrl('');
    setKeepGit(false);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) handleClose();
  };

  if (!open) return null;

  return createPortal(
    <div className="create-modal-overlay" onClick={handleBackdropClick}>
      <div className="create-modal" role="dialog" aria-modal="true" aria-label="Criar novo projeto">
        {step === 'choose' && (
          <>
            <div className="create-modal-header">
              <h2>Criar novo projeto</h2>
              <button className="icon-btn" onClick={handleClose}>
                <X size={18} />
              </button>
            </div>
            <div className="create-modal-views">
              <button className="create-option" onClick={handleChooseEmpty}>
                <div className="create-option-icon">
                  <FileText size={28} />
                </div>
                <div className="create-option-info">
                  <span className="create-option-title">Criar do zero</span>
                  <span className="create-option-desc">Comece com um projeto LaTeX em branco</span>
                </div>
              </button>
              <button className="create-option" onClick={handleChooseFolder}>
                <div className="create-option-icon">
                  <FolderInput size={28} />
                </div>
                <div className="create-option-info">
                  <span className="create-option-title">Importar pasta</span>
                  <span className="create-option-desc">Selecione uma pasta com arquivos LaTeX</span>
                </div>
              </button>
              <button className="create-option" onClick={handleChooseZip}>
                <div className="create-option-icon">
                  <FileArchive size={28} />
                </div>
                <div className="create-option-info">
                  <span className="create-option-title">Importar arquivo .zip</span>
                  <span className="create-option-desc">Importe um projeto compactado</span>
                </div>
              </button>
              <button className="create-option" onClick={handleChooseGit}>
                <div className="create-option-icon">
                  <GitBranch size={28} />
                </div>
                <div className="create-option-info">
                  <span className="create-option-title">Clonar do GitHub</span>
                  <span className="create-option-desc">Clone um repositório GitHub público ou privado</span>
                </div>
              </button>
            </div>
          </>
        )}

        {step === 'clone' && (
          <>
            <div className="create-modal-header">
              <button className="icon-btn" onClick={handleBack} title="Voltar">
                <ArrowLeft size={18} />
              </button>
              <h2>Clonar do GitHub</h2>
              <button className="icon-btn" onClick={handleClose}>
                <X size={18} />
              </button>
            </div>
            <div className="create-name-form">
              <label className="create-name-label">URL do repositório</label>
              <input
                ref={gitUrlInputRef}
                type="url"
                className="create-name-input"
                placeholder="https://github.com/usuario/repositorio"
                value={gitUrl}
                onChange={(e) => setGitUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGitUrlConfirm();
                }}
                disabled={loading}
              />
              <button
                className="create-name-submit"
                onClick={handleGitUrlConfirm}
                disabled={loading || !gitUrl.trim()}
              >
                Continuar
              </button>
            </div>
          </>
        )}

        {step === 'name' && (
          <>
            <div className="create-modal-header">
              <button className="icon-btn" onClick={handleBack} title="Voltar">
                <ArrowLeft size={18} />
              </button>
              <h2>
                {origin === 'empty' && 'Criar projeto vazio'}
                {origin === 'folder' && 'Importar pasta'}
                {origin === 'zip' && 'Importar arquivo .zip'}
                {origin === 'git' && 'Clonar do GitHub'}
              </h2>
              <button className="icon-btn" onClick={handleClose}>
                <X size={18} />
              </button>
            </div>
            <div className="create-name-form">
              {origin === 'folder' && (
                <div className="create-summary">
                  <span className="create-summary-icon">
                    <FolderInput size={16} />
                  </span>
                  <span>{`${selectedCount} arquivos selecionados`}</span>
                </div>
              )}
              {origin === 'zip' && (
                <div className="create-summary">
                  <span className="create-summary-icon">
                    <FileArchive size={16} />
                  </span>
                  <span>{`${selectedFiles?.name || 'arquivo.zip'}`}</span>
                </div>
              )}
              {origin === 'git' && (
                <div className="create-summary">
                  <span className="create-summary-icon">
                    <GitBranch size={16} />
                  </span>
                  <span className="create-summary-url">{gitUrl}</span>
                </div>
              )}
              <label className="create-name-label">Nome do projeto</label>
              <input
                ref={nameInputRef}
                type="text"
                className="create-name-input"
                placeholder="Meu projeto LaTeX"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirm();
                }}
                disabled={loading}
              />
              {origin === 'git' && (
                <label className="create-checkbox-label">
                  <input
                    type="checkbox"
                    className="create-checkbox"
                    checked={keepGit}
                    onChange={(e) => setKeepGit(e.target.checked)}
                    disabled={loading}
                  />
                  <span>Manter histórico Git (.git)</span>
                </label>
              )}
              <button
                className="create-name-submit"
                onClick={handleConfirm}
                disabled={loading || !projectName.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    Clonando...
                  </>
                ) : (
                  origin === 'git' ? 'Clonar projeto' : origin === 'empty' ? 'Criar projeto' : 'Importar projeto'
                )}
              </button>
            </div>
          </>
        )}

        <input
          ref={folderInputRef}
          type="file"
          webkitdirectory=""
          multiple
          hidden
          onChange={handleFolderSelected}
        />
        <input
          ref={zipInputRef}
          type="file"
          accept=".zip"
          hidden
          onChange={handleZipSelected}
        />
      </div>
    </div>,
    document.body
  );
}
