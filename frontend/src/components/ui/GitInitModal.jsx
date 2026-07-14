import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Github, Loader2 } from 'lucide-react';
import useProjectStore from '../../store/useProjectStore.js';

export default function GitInitModal({ open, onConfirm, onCancel }) {
  const getGitConfig = useProjectStore((s) => s.getGitConfig);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  useEffect(() => {
    if (open) {
      setRemoteUrl('');
      setUserName('');
      setUserEmail('');
      setError(null);
      setLoading(false);
      getGitConfig().then((cfg) => {
        if (cfg.userName) setUserName(cfg.userName);
        if (cfg.userEmail) setUserEmail(cfg.userEmail);
      });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, getGitConfig]);

  const handleConfirm = async () => {
    setError(null);
    setLoading(true);
    const result = await onConfirm({
      remoteUrl: remoteUrl.trim() || null,
      userName: userName.trim() || null,
      userEmail: userEmail.trim() || null,
    });
    setLoading(false);
    if (result && !result.success) {
      setError(result.error || 'Erro ao inicializar Git');
    }
  };

  if (!open) return null;

  return (
    createPortal(
      <div className="confirm-modal-overlay" onClick={onCancel}>
        <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
          <div className="confirm-modal-icon">
            <Github size={32} />
          </div>
          <h3 className="confirm-modal-title">Inicializar Git</h3>
          <p className="confirm-modal-message">
            Configure o repositório Git do projeto.
          </p>

          <label className="git-init-label">Repositório remoto (opcional)</label>
          <input
            ref={inputRef}
            type="text"
            className="git-init-input"
            placeholder="git@github.com:usuario/repo.git"
            value={remoteUrl}
            onChange={(e) => setRemoteUrl(e.target.value)}
            disabled={loading}
          />
          <p className="confirm-modal-hint">
            Use uma URL SSH. O arquivo <code>.gitignore</code> LaTeX será criado automaticamente.
          </p>

          <label className="git-init-label">Seu nome (autor dos commits)</label>
          <input
            type="text"
            className="git-init-input"
            placeholder="Seu nome"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            disabled={loading}
          />

          <label className="git-init-label">Seu e-mail</label>
          <input
            type="email"
            className="git-init-input"
            placeholder="seu@email.com"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            disabled={loading}
          />
          <p className="confirm-modal-hint">
            Se preenchidos, serão gravados como <code>user.name</code> e <code>user.email</code> do repositório.
          </p>

          {error && <div className="git-init-error">{error}</div>}

          <div className="confirm-modal-actions">
            <button
              className="confirm-modal-btn cancel"
              onClick={onCancel}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              className="confirm-modal-btn confirm"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? <Loader2 size={16} className="spin" /> : 'Inicializar'}
            </button>
          </div>
        </div>
      </div>,
      document.body,
    )
  );
}
