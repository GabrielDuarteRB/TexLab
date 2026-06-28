import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmModal({ open, message, onConfirm, onCancel }) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className="confirm-modal-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-icon">
          <AlertTriangle size={32} />
        </div>
        <p className="confirm-modal-message">{message}</p>
        <div className="confirm-modal-actions">
          <button className="confirm-modal-btn cancel" onClick={onCancel}>
            Cancelar
          </button>
          <button className="confirm-modal-btn confirm" onClick={onConfirm}>
            Confirmar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
