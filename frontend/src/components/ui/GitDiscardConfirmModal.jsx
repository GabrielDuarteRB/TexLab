import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, FilePlus, FileMinus, FileEdit, X } from 'lucide-react';

const STATUS_CONFIG = {
  added: { icon: FilePlus, color: 'var(--success)', label: 'novo' },
  modified: { icon: FileEdit, color: '#e0a800', label: 'modificado' },
  deleted: { icon: FileMinus, color: 'var(--error)', label: 'deletado' },
  untracked: { icon: FilePlus, color: 'var(--text-muted)', label: 'não rastreado' },
  renamed: { icon: FileEdit, color: '#89b4fa', label: 'renomeado' },
  conflicted: { icon: AlertTriangle, color: 'var(--error)', label: 'conflito' },
};

export default function GitDiscardConfirmModal({ open, files, onConfirm, onCancel }) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter' && document.activeElement?.tagName !== 'BUTTON') {
        onConfirm();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onCancel, onConfirm]);

  useEffect(() => {
    if (open && confirmRef.current) {
      setTimeout(() => confirmRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  const tracked = (files || []).filter((f) => f.type !== 'untracked');
  const untracked = (files || []).filter((f) => f.type === 'untracked');

  return createPortal(
    <div className="confirm-modal-overlay" onClick={onCancel}>
      <div className="git-discard-modal" onClick={(e) => e.stopPropagation()}>
        <div className="git-discard-header">
          <div className="git-discard-icon">
            <AlertTriangle size={20} />
          </div>
          <h3>Descartar todas as alterações</h3>
          <button className="icon-btn small" onClick={onCancel} title="Fechar">
            <X size={14} />
          </button>
        </div>

        <div className="git-discard-body">
          <p className="git-discard-warning">
            Esta ação é <strong>destrutiva e irreversível</strong>.
          </p>
          <ul className="git-discard-effects">
            {tracked.length > 0 && (
              <li>
                <strong>{tracked.length}</strong> arquivo{tracked.length > 1 ? 's' : ''} rastreado{tracked.length > 1 ? 's' : ''} voltarão ao estado do último commit (modificações perdidas).
              </li>
            )}
            {untracked.length > 0 && (
              <li>
                <strong>{untracked.length}</strong> arquivo{untracked.length > 1 ? 's' : ''} não rastreado{untracked.length > 1 ? 's' : ''} serão <strong>permanentemente excluído{untracked.length > 1 ? 's' : ''}</strong> do disco.
              </li>
            )}
          </ul>

          {files && files.length > 0 && (
            <ul className="git-discard-file-list">
              {files.map((file) => {
                const config = STATUS_CONFIG[file.type] || STATUS_CONFIG.modified;
                const Icon = config.icon;
                return (
                  <li key={file.path} className="git-discard-file-item">
                    <span className="git-discard-file-icon" style={{ color: config.color }}>
                      <Icon size={12} />
                    </span>
                    <span className="git-discard-file-path">{file.path}</span>
                    <span className="git-discard-file-type" style={{ color: config.color }}>
                      {config.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="git-discard-equivalent">
            Equivale a <code>git checkout -- .</code> + <code>git clean -fd</code>.
          </p>
        </div>

        <div className="git-discard-footer">
          <button className="confirm-modal-btn cancel" onClick={onCancel}>
            Cancelar
          </button>
          <button
            ref={confirmRef}
            className="confirm-modal-btn danger"
            onClick={onConfirm}
          >
            <Trash2 size={14} />
            Descartar tudo
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
