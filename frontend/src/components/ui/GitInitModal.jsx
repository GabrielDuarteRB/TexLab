import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Github, Loader2 } from 'lucide-react';

export default function GitInitModal({ open, onConfirm, onCancel }) {
  const [remoteUrl, setRemoteUrl] = useState('');
  const [loading, setLoading] = useState(false);
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
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm(remoteUrl || null);
    setLoading(false);
  };

  const handleSkip = async () => {
    setLoading(true);
    await onConfirm(null);
    setLoading(false);
  };

  if (!open) return null;

  return createPortal(
    <div className="confirm-modal-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-icon">
          <Github size={32} />
        </div>
        <h3 className="confirm-modal-title">Inicializar Git</h3>
        <p className="confirm-modal-message">
          URL do repositório GitHub (opcional):
        </p>
        <input
          ref={inputRef}
          type="text"
          className="git-init-input"
          placeholder="https://github.com/usuario/repo.git"
          value={remoteUrl}
          onChange={(e) => setRemoteUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleConfirm();
          }}
          disabled={loading}
        />
        <p className="confirm-modal-hint">
          Se fornecida, o remote origin será configurado automaticamente.
        </p>
        <div className="confirm-modal-actions">
          <button
            className="confirm-modal-btn cancel"
            onClick={handleSkip}
            disabled={loading}
          >
            Pular
          </button>
          <button
            className="confirm-modal-btn confirm"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? <Loader2 size={16} className="spin" /> : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
