import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GitCommit, Loader2 } from 'lucide-react';

export default function GitCommitModal({ open, gitStatus, onConfirm, onCancel }) {
  const [message, setMessage] = useState('');
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
      setMessage('');
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!message.trim()) return;
    setLoading(true);
    await onConfirm(message.trim());
    setLoading(false);
  };

  if (!open) return null;

  return createPortal(
    <div className="confirm-modal-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-icon">
          <GitCommit size={32} />
        </div>
        <h3 className="confirm-modal-title">Commitar alterações</h3>
        {gitStatus && gitStatus.changes > 0 && (
          <p className="confirm-modal-hint">
            {gitStatus.changes} arquivo{gitStatus.changes > 1 ? 's' : ''} modificado{gitStatus.changes > 1 ? 's' : ''}
          </p>
        )}
        <input
          ref={inputRef}
          type="text"
          className="git-init-input"
          placeholder="Mensagem do commit"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && message.trim()) handleConfirm();
          }}
          disabled={loading}
        />
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
            disabled={loading || !message.trim()}
          >
            {loading ? <Loader2 size={16} className="spin" /> : 'Commitar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
