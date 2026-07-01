import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, FilePlus, FileMinus, FileEdit, FileQuestion, X } from 'lucide-react';

const STATUS_CONFIG = {
  added: { icon: FilePlus, color: 'var(--success)', label: 'Adicionado' },
  modified: { icon: FileEdit, color: '#e0a800', label: 'Modificado' },
  deleted: { icon: FileMinus, color: 'var(--error)', label: 'Excluído' },
  untracked: { icon: FileQuestion, color: 'var(--text-muted)', label: 'Não rastreado' },
  renamed: { icon: FileEdit, color: '#89b4fa', label: 'Renomeado' },
};

export default function GitCheckoutWarningModal({ open, files, branchName, onConfirm, onCancel }) {
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
      <div className="git-checkout-warning-modal" onClick={(e) => e.stopPropagation()}>
        <div className="git-checkout-warning-header">
          <div className="git-checkout-warning-icon">
            <AlertTriangle size={20} />
          </div>
          <h3>Alterações não commitadas</h3>
          <button className="icon-btn small" onClick={onCancel}>
            <X size={14} />
          </button>
        </div>
        <div className="git-checkout-warning-body">
          <p className="git-checkout-warning-msg">
            Você tem alterações pendentes na branch{' '}
            <span className="git-checkout-warning-branch">"{branchName}"</span>.
            O que deseja fazer?
          </p>
          {files.length > 0 && (
            <ul className="git-checkout-warning-list">
              {files.map((file) => {
                const config = STATUS_CONFIG[file.type] || STATUS_CONFIG.modified;
                const Icon = config.icon;
                return (
                  <li key={file.path} className="git-checkout-warning-item">
                    <span className="git-checkout-warning-badge" style={{ color: config.color }}>
                      <Icon size={14} />
                    </span>
                    <span className="git-checkout-warning-filepath">{file.path}</span>
                    <span className="git-checkout-warning-type" style={{ color: config.color }}>
                      {config.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="git-checkout-warning-footer">
          <button className="confirm-modal-btn cancel" onClick={onCancel}>
            Cancelar
          </button>
          <button className="confirm-modal-btn danger" onClick={() => onConfirm(false)}>
            Zerar branch
          </button>
          <button className="confirm-modal-btn confirm" onClick={() => onConfirm(true)}>
            Manter alterações
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
