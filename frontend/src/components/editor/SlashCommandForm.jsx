import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function SlashCommandForm({ open, title, children, onClose, width = 480 }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="slash-form-overlay" onClick={onClose}>
      <div
        className="slash-form"
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="slash-form-header">
          <span>{title}</span>
          <button className="icon-btn small" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>
        <div className="slash-form-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}
