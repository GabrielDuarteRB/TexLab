import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XCircle, X } from 'lucide-react';

export default function Toast({ open, message, type = 'error', onClose }) {
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="toast-container">
      <div className={`toast ${type}`}>
        <XCircle size={16} className="toast-icon" />
        <span className="toast-message">{message}</span>
        <button className="toast-close" onClick={onClose}>
          <X size={14} />
        </button>
      </div>
    </div>,
    document.body
  );
}
